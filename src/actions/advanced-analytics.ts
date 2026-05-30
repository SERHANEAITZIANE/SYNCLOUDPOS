"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { withCache } from "@/lib/redis"
import { startOfDay, endOfDay, format, eachDayOfInterval } from "date-fns"

/**
 * Advanced Analytics — Cashier Performance, Customer Segmentation, and Margin Analysis
 * 
 * These are higher-level analytics that build on the base analytics module
 * and provide actionable business intelligence.
 */

// ─── Cashier Performance ──────────────────────────────────────

interface CashierMetrics {
    userId: string
    userName: string
    ordersCount: number
    totalRevenue: number
    avgTicket: number
    maxTicket: number
    cashTotal: number
    creditGiven: number
    uniqueCustomers: number
}

/**
 * Get per-cashier performance metrics for a date range.
 */
export async function getCashierPerformance(dateRange?: { from: Date; to: Date }) {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }

    const tenantId = session.user.tenantId
    const storeId = session.user.defaultStoreId
    const toDate = dateRange?.to || endOfDay(new Date())
    const fromDate = dateRange?.from || startOfDay(new Date())

    const cacheKey = `cashier-perf:${tenantId}:${storeId}:${format(fromDate, 'yyyyMMdd')}-${format(toDate, 'yyyyMMdd')}`

    return withCache(cacheKey, async () => {
        // Get orders grouped by user
        const ordersByUser = await db.order.groupBy({
            by: ['userId'],
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: "COMPLETED",
                createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            _sum: { total: true, paidAmount: true },
            _count: { id: true },
            _max: { total: true },
        })

        if (ordersByUser.length === 0) {
            return { success: true, data: [] }
        }

        // Fetch user names
        const userIds = ordersByUser.map(o => o.userId)
        const users = await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true }
        })
        const userMap = new Map(users.map(u => [u.id, u.name || u.email || "Inconnu"]))

        // Count unique customers per cashier
        const customerCounts = await db.order.groupBy({
            by: ['userId'],
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: "COMPLETED",
                customerId: { not: null },
                createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            _count: { customerId: true },
        })
        const customerMap = new Map(customerCounts.map(c => [c.userId, c._count.customerId]))

        const metrics: CashierMetrics[] = ordersByUser.map(o => {
            const revenue = Number(o._sum.total || 0)
            const paid = Number(o._sum.paidAmount || 0)
            const count = o._count.id

            return {
                userId: o.userId,
                userName: userMap.get(o.userId) || "Inconnu",
                ordersCount: count,
                totalRevenue: revenue,
                avgTicket: count > 0 ? Math.round(revenue / count) : 0,
                maxTicket: Number(o._max.total || 0),
                cashTotal: paid,
                creditGiven: Math.max(0, revenue - paid),
                uniqueCustomers: customerMap.get(o.userId) || 0,
            }
        })

        // Sort by revenue descending
        metrics.sort((a, b) => b.totalRevenue - a.totalRevenue)

        return { success: true, data: metrics }
    }, 60)
}

// ─── Customer Segmentation (RFM) ─────────────────────────────

interface CustomerSegment {
    id: string
    name: string
    lastPurchase: Date | null
    recencyDays: number
    frequency: number
    monetary: number
    segment: "VIP" | "LOYAL" | "REGULAR" | "AT_RISK" | "LOST" | "NEW"
}

/**
 * RFM Analysis — Segment customers by Recency, Frequency, Monetary value.
 */
