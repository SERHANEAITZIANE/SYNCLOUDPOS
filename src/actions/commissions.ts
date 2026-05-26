"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getCommissionReport(year: number, month?: number) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    // 1. Get tenant settings
    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { commissionRate: true, commissionMode: true }
    })

    const defaultRate = tenant?.commissionRate ?? 0
    const mode = tenant?.commissionMode || "CATEGORY"

    // 2. Setup date range for period reporting
    const startDate = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1)
    const endDate = month
        ? new Date(year, month, 1)
        : new Date(year + 1, 0, 1)

    // 3. Fetch all active salespeople/cashiers in the tenant
    const salespeople = await db.user.findMany({
        where: {
            tenantId,
            role: { in: ["CASHIER", "VENDEUR", "ADMIN"] }
        },
        select: { id: true, name: true, role: true }
    })

    // Helper map to track user stats
    const statsMap = new Map<string, {
        userId: string
        userName: string
        role: string
        orderCount: number
        totalRevenue: number // Sum of amountPaid in the selected period
        commissionAmount: number // Sum of commission earned in the selected period
        totalPaid: number // Sum of SellerCommissionPayment in the selected period
        allTimeEarned: number // Sum of all-time commission earned
        allTimePaid: number // Sum of all-time SellerCommissionPayment
        currentBalance: number // allTimeEarned - allTimePaid
    }>()

    // Initialize all salespeople in the map
    for (const seller of salespeople) {
        statsMap.set(seller.id, {
            userId: seller.id,
            userName: seller.name || "Inconnu",
            role: seller.role,
            orderCount: 0,
            totalRevenue: 0,
            commissionAmount: 0,
            totalPaid: 0,
            allTimeEarned: 0,
            allTimePaid: 0,
            currentBalance: 0
        })
    }

    // 4. Fetch ALL-TIME SalesOrders (BLs) to compute all-time earned commission
    const allSalesOrders = await db.salesOrder.findMany({
        where: {
            tenantId,
            type: "ORDER", // Bon de Livraison
            status: { not: "CANCELLED" },
            userId: { not: null }
        },
        include: {
            customer: true,
            items: {
                include: {
                    product: {
                        include: {
                            brand: true,
                            category: true
                        }
                    }
                }
            }
        }
    })

    // Calculate commission for all-time BLs
    for (const order of allSalesOrders) {
        const key = order.userId!
        const existing = statsMap.get(key)
        if (!existing) continue

        const customerType = order.customer?.clientType || "RETAIL"
        const orderTotal = Number(order.total)
        const amountPaid = Number(order.amountPaid)
        const paymentRatio = orderTotal > 0 ? (amountPaid / orderTotal) : 0

        // Calculate max theoretical commission of the order
        let orderMaxCommission = 0
        for (const item of order.items) {
            let itemRate = defaultRate
            const product = item.product

            if (mode === "BRAND" && product.brandId && product.brand) {
                const brand = product.brand
                const rate = customerType === "WHOLESALE" ? brand.commissionWholesale :
                             customerType === "RESELLER"  ? brand.commissionReseller :
                             brand.commissionRetail
                if (rate > 0) itemRate = rate
            } else if (mode === "CATEGORY" && product.categoryId && product.category) {
                const category = product.category
                const rate = customerType === "WHOLESALE" ? category.commissionWholesale :
                             customerType === "RESELLER"  ? category.commissionReseller :
                             category.commissionRetail
                if (rate > 0) itemRate = rate
            }

            const itemPriceHt = Number(item.priceHt) > 0 ? Number(item.priceHt) : Number(item.unitPrice)
            const itemSubtotal = itemPriceHt * item.quantity
            orderMaxCommission += (itemSubtotal * itemRate) / 100
        }

        // Earned commission at the current payment level
        const orderEarnedCommission = orderMaxCommission * paymentRatio

        // Update all-time stats
        existing.allTimeEarned += orderEarnedCommission

        // If order belongs to the SELECTED period, update period stats
        const orderDate = new Date(order.createdAt)
        if (orderDate >= startDate && orderDate < endDate) {
            existing.orderCount += 1
            existing.totalRevenue += amountPaid
            existing.commissionAmount += orderEarnedCommission
        }
    }

    // 5. Fetch ALL-TIME SellerCommissionPayments to calculate payout totals
    const allPayments = await db.sellerCommissionPayment.findMany({
        where: { tenantId }
    })

    for (const payment of allPayments) {
        const key = payment.userId
        const existing = statsMap.get(key)
        if (!existing) continue

        const amount = Number(payment.amount)
        existing.allTimePaid += amount

        // If payment belongs to the SELECTED period, update period stats
        const paymentDate = new Date(payment.date)
        if (paymentDate >= startDate && paymentDate < endDate) {
            existing.totalPaid += amount
        }
    }

    // 6. Compute current balances (Earned - Paid)
    for (const [key, value] of statsMap.entries()) {
        value.currentBalance = value.allTimeEarned - value.allTimePaid
        statsMap.set(key, value)
    }

    // Return full stats sorted by period revenue
    const rows = Array.from(statsMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

    return {
        commissionMode: mode,
        commissionRate: defaultRate,
        rows,
        totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
        totalCommissionEarned: rows.reduce((s, r) => s + r.commissionAmount, 0),
        totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
        totalBalance: rows.reduce((s, r) => s + r.currentBalance, 0)
    }
}
