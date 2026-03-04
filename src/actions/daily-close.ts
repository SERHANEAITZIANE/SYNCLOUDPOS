"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { DailyCloseData } from "@/types/daily-close"

/** Compute the closing totals for a given period (defaults to today) */
export async function computeDailyClose(periodStart?: Date, periodEnd?: Date): Promise<{ data?: DailyCloseData; error?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const now = new Date()
    const start = periodStart ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const end = periodEnd ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    try {
        const [orders, salesOrders, expenses] = await Promise.all([
            db.order.findMany({
                where: { tenantId, status: "COMPLETED", createdAt: { gte: start, lte: end } },
                select: { total: true, paidAmount: true, paymentMethod: true }
            }),
            db.salesOrder.findMany({
                where: { tenantId, status: { in: ["VALIDATED", "PAID"] }, createdAt: { gte: start, lte: end } },
                select: { total: true, paymentMethod: true }
            }),
            db.expense.findMany({
                where: { tenantId, createdAt: { gte: start, lte: end } },
                select: { amount: true }
            })
        ])

        let cashRevenue = 0, transferRevenue = 0, checkRevenue = 0, termRevenue = 0

        for (const o of orders) {
            const paid = Number(o.paidAmount)
            if (o.paymentMethod === "CASH") cashRevenue += paid
            else if (o.paymentMethod === "TRANSFER") transferRevenue += paid
            else if (o.paymentMethod === "CHECK") checkRevenue += paid
            else if (o.paymentMethod === "TERM") termRevenue += paid
            else cashRevenue += paid
        }
        for (const s of salesOrders) {
            const amount = Number(s.total)
            if (s.paymentMethod === "CASH") cashRevenue += amount
            else if (s.paymentMethod === "TRANSFER") transferRevenue += amount
            else if (s.paymentMethod === "CHECK") checkRevenue += amount
            else if (s.paymentMethod === "TERM") termRevenue += amount
            else cashRevenue += amount
        }

        const totalRevenue = cashRevenue + transferRevenue + checkRevenue + termRevenue
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
        const netCash = cashRevenue - totalExpenses

        return {
            data: {
                totalRevenue, cashRevenue, transferRevenue, checkRevenue, termRevenue,
                totalExpenses, netCash, ordersCount: orders.length, salesCount: salesOrders.length,
                periodStart: start, periodEnd: end
            }
        }
    } catch (e) {
        console.error("computeDailyClose error:", e)
        return { error: "Failed to compute totals" }
    }
}

/** Save the closing report to the database */
export async function saveDailyClose(data: DailyCloseData, notes?: string): Promise<{ success?: string; error?: string; id?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    const userId = session?.user?.id
    if (!tenantId) return { error: "Unauthorized" }

    try {
        const record = await db.dailyClose.create({
            data: {
                tenantId,
                periodStart: data.periodStart,
                periodEnd: data.periodEnd,
                totalRevenue: data.totalRevenue,
                cashRevenue: data.cashRevenue,
                transferRevenue: data.transferRevenue,
                checkRevenue: data.checkRevenue,
                termRevenue: data.termRevenue,
                totalExpenses: data.totalExpenses,
                netCash: data.netCash,
                ordersCount: data.ordersCount,
                salesCount: data.salesCount,
                notes: notes || null,
                closedByUserId: userId || null,
            }
        })
        revalidatePath("/[locale]/(dashboard)/cloture", "page")
        return { success: "Clôture enregistrée.", id: record.id }
    } catch (e) {
        console.error("saveDailyClose error:", e)
        return { error: "Erreur lors de l'enregistrement." }
    }
}

/** Fetch history of daily closes */
export async function getDailyCloses(limit = 30) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    return db.dailyClose.findMany({
        where: { tenantId },
        orderBy: { date: "desc" },
        take: limit
    })
}
