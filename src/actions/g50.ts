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

export interface G50DeductibleRow {
    rate: number
    baseHT: number
    tvaAmount: number
    purchaseCount: number
}

export interface G50Result {
    period: string
    // Section I: TVA Collectée (output VAT from sales)
    rows: G50Row[]
    grandHT: number
    grandTVA: number
    grandTTC: number
    totalInvoices: number
    // Section II: TAP
    tapRate: number
    tapAmount: number
    // Section III: TVA Déductible (input VAT from purchases)
    deductibleRows: G50DeductibleRow[]
    totalDeductibleTVA: number
    // Section IV: TVA Nette
    netTVA: number
    // Section V: Retenue à la source
    totalWithholding: number
    // Section VI: Droit de timbre collecté
    totalTimbre: number
    // Section VII: Total à verser
    totalTaxDue: number
    tenant: {
        name: string
        ownerName: string | null
        activity: string | null
        address: string | null
        wilaya: string | null
        commune: string | null
        phone: string | null
        email: string | null
        nif: string | null
        rc: string | null
        artImposition: string | null
        nis: string | null
    } | null
}

/**
 * Computes the G50 TVA declaration for a given month/year.
 * Only processes SalesOrders of type "INVOICE" for TVA collectée.
 * Also includes TAP, TVA déductible from purchases, withholding tax, and stamp tax.
 */
export async function getG50Data(year: number, month: number): Promise<G50Result | { error: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    // ── Fetch tenant settings ──────────────────────────────────────
    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            name: true,
            ownerName: true,
            activity: true,
            address: true,
            wilaya: true,
            commune: true,
            phone: true,
            email: true,
            nif: true,
            rc: true,
            artImposition: true,
            nis: true,
            tapRate: true,
        }
    })

    const tapRate = tenant?.tapRate ?? 2

    // ── Section I: TVA Collectée (from INVOICE sales) ──────────────
    const invoices = await db.salesOrder.findMany({
        where: {
            tenantId,
            type: { in: ["INVOICE", "CREDIT_NOTE"] },
            status: { not: "CANCELLED" },
            createdAt: { gte: startDate, lt: endDate }
        },
        include: {
            items: {
                include: { product: { select: { tvaRate: true } } }
            }
        }
    })

    const rateMap = new Map<number, { baseHT: number; tvaAmount: number; totalTTC: number; count: number }>()

    for (const invoice of invoices) {
        const multiplier = invoice.type === "CREDIT_NOTE" ? -1 : 1
        for (const item of invoice.items) {
            const rate = Number(item.tvaRate ?? item.product?.tvaRate ?? 19)
            const qty = Number(item.quantity)
            const unitPriceHT = Number(item.priceHt) > 0 ? Number(item.priceHt) : Number(item.unitPrice)
            const lineHT = unitPriceHT * qty * multiplier
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

    // Ensure standard Algerian TVA rates always appear
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

    // ── Section II: TAP ────────────────────────────────────────────
    const tapAmount = grandHT * (tapRate / 100)

    // ── Section III: TVA Déductible (from purchases) ───────────────
    const purchases = await db.purchaseOrder.findMany({
        where: {
            tenantId,
            status: { in: ["FACTURE", "COMPLETED"] },
            createdAt: { gte: startDate, lt: endDate }
        },
        include: {
            items: true
        }
    })

    const deductibleMap = new Map<number, { baseHT: number; tvaAmount: number; count: number }>()

    for (const po of purchases) {
        for (const item of po.items) {
            const rate = Number(item.tvaRate ?? 19)
            const qty = Number(item.quantity)
            const costHT = Number(item.costPrice)
            const lineHT = costHT * qty
            const lineTVA = lineHT * (rate / 100)

            const existing = deductibleMap.get(rate) ?? { baseHT: 0, tvaAmount: 0, count: 0 }
            deductibleMap.set(rate, {
                baseHT: existing.baseHT + lineHT,
                tvaAmount: existing.tvaAmount + lineTVA,
                count: existing.count + 1
            })
        }
    }

    // Ensure standard rates
    for (const rate of [0, 9, 19]) {
        if (!deductibleMap.has(rate)) {
            deductibleMap.set(rate, { baseHT: 0, tvaAmount: 0, count: 0 })
        }
    }

    const deductibleRows: G50DeductibleRow[] = Array.from(deductibleMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([rate, data]) => ({
            rate,
            baseHT: data.baseHT,
            tvaAmount: data.tvaAmount,
            purchaseCount: data.count
        }))

    const totalDeductibleTVA = deductibleRows.reduce((s, r) => s + r.tvaAmount, 0)

    // ── Section IV: TVA Nette ──────────────────────────────────────
    const netTVA = Math.max(0, grandTVA - totalDeductibleTVA)

    // ── Section V: Retenue à la source ─────────────────────────────
    const totalWithholding = purchases.reduce((s, po) => s + Number(po.withholdingAmount ?? 0), 0)

    // ── Section VI: Droit de timbre collecté ───────────────────────
    const totalTimbre = invoices.reduce((s, inv) => s + Number(inv.stampTax ?? 0), 0)

    // ── Section VII: Total à verser ────────────────────────────────
    const totalTaxDue = netTVA + tapAmount + totalTimbre

    const periodLabel = new Date(year, month - 1).toLocaleDateString("fr-DZ", { month: "long", year: "numeric" })

    // Remove tapRate from tenant before returning
    const { tapRate: _, ...tenantData } = tenant || {} as any

    return {
        period: periodLabel,
        rows,
        grandHT,
        grandTVA,
        grandTTC,
        totalInvoices: invoices.filter(i => i.type === "INVOICE").length,
        tapRate,
        tapAmount,
        deductibleRows,
        totalDeductibleTVA,
        netTVA,
        totalWithholding,
        totalTimbre,
        totalTaxDue,
        tenant: tenantData?.name ? tenantData : null
    }
}
