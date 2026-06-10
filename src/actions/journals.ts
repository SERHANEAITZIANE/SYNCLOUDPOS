"use server"

import { SalesOrderType } from "@prisma/client"
import { db } from "@/lib/db"
import { auth } from "@/auth"

export interface SalesJournalEntry {
    id: string
    date: string
    receiptNumber: string | null
    type: string // INVOICE, ORDER, CREDIT_NOTE
    customerName: string
    customerNif: string | null
    subtotalHT: number
    tva19: number
    tva9: number
    tva0HT: number
    totalTVA: number
    stampTax: number
    totalTTC: number
    paymentMethod: string
    paymentStatus: string
}

export interface SalesJournalResult {
    entries: SalesJournalEntry[]
    totals: {
        totalHT: number
        totalTVA19: number
        totalTVA9: number
        totalTVA0HT: number
        totalTVA: number
        totalTimbre: number
        totalTTC: number
        invoiceCount: number
        creditNoteCount: number
    }
    period: string
    tenant: {
        name: string
        nif: string | null
        rc: string | null
        address: string | null
    } | null
}

/**
 * Journal des Ventes — Required by DGI for G50 filing
 * Lists all invoices/BLs chronologically with HT, TVA breakdown, TTC, and stamp tax
 */
export async function getSalesJournal(
    year: number,
    month: number,
    type?: string // "ALL", "INVOICE", "ORDER", "CREDIT_NOTE"
): Promise<SalesJournalResult | { error: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, nif: true, rc: true, address: true }
    })

    const whereClause: any = {
        tenantId,
        status: { not: "CANCELLED" },
        createdAt: { gte: startDate, lt: endDate }
    }

    if (type && type !== "ALL") {
        whereClause.type = type as SalesOrderType
    } else {
        whereClause.type = { in: ["INVOICE", "ORDER", "CREDIT_NOTE"] as SalesOrderType[] }
    }

    const salesOrders = await db.salesOrder.findMany({
        where: whereClause,
        include: {
            customer: { select: { name: true, nif: true } },
            items: {
                include: { product: { select: { tvaRate: true } } }
            }
        },
        orderBy: { createdAt: "asc" }
    })

    const entries: SalesJournalEntry[] = salesOrders.map(so => {
        const multiplier = so.type === "CREDIT_NOTE" ? -1 : 1

        let totalHT = 0
        let tva19 = 0
        let tva9 = 0
        let tva0HT = 0

        for (const item of so.items) {
            const rate = Number(item.tvaRate ?? item.product?.tvaRate ?? 19)
            const qty = Number(item.quantity)
            const unitHT = Number(item.priceHt) > 0 ? Number(item.priceHt) : Number(item.unitPrice)
            const lineHT = unitHT * qty * multiplier

            totalHT += lineHT

            if (rate >= 19) {
                tva19 += lineHT * (rate / 100)
            } else if (rate >= 9) {
                tva9 += lineHT * (rate / 100)
            } else {
                tva0HT += lineHT
            }
        }

        const totalTVA = tva19 + tva9
        const stampTax = Number(so.stampTax ?? 0) * multiplier

        return {
            id: so.id,
            date: so.createdAt.toISOString(),
            receiptNumber: so.receiptNumber,
            type: so.type,
            customerName: so.customer?.name ?? "—",
            customerNif: so.customer?.nif ?? null,
            subtotalHT: totalHT,
            tva19,
            tva9,
            tva0HT,
            totalTVA,
            stampTax,
            totalTTC: totalHT + totalTVA + stampTax,
            paymentMethod: so.paymentMethod,
            paymentStatus: so.paymentStatus
        }
    })

    const invoiceEntries = entries.filter(e => e.type !== "CREDIT_NOTE")
    const creditEntries = entries.filter(e => e.type === "CREDIT_NOTE")

    const totals = {
        totalHT: entries.reduce((s, e) => s + e.subtotalHT, 0),
        totalTVA19: entries.reduce((s, e) => s + e.tva19, 0),
        totalTVA9: entries.reduce((s, e) => s + e.tva9, 0),
        totalTVA0HT: entries.reduce((s, e) => s + e.tva0HT, 0),
        totalTVA: entries.reduce((s, e) => s + e.totalTVA, 0),
        totalTimbre: entries.reduce((s, e) => s + e.stampTax, 0),
        totalTTC: entries.reduce((s, e) => s + e.totalTTC, 0),
        invoiceCount: invoiceEntries.length,
        creditNoteCount: creditEntries.length
    }

    const periodLabel = new Date(year, month - 1)
        .toLocaleDateString("fr-DZ", { month: "long", year: "numeric" })

    return {
        entries,
        totals,
        period: periodLabel,
        tenant
    }
}

/**
 * Journal des Achats — Required for TVA déductible tracking
 */
export async function getPurchaseJournal(
    year: number,
    month: number
): Promise<{ entries: any[]; totals: any; period: string; tenant: any } | { error: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, nif: true, rc: true, address: true }
    })

    const purchases = await db.purchaseOrder.findMany({
        where: {
            tenantId,
            status: { not: "CANCELLED" },
            createdAt: { gte: startDate, lt: endDate }
        },
        include: {
            supplier: { select: { name: true, nif: true, withholdingRate: true } },
            items: true
        },
        orderBy: { createdAt: "asc" }
    })

    const entries = purchases.map(po => {
        let totalHT = 0
        let tva19 = 0
        let tva9 = 0
        let tva0HT = 0

        for (const item of po.items) {
            const rate = Number(item.tvaRate ?? 19)
            const qty = Number(item.quantity)
            const costHT = Number(item.costPrice)
            const lineHT = costHT * qty

            totalHT += lineHT

            if (rate >= 19) {
                tva19 += lineHT * (rate / 100)
            } else if (rate >= 9) {
                tva9 += lineHT * (rate / 100)
            } else {
                tva0HT += lineHT
            }
        }

        const totalTVA = tva19 + tva9
        const withholdingAmount = Number(po.withholdingAmount ?? 0)

        return {
            id: po.id,
            date: po.createdAt.toISOString(),
            reference: po.reference ?? null,
            supplierName: po.supplier?.name ?? "—",
            supplierNif: po.supplier?.nif ?? null,
            status: po.status,
            subtotalHT: totalHT,
            tva19,
            tva9,
            tva0HT,
            totalTVA,
            withholdingAmount,
            totalTTC: totalHT + totalTVA,
        }
    })

    const totals = {
        totalHT: entries.reduce((s, e) => s + e.subtotalHT, 0),
        totalTVA19: entries.reduce((s, e) => s + e.tva19, 0),
        totalTVA9: entries.reduce((s, e) => s + e.tva9, 0),
        totalTVA0HT: entries.reduce((s, e) => s + e.tva0HT, 0),
        totalTVA: entries.reduce((s, e) => s + e.totalTVA, 0),
        totalWithholding: entries.reduce((s, e) => s + e.withholdingAmount, 0),
        totalTTC: entries.reduce((s, e) => s + e.totalTTC, 0),
        purchaseCount: entries.length
    }

    const periodLabel = new Date(year, month - 1)
        .toLocaleDateString("fr-DZ", { month: "long", year: "numeric" })

    return { entries, totals, period: periodLabel, tenant }
}
