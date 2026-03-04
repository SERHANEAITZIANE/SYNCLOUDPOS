"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export interface G50Row {
    rate: number        // TVA rate: 0, 9, or 19
    baseHT: number      // Total HT for this rate
    tvaAmount: number   // Total TVA for this rate
    totalTTC: number    // Total TTC for this rate
    invoiceCount: number
}

export interface G50Result {
    period: string
    rows: G50Row[]
    grandHT: number
    grandTVA: number
    grandTTC: number
    totalInvoices: number
}

/**
 * Computes the G50 TVA declaration for a given month/year.
 * Only processes SalesOrders of type "INVOICE".
 */
export async function getG50Data(year: number, month: number): Promise<G50Result | { error: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    // Fetch all INVOICE-type SalesOrders for the period with their line items
    const invoices = await db.salesOrder.findMany({
        where: {
            tenantId,
            type: "INVOICE",
            status: { not: "CANCELLED" },
            createdAt: { gte: startDate, lt: endDate }
        },
        include: {
            items: {
                include: { product: { select: { tvaRate: true } } }
            }
        }
    })

    // Group by TVA rate
    const rateMap = new Map<number, { baseHT: number; tvaAmount: number; totalTTC: number; count: number }>()

    for (const invoice of invoices) {
        for (const item of invoice.items) {
            const rate = Number(item.tvaRate ?? item.product?.tvaRate ?? 19)
            const qty = Number(item.quantity)
            const unitPriceHT = Number(item.priceHt ?? item.unitPrice)
            const lineHT = unitPriceHT * qty
            const lineTVA = lineHT * (rate / 100)
            const lineTTC = lineHT + lineTVA

            const existing = rateMap.get(rate) ?? { baseHT: 0, tvaAmount: 0, totalTTC: 0, count: 0 }
            rateMap.set(rate, {
                baseHT: existing.baseHT + lineHT,
                tvaAmount: existing.tvaAmount + lineTVA,
                totalTTC: existing.totalTTC + lineTTC,
                count: existing.count + 1
            })
        }
    }

    // Ensure standard Algerian TVA rates always appear (even if 0)
    for (const rate of [0, 9, 19]) {
        if (!rateMap.has(rate)) {
            rateMap.set(rate, { baseHT: 0, tvaAmount: 0, totalTTC: 0, count: 0 })
        }
    }

    const rows: G50Row[] = Array.from(rateMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([rate, data]) => ({
            rate,
            baseHT: data.baseHT,
            tvaAmount: data.tvaAmount,
            totalTTC: data.totalTTC,
            invoiceCount: data.count
        }))

    const grandHT = rows.reduce((s, r) => s + r.baseHT, 0)
    const grandTVA = rows.reduce((s, r) => s + r.tvaAmount, 0)
    const grandTTC = rows.reduce((s, r) => s + r.totalTTC, 0)

    const periodLabel = new Date(year, month - 1).toLocaleDateString("fr-DZ", { month: "long", year: "numeric" })

    return {
        period: periodLabel,
        rows,
        grandHT,
        grandTVA,
        grandTTC,
        totalInvoices: invoices.length
    }
}
