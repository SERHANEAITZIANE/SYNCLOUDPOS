"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { withCache } from "@/lib/redis"
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, differenceInDays } from "date-fns"
import { serializeData } from "@/lib/serialize"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardData {
    // ── KPIs ──
    totalRevenue: number
    posRevenue: number
    invoiceRevenue: number
    totalExpenses: number
    totalPurchases: number
    cashCollected: number
    totalCOGS: number
    netProfit: number
    ordersCount: number
    salesCount: number
    outstandingDebt: number

    // ── Comparisons (previous period) ──
    prevRevenue: number
    prevProfit: number
    prevExpenses: number
    prevPurchases: number
    prevOrdersCount: number

    // ── Charts ──
    revenueOverTime: { date: string; revenue: number; expenses: number }[]
    topProducts: { name: string; quantity: number; revenue: number }[]
    categoryRevenue: { name: string; revenue: number }[]

    // ── Tables / Lists ──
    topCustomers: { name: string; spent: number }[]
    debtors: { id: string; name: string; balance: number }[]
    lowStock: { id: string; name: string; stock: number; minStock: number }[]

    // ── Treasury ──
    treasuryAccounts: { id: string; name: string; type: string; balance: number }[]
    treasuryTotal: number

    // ── Alerts ──
    outOfStockCount: number
    lowStockCount: number
    pendingChequesCount: number
    pendingChequesAmount: number
    overdueInvoicesCount: number
    overdueInvoicesAmount: number
    dailyCloseYesterday: boolean

    // ── Activity Feed ──
    activityFeed: {
        type: "sale" | "purchase" | "payment" | "stock_alert" | "expense"
        time: string
        description: string
        amount: number
        status?: string
        color: string
    }[]

    // ── Meta ──
    userName: string
    companyName: string
    storeName: string
}

// ─── Main Query ──────────────────────────────────────────────────────────────

