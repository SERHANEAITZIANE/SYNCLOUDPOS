"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfDay, endOfDay, differenceInDays, eachDayOfInterval, format, subDays } from "date-fns"
import { ClientType } from "@prisma/client"

interface ProfitFilters {
    from?: Date
    to?: Date
    clientType?: string
    categoryId?: string
    brandId?: string
    saleNumber?: string
}

async function getPeriodData(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    filters: Omit<ProfitFilters, "from" | "to">
) {
    const { clientType, categoryId, brandId, saleNumber } = filters

    // 1. Build Query Conditions for Items
    const orderItemWhere: any = {
        order: {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
        }
    }

    if (clientType && clientType !== "ALL") {
        if (clientType === "RETAIL") {
            orderItemWhere.order.OR = [
                { customerId: null },
                { customer: { clientType: ClientType.RETAIL } }
            ]
        } else {
            orderItemWhere.order.customer = { clientType: clientType as ClientType }
        }
    }

    const salesOrderItemWhere: any = {
        salesOrder: {
            tenantId,
            status: "PAID",
            createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
        }
    }

    if (clientType && clientType !== "ALL") {
        salesOrderItemWhere.salesOrder.customer = { clientType: clientType as ClientType }
    }

    if (categoryId) {
        orderItemWhere.product = { categoryId }
        salesOrderItemWhere.product = { categoryId }
    }

    if (brandId) {
        orderItemWhere.product = { ...orderItemWhere.product, brandId }
        salesOrderItemWhere.product = { ...salesOrderItemWhere.product, brandId }
    }

    // 2. Fetch POS items, B2B Invoice items, and Product Returns in parallel
    const [posItemsRaw, salesItemsRaw, returnsRaw, expenses] = await Promise.all([
        db.orderItem.findMany({
            where: orderItemWhere,
            include: {
                order: {
                    include: {
                        customer: { select: { name: true, clientType: true } }
                    }
                },
                product: {
                    select: {
                        id: true, name: true, cost: true, categoryId: true, brandId: true,
                        category: { select: { id: true, name: true } },
                        brand: { select: { id: true, name: true } }
                    }
                }
            }
        }),
        db.salesOrderItem.findMany({
            where: salesOrderItemWhere,
            include: {
                salesOrder: {
                    include: {
                        customer: { select: { name: true, clientType: true } }
                    }
                },
                product: {
                    select: {
                        id: true, name: true, cost: true, categoryId: true, brandId: true,
                        category: { select: { id: true, name: true } },
                        brand: { select: { id: true, name: true } }
                    }
                }
            }
        }),
        db.productReturn.findMany({
            where: {
                tenantId,
                status: "COMPLETED",
                createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            include: {
                product: {
                    select: {
                        id: true, name: true, cost: true, categoryId: true, brandId: true,
                        category: { select: { id: true, name: true } },
                        brand: { select: { id: true, name: true } }
                    }
                },
                customer: { select: { name: true, clientType: true } },
                salesOrder: { select: { receiptNumber: true } }
            }
        }),
        db.expense.findMany({
            where: {
                tenantId,
                date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            include: {
                category: { select: { id: true, name: true } }
            }
        })
    ])

    let posItems = posItemsRaw
    let salesItems = salesItemsRaw
    let returns = returnsRaw

    // 3. Apply Sale Number & Filters In-Memory
    if (saleNumber) {
        const cleanSaleNo = saleNumber.trim().toLowerCase()
        posItems = posItems.filter(item => {
            const posId = `POS-${item.order.id.slice(-6).toUpperCase()}`.toLowerCase()
            return posId.includes(cleanSaleNo) || item.order.id.toLowerCase().includes(cleanSaleNo)
        })
        salesItems = salesItems.filter(item => {
            const receiptNo = (item.salesOrder.receiptNumber || "").toLowerCase()
            return receiptNo.includes(cleanSaleNo) || item.salesOrder.id.toLowerCase().includes(cleanSaleNo)
        })
        returns = returns.filter(r => {
            const receiptNo = (r.salesOrder?.receiptNumber || "").toLowerCase()
            const retId = `RET-${r.id.slice(-6).toUpperCase()}`.toLowerCase()
            return receiptNo.includes(cleanSaleNo) || r.id.toLowerCase().includes(cleanSaleNo) || retId.includes(cleanSaleNo)
        })
    }

    // Apply Product Category/Brand Filters to Returns in-memory
    if (clientType && clientType !== "ALL") {
        returns = returns.filter(r => r.customer?.clientType === clientType)
    }
    if (categoryId) {
        returns = returns.filter(r => r.product?.categoryId === categoryId)
    }
    if (brandId) {
        returns = returns.filter(r => r.product?.brandId === brandId)
    }

    // 4. Aggregate metrics by Product (Subtracting Returns)
    const productMap = new Map<string, {
        name: string
        category: string
        brand: string
        qtySold: number
        revenue: number
        cost: number
    }>()

    const processItem = (item: any, isSalesOrder = false) => {
        if (!item.product) return
        const pid = item.product.id
        const existing = productMap.get(pid) || {
            name: item.product.name,
            category: item.product.category?.name || "Sans catégorie",
            brand: item.product.brand?.name || "Sans marque",
            qtySold: 0,
            revenue: 0,
            cost: 0
        }

        const price = isSalesOrder ? Number(item.unitPrice) : Number(item.price)
        existing.qtySold += item.quantity
        existing.revenue += price * item.quantity
        existing.cost += Number(item.product.cost || 0) * item.quantity
        productMap.set(pid, existing)
    }

    posItems.forEach(item => processItem(item, false))
    salesItems.forEach(item => processItem(item, true))

    // Subtract returns from Product Aggregates
    returns.forEach(r => {
        if (!r.product) return
        const pid = r.product.id
        const existing = productMap.get(pid) || {
            name: r.product.name,
            category: r.product.category?.name || "Sans catégorie",
            brand: r.product.brand?.name || "Sans marque",
            qtySold: 0,
            revenue: 0,
            cost: 0
        }

        existing.qtySold -= r.quantity
        existing.revenue -= Number(r.totalAmount || (r.unitPrice * r.quantity))
        existing.cost -= Number(r.product.cost || 0) * r.quantity
        productMap.set(pid, existing)
    })

    const products = Array.from(productMap.entries()).map(([id, data]) => {
        const profit = data.revenue - data.cost
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0
        return {
            id,
            ...data,
            profit,
            margin
        }
    }).sort((a, b) => b.profit - a.profit)

    // 5. Aggregate by Category
    const categoryMap = new Map<string, { revenue: number; cost: number; qtySold: number }>()
    products.forEach(p => {
        const cat = p.category
        const existing = categoryMap.get(cat) || { revenue: 0, cost: 0, qtySold: 0 }
        existing.revenue += p.revenue
        existing.cost += p.cost
        existing.qtySold += p.qtySold
        categoryMap.set(cat, existing)
    })

    const byCategory = Array.from(categoryMap.entries()).map(([name, data]) => {
        const profit = data.revenue - data.cost
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0
        return {
            name,
            ...data,
            profit,
            margin
        }
    }).sort((a, b) => b.profit - a.profit)

    // 6. Aggregate by Brand
    const brandMap = new Map<string, { revenue: number; cost: number; qtySold: number }>()
    products.forEach(p => {
        const brand = p.brand
        const existing = brandMap.get(brand) || { revenue: 0, cost: 0, qtySold: 0 }
        existing.revenue += p.revenue
        existing.cost += p.cost
        existing.qtySold += p.qtySold
        brandMap.set(brand, existing)
    })

    const byBrand = Array.from(brandMap.entries()).map(([name, data]) => {
        const profit = data.revenue - data.cost
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0
        return {
            name,
            ...data,
            profit,
            margin
        }
    }).sort((a, b) => b.profit - a.profit)

    // 7. Compile individual Sales & Returns list
    const salesMap = new Map<string, {
        id: string
        type: "POS" | "BL" | "RETOUR"
        receiptNumber: string
        date: Date
        customerName: string
        clientType: string
        revenue: number
        cost: number
        _itemNames: Set<string>
    }>()

    posItems.forEach(item => {
        const oid = item.order.id
        const existing = salesMap.get(oid) || {
            id: oid,
            type: "POS",
            receiptNumber: `POS-${oid.slice(-6).toUpperCase()}`,
            date: item.order.createdAt,
            customerName: item.order.customer?.name || "Client de passage",
            clientType: item.order.customer?.clientType || "RETAIL",
            revenue: 0,
            cost: 0,
            _itemNames: new Set<string>()
        }
        existing.revenue += Number(item.price) * item.quantity
        existing.cost += Number(item.product.cost || 0) * item.quantity
        existing._itemNames.add(`${item.product.name} (x${item.quantity})`)
        salesMap.set(oid, existing)
    })

    salesItems.forEach(item => {
        const soid = item.salesOrder.id
        const existing = salesMap.get(soid) || {
            id: soid,
            type: "BL",
            receiptNumber: item.salesOrder.receiptNumber || `BL-${soid.slice(-6).toUpperCase()}`,
            date: item.salesOrder.createdAt,
            customerName: item.salesOrder.customer?.name || "Client de passage",
            clientType: item.salesOrder.customer?.clientType || "RETAIL",
            revenue: 0,
            cost: 0,
            _itemNames: new Set<string>()
        }
        existing.revenue += Number(item.unitPrice) * item.quantity
        existing.cost += Number(item.product.cost || 0) * item.quantity
        existing._itemNames.add(`${item.product.name} (x${item.quantity})`)
        salesMap.set(soid, existing)
    })

    const salesList = Array.from(salesMap.values()).map(sale => {
        const { _itemNames, ...rest } = sale as any
        const profit = rest.revenue - rest.cost
        const margin = rest.revenue > 0 ? (profit / rest.revenue) * 100 : 0
        return {
            ...rest,
            itemsSummary: Array.from(_itemNames as Set<string>).join(", "),
            profit,
            margin
        }
    })

    // Append returns as distinct items
    returns.forEach(r => {
        const rid = r.id
        const retRev = Number(r.totalAmount || (r.unitPrice * r.quantity))
        const retCost = Number(r.product?.cost || 0) * r.quantity
        const profit = -retRev - (-retCost) // -retRev + retCost
        const margin = retRev > 0 ? (profit / -retRev) * 100 : 0

        salesList.push({
            id: rid,
            type: "RETOUR",
            receiptNumber: `RET-${rid.slice(-6).toUpperCase()}`,
            date: r.createdAt,
            customerName: r.customer?.name || "Client de passage",
            clientType: r.customer?.clientType || "RETAIL",
            revenue: -retRev,
            cost: -retCost,
            profit,
            margin,
            itemsSummary: `[Retour] ${r.product?.name || "Produit"} (x${r.quantity})`
        })
    })

    // Sort chronologically descending
    const sales = salesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // 8. Aggregate expenses by Category for charts
    const expenseCategoryMap = new Map<string, number>()
    expenses.forEach(e => {
        const catName = e.category?.name || "Autres"
        expenseCategoryMap.set(catName, (expenseCategoryMap.get(catName) || 0) + Number(e.amount))
    })
    const expensesByCategory = Array.from(expenseCategoryMap.entries()).map(([name, amount]) => ({
        name,
        amount
    })).sort((a, b) => b.amount - a.amount)

    // 9. Generate Daily Timeline data for charts (Accounting for Returns)
    const dailyMap = new Map<string, { date: string; dateLabel: string; revenue: number; cost: number; grossProfit: number; expenses: number; netProfit: number }>()
    const days = eachDayOfInterval({ start: fromDate, end: toDate })
    days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd")
        dailyMap.set(dateStr, {
            date: dateStr,
            dateLabel: format(day, "dd/MM"),
            revenue: 0,
            cost: 0,
            grossProfit: 0,
            expenses: 0,
            netProfit: 0
        })
    })

    posItems.forEach(item => {
        const dateStr = format(item.order.createdAt, "yyyy-MM-dd")
        if (dailyMap.has(dateStr)) {
            const dayData = dailyMap.get(dateStr)!
            dayData.revenue += Number(item.price) * item.quantity
            dayData.cost += Number(item.product.cost || 0) * item.quantity
        }
    })

    salesItems.forEach(item => {
        const dateStr = format(item.salesOrder.createdAt, "yyyy-MM-dd")
        if (dailyMap.has(dateStr)) {
            const dayData = dailyMap.get(dateStr)!
            dayData.revenue += Number(item.unitPrice) * item.quantity
            dayData.cost += Number(item.product.cost || 0) * item.quantity
        }
    })

    returns.forEach(r => {
        const dateStr = format(r.createdAt, "yyyy-MM-dd")
        if (dailyMap.has(dateStr)) {
            const dayData = dailyMap.get(dateStr)!
            dayData.revenue -= Number(r.totalAmount || (r.unitPrice * r.quantity))
            dayData.cost -= Number(r.product?.cost || 0) * r.quantity
        }
    })

    expenses.forEach(e => {
        const dateStr = format(e.date, "yyyy-MM-dd")
        if (dailyMap.has(dateStr)) {
            const dayData = dailyMap.get(dateStr)!
            dayData.expenses += Number(e.amount)
        }
    })

    dailyMap.forEach(day => {
        day.grossProfit = day.revenue - day.cost
        day.netProfit = day.grossProfit - day.expenses
    })

    const dailyProfit = Array.from(dailyMap.values())

    // 10. Calculate Totals (Net values after returns)
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
    const totalCost = products.reduce((s, p) => s + p.cost, 0)
    const grossProfit = totalRevenue - totalCost
    const overallMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const netProfit = grossProfit - totalExpenses

    return {
        products,
        byCategory,
        byBrand,
        sales,
        expensesByCategory,
        dailyProfit,
        totals: {
            totalRevenue,
            totalCost,
            grossProfit,
            overallMargin,
            totalExpenses,
            netProfit
        }
    }
}

export async function getProfitReport(options?: ProfitFilters) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const tenantId = session.user.tenantId

    // Define date ranges
    const toDate = options?.to || endOfDay(new Date())
    const fromDate = options?.from || startOfDay(subDays(toDate, 30)) // Default to last 30 days

    // Calculate previous period
    const diff = toDate.getTime() - fromDate.getTime()
    const prevToDate = new Date(fromDate.getTime() - 1000)
    const prevFromDate = new Date(prevToDate.getTime() - diff)

    const filters = {
        clientType: options?.clientType,
        categoryId: options?.categoryId,
        brandId: options?.brandId,
        saleNumber: options?.saleNumber
    }

    // Fetch data in parallel for current and previous period
    const [currentPeriod, previousPeriod] = await Promise.all([
        getPeriodData(tenantId, fromDate, toDate, filters),
        getPeriodData(tenantId, prevFromDate, prevToDate, filters)
    ])

    return JSON.parse(JSON.stringify({
        currentPeriod,
        previousPeriod,
        dateRange: {
            current: { from: fromDate, to: toDate },
            previous: { from: prevFromDate, to: prevToDate }
        }
    }))
}