export async function getCustomerSegmentation() {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }

    const tenantId = session.user.tenantId
    const cacheKey = `rfm:${tenantId}`

    return withCache(cacheKey, async () => {
        // Get customer order summaries
        const customers = await db.customer.findMany({
            where: { tenantId },
            select: { id: true, name: true, createdAt: true }
        })

        if (customers.length === 0) {
            return { success: true, data: { segments: [], summary: {} } }
        }

        const orderStats = await db.order.groupBy({
            by: ['customerId'],
            where: {
                tenantId,
                status: "COMPLETED",
                customerId: { in: customers.map(c => c.id) }
            },
            _count: { id: true },
            _sum: { total: true },
            _max: { createdAt: true },
        })

        const statsMap = new Map(orderStats.map(o => [o.customerId!, {
            frequency: o._count.id,
            monetary: Number(o._sum.total || 0),
            lastPurchase: o._max.createdAt,
        }]))

        const now = new Date()
        const segments: CustomerSegment[] = customers.map(c => {
            const stats = statsMap.get(c.id)
            const recencyDays = stats?.lastPurchase
                ? Math.floor((now.getTime() - new Date(stats.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
                : 9999

            const frequency = stats?.frequency || 0
            const monetary = stats?.monetary || 0

            let segment: CustomerSegment["segment"]
            if (frequency === 0) {
                segment = "NEW"
            } else if (recencyDays < 7 && frequency > 10 && monetary > 50000) {
                segment = "VIP"
            } else if (recencyDays < 30 && frequency > 5) {
                segment = "LOYAL"
            } else if (recencyDays < 60) {
                segment = "REGULAR"
            } else if (recencyDays < 180) {
                segment = "AT_RISK"
            } else {
                segment = "LOST"
            }

            return {
                id: c.id,
                name: c.name,
                lastPurchase: stats?.lastPurchase || null,
                recencyDays,
                frequency,
                monetary,
                segment,
            }
        })

        // Summary counts
        const summary: Record<string, number> = {}
        segments.forEach(s => {
            summary[s.segment] = (summary[s.segment] || 0) + 1
        })

        // Sort: VIP first, then by monetary desc
        const segmentOrder = { VIP: 0, LOYAL: 1, REGULAR: 2, AT_RISK: 3, NEW: 4, LOST: 5 }
        segments.sort((a, b) => {
            const diff = segmentOrder[a.segment] - segmentOrder[b.segment]
            return diff !== 0 ? diff : b.monetary - a.monetary
        })

        return { success: true, data: { segments, summary } }
    }, 120)
}

// ─── Margin Analysis ──────────────────────────────────────────

interface ProductMargin {
    productId: string
    productName: string
    qtySold: number
    revenue: number
    cost: number
    grossProfit: number
    marginPct: number
}

/**
 * Product-level profit margin analysis for a date range.
 */
export async function getMarginAnalysis(dateRange?: { from: Date; to: Date }) {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }

    const tenantId = session.user.tenantId
    const storeId = session.user.defaultStoreId
    const toDate = dateRange?.to || endOfDay(new Date())
    const fromDate = dateRange?.from || startOfDay(new Date())

    const cacheKey = `margins:${tenantId}:${storeId}:${format(fromDate, 'yyyyMMdd')}-${format(toDate, 'yyyyMMdd')}`

    return withCache(cacheKey, async () => {
        // Get aggregated sales per product
        const salesByProduct = await db.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
                }
            },
            _sum: { quantity: true, price: true }
        })

        if (salesByProduct.length === 0) {
            return { success: true, data: [] }
        }

        // Fetch product details
        const productIds = salesByProduct.map(s => s.productId)
        const products = await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, cost: true }
        })
        const productMap = new Map(products.map(p => [p.id, { name: p.name, cost: Number(p.cost || 0) }]))

        const margins: ProductMargin[] = salesByProduct.map(s => {
            const prod = productMap.get(s.productId)
            const qtySold = s._sum.quantity || 0
            const revenue = Number(s._sum.price || 0) * qtySold
            const cost = (prod?.cost || 0) * qtySold
            const grossProfit = revenue - cost
            const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0

            return {
                productId: s.productId,
                productName: prod?.name || "Inconnu",
                qtySold,
                revenue: Math.round(revenue),
                cost: Math.round(cost),
                grossProfit: Math.round(grossProfit),
                marginPct,
            }
        })

        // Sort by gross profit desc
        margins.sort((a, b) => b.grossProfit - a.grossProfit)

        // Summary
        const totalRevenue = margins.reduce((sum, m) => sum + m.revenue, 0)
        const totalCost = margins.reduce((sum, m) => sum + m.cost, 0)
        const totalProfit = totalRevenue - totalCost
        const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0

        // Find negative margin products
        const lossProducts = margins.filter(m => m.grossProfit < 0)
        const topProfitable = margins.slice(0, 10)

        return {
            success: true,
            data: {
                products: margins,
                topProfitable,
                lossProducts,
                summary: {
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    avgMargin,
                    productsAnalyzed: margins.length,
                    productsAtLoss: lossProducts.length,
                }
            }
        }
    }, 60)
}

// ─── Sales Trend Analysis ─────────────────────────────────────

/**
 * Hourly sales pattern — identifies peak selling hours.
 */
export async function getHourlySalesPattern(dateRange?: { from: Date; to: Date }) {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }

    const tenantId = session.user.tenantId
    const storeId = session.user.defaultStoreId
    const toDate = dateRange?.to || endOfDay(new Date())
    const fromDate = dateRange?.from || startOfDay(new Date())

    const cacheKey = `hourly:${tenantId}:${storeId}:${format(fromDate, 'yyyyMMdd')}-${format(toDate, 'yyyyMMdd')}`

    return withCache(cacheKey, async () => {
        const orders = await db.order.findMany({
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: "COMPLETED",
                createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            select: { createdAt: true, total: true }
        })

        // Group by hour
        const hourlyMap = new Map<number, { orders: number; revenue: number }>()
        for (let h = 0; h < 24; h++) {
            hourlyMap.set(h, { orders: 0, revenue: 0 })
        }

        orders.forEach(o => {
            const hour = new Date(o.createdAt).getHours()
            const entry = hourlyMap.get(hour)!
            entry.orders++
            entry.revenue += Number(o.total)
        })

        const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
            hour: `${String(hour).padStart(2, "0")}:00`,
            orders: data.orders,
            revenue: Math.round(data.revenue),
        }))

        const peakHour = hourlyData.reduce((max, h) => h.revenue > max.revenue ? h : max, hourlyData[0])

        return {
            success: true,
            data: {
                hourly: hourlyData,
                peakHour: peakHour.hour,
                peakRevenue: peakHour.revenue,
            }
        }
    }, 120)
}