export async function getDashboardData(dateRange?: { from: string; to: string }): Promise<DashboardData> {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId
        const defaultStoreId = session.user.defaultStoreId

        // ── Parse date range ──
        let fromDate: Date
        let toDate: Date

        const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime())

        try {
            if (dateRange?.to) {
                const parts = dateRange.to.split(/[T -]/)
                toDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999)
                if (!isValidDate(toDate)) toDate = endOfDay(new Date())
            } else {
                toDate = endOfDay(new Date())
            }
        } catch {
            toDate = endOfDay(new Date())
        }

        try {
            if (dateRange?.from) {
                const parts = dateRange.from.split(/[T -]/)
                fromDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0)
                if (!isValidDate(fromDate)) fromDate = startOfDay(new Date())
            } else {
                fromDate = startOfDay(new Date())
            }
        } catch {
            fromDate = startOfDay(new Date())
        }

        const storeIdToUse = defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id

        // ── Previous period (same duration, shifted back) ──
        const periodDays = Math.max(differenceInDays(toDate, fromDate), 1)
        const prevTo = new Date(fromDate.getTime() - 1) // 1ms before current period start
        const prevFrom = startOfDay(subDays(fromDate, periodDays))

        const dateKey = `${format(fromDate, 'yyyyMMdd')}-${format(toDate, 'yyyyMMdd')}`
        const cacheKey = `dashboard-v2:${tenantId}:${storeIdToUse}:${dateKey}`

        const result = await withCache(cacheKey, async () => {

            // ═══════════════════════════════════════════════════════════════════
            // WAVE 1: All independent queries in parallel
            // ═══════════════════════════════════════════════════════════════════

            const storeFilter = storeIdToUse ? { storeId: storeIdToUse } : {}
            const dateFilter = { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            const prevDateFilter = { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) }

            const [
                // Current period aggregates
                posAgg, salesAgg, expensesAgg, purchasesAgg,
                // Previous period aggregates
                prevPosAgg, prevSalesAgg, prevExpensesAgg, prevPurchasesAgg,
                // COGS items
                posItemsSum, salesItemsSum,
                // Debtors
                debtorsAgg, topDebtors,
                // Low stock
                lowStockProducts,
                // Recent activity
                recentOrders, recentSalesOrders, recentPurchases, recentPayments,
                // Chart data
                ordersForChart, salesForChart, expensesForChart,
                // Top customers
                topCustomersData,
                // Treasury
                treasuryAccounts,
                // Alerts
                pendingCheques, overdueInvoices, dailyCloseCheck,
                // Out of stock
                outOfStockProducts,
                // Tenant + store info
                tenantInfo, storeInfo,
            ] = await Promise.all([
                // 1-4: Current period
                db.order.aggregate({
                    where: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: dateFilter },
                    _sum: { total: true, paidAmount: true },
                    _count: { id: true }
                }),
                db.salesOrder.aggregate({
                    where: { tenantId, ...storeFilter, status: "PAID", createdAt: dateFilter },
                    _sum: { total: true },
                    _count: { id: true }
                }),
                db.expense.aggregate({
                    where: { tenantId, date: dateFilter },
                    _sum: { amount: true }
                }),
                db.purchaseOrder.aggregate({
                    where: { tenantId, ...storeFilter, status: { in: ["COMPLETED", "PAID", "DELIVERED", "PENDING"] }, createdAt: dateFilter },
                    _sum: { total: true }
                }),

                // 5-8: Previous period (same queries, different dates)
                db.order.aggregate({
                    where: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: prevDateFilter },
                    _sum: { total: true, paidAmount: true },
                    _count: { id: true }
                }),
                db.salesOrder.aggregate({
                    where: { tenantId, ...storeFilter, status: "PAID", createdAt: prevDateFilter },
                    _sum: { total: true },
                    _count: { id: true }
                }),
                db.expense.aggregate({
                    where: { tenantId, date: prevDateFilter },
                    _sum: { amount: true }
                }),
                db.purchaseOrder.aggregate({
                    where: { tenantId, ...storeFilter, status: { in: ["COMPLETED", "PAID", "DELIVERED", "PENDING"] }, createdAt: prevDateFilter },
                    _sum: { total: true }
                }),

                // 9-10: COGS items
                db.orderItem.groupBy({
                    by: ['productId'],
                    where: { order: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: dateFilter } },
                    _sum: { quantity: true }
                }),
                db.salesOrderItem.groupBy({
                    by: ['productId'],
                    where: { salesOrder: { tenantId, ...storeFilter, status: "PAID", createdAt: dateFilter } },
                    _sum: { quantity: true }
                }),

                // 11-12: Debtors (not date-filtered)
                db.customer.aggregate({
                    where: { tenantId, balance: { gt: 0 } },
                    _sum: { balance: true }
                }),
                db.customer.findMany({
                    where: { tenantId, balance: { gt: 0 } },
                    select: { id: true, name: true, balance: true },
                    orderBy: { balance: 'desc' },
                    take: 5
                }),

                // 13: Low stock
                db.product.findMany({
                    where: {
                        tenantId, isArchived: false,
                        ...(storeIdToUse ? { storeProducts: { some: { storeId: storeIdToUse, stock: { lte: 10 } } } } : {})
                    },
                    include: storeIdToUse ? { storeProducts: { where: { storeId: storeIdToUse } } } : { storeProducts: true },
                    take: 50
                }),

                // 14-17: Activity feed sources
                db.order.findMany({
                    where: { tenantId, ...storeFilter, status: "COMPLETED" },
                    include: { customer: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }),
                db.salesOrder.findMany({
                    where: { tenantId, ...storeFilter, status: "PAID" },
                    include: { customer: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }),
                db.purchaseOrder.findMany({
                    where: { tenantId, ...storeFilter },
                    include: { supplier: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                db.treasuryTransaction.findMany({
                    where: { tenantId, type: "CREDIT", source: { in: ["PAYMENT", "CUSTOMER_PAYMENT"] } },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),

                // 18-20: Chart data
                db.order.findMany({
                    where: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: dateFilter },
                    select: { createdAt: true, total: true }
                }),
                db.salesOrder.findMany({
                    where: { tenantId, ...storeFilter, status: "PAID", createdAt: dateFilter },
                    select: { createdAt: true, total: true }
                }),
                db.expense.groupBy({
                    by: ['date'],
                    where: { tenantId, date: dateFilter },
                    _sum: { amount: true }
                }),

                // 21: Top customers
                db.order.groupBy({
                    by: ['customerId'],
                    where: { tenantId, ...storeFilter, status: "COMPLETED", customerId: { not: null }, createdAt: dateFilter },
                    _sum: { total: true },
                    orderBy: { _sum: { total: 'desc' } },
                    take: 5
                }),

                // 22: Treasury accounts
                db.treasuryAccount.findMany({
                    where: { tenantId },
                    select: { id: true, name: true, type: true, balance: true },
                    orderBy: { name: 'asc' }
                }),

                // 23: Pending cheques
                db.cheque.aggregate({
                    where: { tenantId, status: "PENDING", type: "RECEIVED" },
                    _count: { id: true },
                    _sum: { amount: true }
                }),

                // 24: Overdue invoices (sales orders unpaid for > 7 days)
                db.salesOrder.aggregate({
                    where: {
                        tenantId, ...storeFilter,
                        paymentStatus: "PENDING",
                        createdAt: { lt: subDays(new Date(), 7) }
                    },
                    _count: { id: true },
                    _sum: { total: true }
                }),

                // 25: Daily close yesterday
                db.dailyClose.findFirst({
                    where: {
                        tenantId,
                        ...(storeIdToUse ? { storeId: storeIdToUse } : {}),
                        date: { gte: startOfDay(subDays(new Date(), 1)), lte: endOfDay(subDays(new Date(), 1)) }
                    }
                }),

                // 26: Out of stock (stock = 0)
                db.product.findMany({
                    where: {
                        tenantId, isArchived: false,
                        ...(storeIdToUse ? { storeProducts: { some: { storeId: storeIdToUse, stock: { lte: 0 } } } } : {})
                    },
                    select: { id: true },
                    take: 200
                }),

                // 27-28: Meta info
                db.tenant.findUnique({
                    where: { id: tenantId },
                    select: { name: true }
                }),
                storeIdToUse ? db.store.findUnique({
                    where: { id: storeIdToUse },
                    select: { name: true }
                }) : null,
            ])

            // ═══════════════════════════════════════════════════════════════════
            // COMPUTE METRICS
            // ═══════════════════════════════════════════════════════════════════

            const posRevenue = Number(posAgg._sum.total || 0)
            const invoiceRevenue = Number(salesAgg._sum.total || 0)
            const totalRevenue = posRevenue + invoiceRevenue

            const posCash = Number(posAgg._sum.paidAmount || 0)
            const invoiceCash = Number(salesAgg._sum.total || 0)
            const cashCollected = posCash + invoiceCash

            const totalExpenses = Number(expensesAgg._sum.amount || 0)
            const totalPurchases = Number(purchasesAgg._sum.total || 0)
            const ordersCount = posAgg._count.id
            const salesCount = salesAgg._count.id

            // Previous period
            const prevRevenue = Number(prevPosAgg._sum.total || 0) + Number(prevSalesAgg._sum.total || 0)
            const prevExpenses = Number(prevExpensesAgg._sum.amount || 0)
            const prevPurchases = Number(prevPurchasesAgg._sum.total || 0)
            const prevOrdersCount = prevPosAgg._count.id + prevSalesAgg._count.id

            // ── COGS ──
            const productIds = Array.from(new Set([
                ...posItemsSum.map(i => i.productId),
                ...salesItemsSum.map(i => i.productId)
            ]))

            const productsCost = productIds.length > 0
                ? await db.product.findMany({
                    where: { id: { in: productIds } },
                    select: { id: true, cost: true }
                })
                : []

            const costMap = new Map(productsCost.map(p => [p.id, Number(p.cost || 0)]))

            let totalCOGS = 0
            posItemsSum.forEach(i => totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0))
            salesItemsSum.forEach(i => totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0))

            const netProfit = totalRevenue - totalExpenses - totalCOGS

            // Previous period COGS (approximate using same cost map for speed)
            const prevPosItemsSum = await db.orderItem.groupBy({
                by: ['productId'],
                where: { order: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: prevDateFilter } },
                _sum: { quantity: true }
            })
            let prevCOGS = 0
            prevPosItemsSum.forEach(i => prevCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0))
            const prevProfit = prevRevenue - prevExpenses - prevCOGS

            // ── Debtors ──
            const outstandingDebt = Math.abs(Number(debtorsAgg._sum.balance || 0))
            const formattedDebtors = topDebtors.map(c => ({
                id: c.id,
                name: c.name,
                balance: Math.abs(Number(c.balance))
            }))

            // ── Low Stock ──
            const lowStock = lowStockProducts
                .map(p => {
                    const stock = p.storeProducts.reduce((sum: number, sp: any) => sum + sp.stock, 0)
                    const minStock = p.storeProducts.reduce((sum: number, sp: any) => sum + sp.minStock, 0)
                    return { id: p.id, name: p.name, stock, minStock }
                })
                .filter(p => p.stock <= p.minStock)
                .sort((a, b) => a.stock - b.stock)
                .slice(0, 8)

            // ── Revenue Over Time ──
            const revenueMap = new Map<string, { revenue: number; expenses: number }>()
            const days = eachDayOfInterval({ start: fromDate, end: toDate })
            days.forEach(day => {
                revenueMap.set(format(day, "dd/MM"), { revenue: 0, expenses: 0 })
            })

            ordersForChart.forEach(o => {
                const dateStr = format(o.createdAt, "dd/MM")
                if (revenueMap.has(dateStr)) {
                    revenueMap.get(dateStr)!.revenue += Number(o.total || 0)
                }
            })
            salesForChart.forEach(o => {
                const dateStr = format(o.createdAt, "dd/MM")
                if (revenueMap.has(dateStr)) {
                    revenueMap.get(dateStr)!.revenue += Number(o.total || 0)
                }
            })
            expensesForChart.forEach(e => {
                const dateStr = format(e.date, "dd/MM")
                if (revenueMap.has(dateStr)) {
                    revenueMap.get(dateStr)!.expenses += Number(e._sum.amount || 0)
                }
            })

            const revenueOverTime = Array.from(revenueMap.entries())
                .map(([date, vals]) => ({ date, ...vals }))

            // ── Top Customers ──
            const customerIds = topCustomersData.map(tc => tc.customerId).filter(Boolean) as string[]
            const topCustomersDetails = customerIds.length > 0
                ? await db.customer.findMany({
                    where: { id: { in: customerIds } },
                    select: { id: true, name: true }
                })
                : []
            const customerNameMap = new Map(topCustomersDetails.map(c => [c.id, c.name]))
            const topCustomers = topCustomersData.map(tc => ({
                name: customerNameMap.get(tc.customerId as string) || "Inconnu",
                spent: Number(tc._sum.total || 0)
            }))

            // ── Top Products (by revenue, not count) ──
            const topProductsData = await db.orderItem.groupBy({
                by: ['productId'],
                where: { order: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: dateFilter } },
                _sum: { quantity: true, price: true },
                orderBy: { _sum: { price: 'desc' } },
                take: 8
            })

            const topProductIds = topProductsData.map(tp => tp.productId)
            const topProductNames = topProductIds.length > 0
                ? await db.product.findMany({
                    where: { id: { in: topProductIds } },
                    select: { id: true, name: true }
                })
                : []
            const productNameMap = new Map(topProductNames.map(p => [p.id, p.name]))
            const topProducts = topProductsData.map(tp => ({
                name: productNameMap.get(tp.productId) || "Inconnu",
                quantity: tp._sum.quantity || 0,
                revenue: Number(tp._sum.price || 0),
            }))

            // ── Category Revenue (REAL revenue, not product count) ──
            const catRevenueData = await db.orderItem.groupBy({
                by: ['productId'],
                where: { order: { tenantId, ...storeFilter, status: "COMPLETED", createdAt: dateFilter } },
                _sum: { price: true }
            })

            const catProductIds = catRevenueData.map(c => c.productId)
            const catProducts = catProductIds.length > 0
                ? await db.product.findMany({
                    where: { id: { in: catProductIds } },
                    select: { id: true, categoryId: true, category: { select: { name: true } } }
                })
                : []

            const catProductMap = new Map(catProducts.map(p => [p.id, p.category?.name || "Sans catégorie"]))
            const catRevMap = new Map<string, number>()

            catRevenueData.forEach(cr => {
                const catName = catProductMap.get(cr.productId) || "Sans catégorie"
                catRevMap.set(catName, (catRevMap.get(catName) || 0) + Number(cr._sum.price || 0))
            })

            const categoryRevenue = Array.from(catRevMap.entries())
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 6)

            // ── Treasury ──
            const formattedTreasury = treasuryAccounts.map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                balance: Number(a.balance)
            }))
            const treasuryTotal = formattedTreasury.reduce((sum, a) => sum + a.balance, 0)

            // ── Alerts ──
            const lowStockCount = lowStock.filter(p => p.stock > 0).length
            const outOfStockCount = outOfStockProducts.length

            // ── Activity Feed ──
            const feed: DashboardData['activityFeed'] = []

            recentOrders.forEach(o => {
                feed.push({
                    type: "sale",
                    time: format(o.createdAt, "HH:mm"),
                    description: `Vente POS — ${o.customer?.name || "Client de passage"}`,
                    amount: Number(o.total),
                    status: "completed",
                    color: "emerald"
                })
            })

            recentSalesOrders.forEach(o => {
                feed.push({
                    type: "sale",
                    time: format(o.createdAt, "HH:mm"),
                    description: `BL ${o.receiptNumber || ""} — ${o.customer?.name || "Client"}`,
                    amount: Number(o.total),
                    status: "paid",
                    color: "blue"
                })
            })

            recentPurchases.forEach(o => {
                feed.push({
                    type: "purchase",
                    time: format(o.createdAt, "HH:mm"),
                    description: `Achat ${o.purchaseNumber || ""} — ${o.supplier?.name || "Fournisseur"}`,
                    amount: Number(o.total),
                    status: o.status,
                    color: "purple"
                })
            })

            recentPayments.forEach(t => {
                feed.push({
                    type: "payment",
                    time: format(t.createdAt, "HH:mm"),
                    description: t.description || "Paiement reçu",
                    amount: Number(t.amount),
                    color: "green"
                })
            })

            // Sort feed by time descending, take top 10
            feed.sort((a, b) => b.time.localeCompare(a.time))
            const activityFeed = feed.slice(0, 10)

            return serializeData(({
                totalRevenue, posRevenue, invoiceRevenue,
                totalExpenses, totalPurchases, cashCollected,
                totalCOGS, netProfit, ordersCount, salesCount,
                outstandingDebt,
                prevRevenue, prevProfit, prevExpenses, prevPurchases, prevOrdersCount,
                revenueOverTime, topProducts, categoryRevenue,
                topCustomers, debtors: formattedDebtors, lowStock,
                treasuryAccounts: formattedTreasury, treasuryTotal,
                outOfStockCount, lowStockCount,
                pendingChequesCount: pendingCheques._count.id,
                pendingChequesAmount: Number(pendingCheques._sum.amount || 0),
                overdueInvoicesCount: overdueInvoices._count.id,
                overdueInvoicesAmount: Number(overdueInvoices._sum.total || 0),
                dailyCloseYesterday: !!dailyCloseCheck,
                activityFeed,
                userName: session.user.name || "Utilisateur",
                companyName: tenantInfo?.name || "SYNCLOUDPOS",
                storeName: storeInfo?.name || "",
            }))
        }, 30)

        return result

    } catch (error) {
        console.error("[GET_DASHBOARD]", error)
        // Return safe defaults
        return {
            totalRevenue: 0, posRevenue: 0, invoiceRevenue: 0,
            totalExpenses: 0, totalPurchases: 0, cashCollected: 0,
            totalCOGS: 0, netProfit: 0, ordersCount: 0, salesCount: 0,
            outstandingDebt: 0,
            prevRevenue: 0, prevProfit: 0, prevExpenses: 0, prevPurchases: 0, prevOrdersCount: 0,
            revenueOverTime: [], topProducts: [], categoryRevenue: [],
            topCustomers: [], debtors: [], lowStock: [],
            treasuryAccounts: [], treasuryTotal: 0,
            outOfStockCount: 0, lowStockCount: 0,
            pendingChequesCount: 0, pendingChequesAmount: 0,
            overdueInvoicesCount: 0, overdueInvoicesAmount: 0,
            dailyCloseYesterday: true,
            activityFeed: [],
            userName: "Utilisateur", companyName: "SYNCLOUDPOS", storeName: "",
        }
    }
}
