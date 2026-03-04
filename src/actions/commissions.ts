"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

/** Get commission report: orders grouped by salesperson with totals */
export async function getCommissionReport(year: number, month?: number) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { commissionRate: true }
    })

    const startDate = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1)
    const endDate = month
        ? new Date(year, month, 1)
        : new Date(year + 1, 0, 1)

    // Get all completed orders in the period with their salesperson
    const orders = await db.order.findMany({
        where: {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: startDate, lt: endDate }
        },
        select: {
            id: true,
            total: true,
            paidAmount: true,
            userId: true,
            user: { select: { id: true, name: true, role: true } },
            createdAt: true
        }
    })

    // Group by salesperson
    const map = new Map<string, {
        userId: string
        userName: string
        role: string
        orderCount: number
        totalRevenue: number
        commissionAmount: number
    }>()

    const defaultRate = tenant?.commissionRate ?? 0

    for (const order of orders) {
        const key = order.userId
        const existing = map.get(key) ?? {
            userId: order.userId,
            userName: order.user?.name || "Inconnu",
            role: order.user?.role || "",
            orderCount: 0,
            totalRevenue: 0,
            commissionAmount: 0
        }
        const revenue = Number(order.paidAmount)
        map.set(key, {
            ...existing,
            orderCount: existing.orderCount + 1,
            totalRevenue: existing.totalRevenue + revenue,
            commissionAmount: existing.commissionAmount + (revenue * defaultRate / 100)
        })
    }

    return {
        commissionRate: defaultRate,
        rows: Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
        totalRevenue: Array.from(map.values()).reduce((s, r) => s + r.totalRevenue, 0),
        totalCommission: Array.from(map.values()).reduce((s, r) => s + r.commissionAmount, 0)
    }
}
