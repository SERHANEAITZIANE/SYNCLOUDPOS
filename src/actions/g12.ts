"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export type IFURate = 0.5 | 5 | 12

export interface G12QuarterRow {
    quarter: number         // 1-4
    label: string           // "T1 (Jan-Mar)"
    caHT: number            // Chiffre d'affaires HT in this quarter
    ifuAmount: number       // IFU due for this quarter
}

export interface G12Result {
    year: number
    mode: "previsionnel" | "definitif"
    ifuRate: IFURate
    quarters: G12QuarterRow[]
    totalCA: number
    totalIFU: number
    /** For previsionnel: projected full-year CA based on pace so far */
    projectedCA?: number
    projectedIFU?: number
    /** Months elapsed in current year */
    monthsElapsed?: number
}

const QUARTER_LABELS: Record<number, string> = {
    1: "T1 (Janvier — Mars)",
    2: "T2 (Avril — Juin)",
    3: "T3 (Juillet — Septembre)",
    4: "T4 (Octobre — Décembre)",
}

/**
 * Computes G12 / G12 Bis IFU declaration.
 * Aggregates INVOICE + ORDER-type SalesOrders for the full year,
 * broken down by quarter, applying the selected IFU rate.
 *
 * - mode "previsionnel" (G12):  current year data + year-end projection
 * - mode "definitif"   (G12 Bis): previous year final figures
 */
export async function getG12Data(
    year: number,
    ifuRate: IFURate,
    mode: "previsionnel" | "definitif"
): Promise<G12Result | { error: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year + 1, 0, 1)

    // Fetch all invoiced SalesOrders (INVOICE + ORDER = BL which are revenue-generating)
    const invoices = await db.salesOrder.findMany({
        where: {
            tenantId,
            type: { in: ["INVOICE", "ORDER"] },
            status: { not: "CANCELLED" },
            createdAt: { gte: startDate, lt: endDate }
        },
        select: {
            createdAt: true,
            subtotal: true,  // HT amount
            total: true,
        }
    })

    // Group by quarter
    const quarterTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }

    for (const inv of invoices) {
        const month = inv.createdAt.getMonth() + 1 // 1-12
        const quarter = Math.ceil(month / 3)
        quarterTotals[quarter] += Number(inv.subtotal) // HT
    }

    const quarters: G12QuarterRow[] = [1, 2, 3, 4].map(q => {
        const caHT = quarterTotals[q]
        return {
            quarter: q,
            label: QUARTER_LABELS[q],
            caHT,
            ifuAmount: caHT * (ifuRate / 100)
        }
    })

    const totalCA = quarters.reduce((s, q) => s + q.caHT, 0)
    const totalIFU = totalCA * (ifuRate / 100)

    const result: G12Result = {
        year,
        mode,
        ifuRate,
        quarters,
        totalCA,
        totalIFU
    }

    // For previsionnel mode: project the full-year CA
    if (mode === "previsionnel") {
        const now = new Date()
        const monthsElapsed = now.getFullYear() === year
            ? now.getMonth() + 1  // current year
            : 12                   // full year if past
        result.monthsElapsed = monthsElapsed

        if (monthsElapsed > 0 && monthsElapsed < 12) {
            result.projectedCA = (totalCA / monthsElapsed) * 12
            result.projectedIFU = result.projectedCA * (ifuRate / 100)
        }
    }

    return result
}
