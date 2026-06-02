"use server"

// Server-side PDF generation for sales documents (Facture, BL, Proforma)
// Uses jsPDF + jspdf-autotable to produce PDF buffers for email/WhatsApp attachments

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PDFItem {
    product: { name: string }
    quantity: number
    unitPrice: number | string
    tvaRate: number | string
    priceHt: number | string
}

interface PDFCustomer {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    nif?: string | null
    nis?: string | null
    rc?: string | null
    artImposition?: string | null
    rib?: string | null
    taxId?: string | null
    balance?: number | string | null
}

interface PDFStore {
    name?: string | null
    activity?: string | null
    address?: string | null
    phone?: string | null
    fax?: string | null
    email?: string | null
    nif?: string | null
    rc?: string | null
    nis?: string | null
    artImposition?: string | null
    bankAccount?: string | null
    logo?: string | null
    headerText?: string | null
}

export interface PDFSalesOrder {
    id: string
    receiptNumber?: string | null
    type: string // QUOTE, ORDER, INVOICE, CREDIT_NOTE
    status: string
    paymentMethod: string
    subtotal: number | string
    tvaAmount: number | string
    stampTax: number | string
    total: number | string
    createdAt: string | Date
    customer: PDFCustomer
    items: PDFItem[]
}

// ─── Number to French Words (reused from print-templates) ─────────────────

const numberToFrenchWords = (num: number): string => {
    if (num === 0) return "zéro"
    const ones = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"]
    function convertGroup(n: number): string {
        let str = ""
        const c = Math.floor(n / 100)
        const r = n % 100
        if (c > 0) {
            if (c === 1) str += "cent "
            else str += ones[c] + " cent" + (r === 0 ? "s " : " ")
        }
        if (r > 0) {
            if (r < 20) str += ones[r] + " "
            else {
                const d = Math.floor(r / 10)
                const u = r % 10
                if (d === 7 || d === 9) {
                    str += tens[d - 1] + (u === 1 && d === 7 ? " et " : "-") + ones[10 + u] + " "
                } else {
                    str += tens[d] + (u === 1 ? " et un" : (u > 0 ? "-" + ones[u] : (d === 8 ? "s" : ""))) + " "
                }
            }
        }
        return str.trim()
    }
    let result = ""
    let n = Math.floor(num)
    if (n >= 1000000) {
        const m = Math.floor(n / 1000000)
        result += (m === 1 ? "un million " : convertGroup(m) + " millions ")
        n %= 1000000
    }
    if (n >= 1000) {
        const k = Math.floor(n / 1000)
        result += (k === 1 ? "mille " : convertGroup(k) + " mille ")
        n %= 1000
    }
    if (n > 0 || result === "") result += convertGroup(n)
    const centimes = Math.round((num - Math.floor(num)) * 100)
    if (centimes > 0) {
        result = result.trim() + " dinars et " + convertGroup(centimes) + " centimes"
    } else {
        result = result.trim() + " dinars"
    }
    return result.charAt(0).toUpperCase() + result.slice(1)
}

const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: Date | string) => {
    const date = new Date(d)
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

// ─── Document Type Config ─────────────────────────────────────────────────

const DOC_CONFIG: Record<string, { title: string; prefix: string; color: [number, number, number] }> = {
    INVOICE: { title: "FACTURE", prefix: "FA", color: [79, 70, 229] },       // indigo
    ORDER: { title: "BON DE LIVRAISON", prefix: "BL", color: [16, 185, 129] }, // emerald
    QUOTE: { title: "DEVIS / PROFORMA", prefix: "DE", color: [245, 158, 11] }, // amber
    CREDIT_NOTE: { title: "AVOIR", prefix: "AV", color: [239, 68, 68] },      // red
}

// ─── Main PDF Generator ───────────────────────────────────────────────────

export async function generateSalesOrderPDF(
    salesOrder: PDFSalesOrder,
    store: PDFStore | null
): Promise<Buffer> {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const config = DOC_CONFIG[salesOrder.type] || DOC_CONFIG.ORDER
    const [r, g, b] = config.color
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = 0

    // ── Accent strip ──
    doc.setFillColor(r, g, b)
    doc.rect(0, 0, pageWidth, 4, "F")
    y = 12

    // ── Company name ──
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(store?.name || "VOTRE SOCIÉTÉ", margin, y)
    if (store?.activity) {
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100)
        doc.text(store.activity, margin, y + 5)
    }

    // ── Document type badge (right side) ──
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(r, g, b)
    doc.text(config.title, pageWidth - margin, y, { align: "right" })

    const receiptNum = salesOrder.receiptNumber || `${config.prefix}-${salesOrder.id.slice(-6)}`
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60)
    doc.text(`N° ${receiptNum}`, pageWidth - margin, y + 6, { align: "right" })
    doc.text(fmtDate(salesOrder.createdAt), pageWidth - margin, y + 11, { align: "right" })

    if (salesOrder.type === "QUOTE") {
        const validDate = new Date(salesOrder.createdAt)
        validDate.setDate(validDate.getDate() + 30)
        doc.setFontSize(8)
        doc.text(`Validité : ${validDate.toLocaleDateString("fr-FR")}`, pageWidth - margin, y + 16, { align: "right" })
    }

    y += 24

    // ── Separator ──
    doc.setDrawColor(220)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    // ── Two columns: Customer (left) + Store details (right) ──
    const colW = (pageWidth - margin * 2 - 10) / 2

    // Customer box
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(margin, y, colW, 36, 2, 2, "F")
    doc.setFontSize(7)
    doc.setTextColor(r, g, b)
    doc.setFont("helvetica", "bold")
    const custLabel = salesOrder.type === "INVOICE" ? "Facturé à" : salesOrder.type === "ORDER" ? "Livré à" : "Destinataire"
    doc.text(custLabel, margin + 4, y + 5)
    doc.setFontSize(10)
    doc.setTextColor(30)
    doc.text(salesOrder.customer.name, margin + 4, y + 11)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)
    let cy = y + 16
    if (salesOrder.customer.address) { doc.text(salesOrder.customer.address, margin + 4, cy); cy += 4 }
    if (salesOrder.customer.phone) { doc.text(`Tél: ${salesOrder.customer.phone}`, margin + 4, cy); cy += 4 }
    const fiscalParts: string[] = []
    if (salesOrder.customer.nif || salesOrder.customer.taxId) fiscalParts.push(`NIF: ${salesOrder.customer.nif || salesOrder.customer.taxId}`)
    if (salesOrder.customer.rc) fiscalParts.push(`RC: ${salesOrder.customer.rc}`)
    if (salesOrder.customer.nis) fiscalParts.push(`NIS: ${salesOrder.customer.nis}`)
    if (fiscalParts.length) { doc.setFontSize(7); doc.text(fiscalParts.join("  |  "), margin + 4, cy) }

    // Store details box
    const sx = margin + colW + 10
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(sx, y, colW, 36, 2, 2, "F")
    doc.setFontSize(7)
    doc.setTextColor(r, g, b)
    doc.setFont("helvetica", "bold")
    doc.text("Nos coordonnées", sx + 4, y + 5)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)
    let sy = y + 11
    const storeLines: string[] = []
    if (store?.address) storeLines.push(store.address)
    if (store?.phone) storeLines.push(`Tél: ${store.phone}`)
    if (store?.fax) storeLines.push(`Fax: ${store.fax}`)
    if (store?.email) storeLines.push(`Email: ${store.email}`)
    if (store?.nif) storeLines.push(`NIF: ${store.nif}`)
    if (store?.rc) storeLines.push(`RC: ${store.rc}`)
    if (store?.nis) storeLines.push(`NIS: ${store.nis}`)
    if (store?.bankAccount) storeLines.push(`RIB: ${store.bankAccount}`)
    storeLines.forEach(line => { doc.text(line, sx + 4, sy); sy += 3.5 })

    y += 42

    // ── Items Table ──
    const subtotalHT = Number(salesOrder.subtotal)
    const totalTVA = Number(salesOrder.tvaAmount)
    const stampTax = Number(salesOrder.stampTax)
    const totalTTC = Number(salesOrder.total)

    const isInvoiceOrQuote = salesOrder.type === "INVOICE" || salesOrder.type === "QUOTE" || salesOrder.type === "CREDIT_NOTE"
    const tableHead = isInvoiceOrQuote
        ? [["N°", "Désignation", "Qté", "P.U HT (DA)", "TVA %", "Montant HT (DA)"]]
        : [["N°", "Désignation", "Qté", "P.U (DA)", "Montant (DA)"]]

    const tableBody = salesOrder.items.map((item, i) => {
        const rate = Number(item.tvaRate ?? 0)
        const ht = Number(item.priceHt) || Number(item.unitPrice) / (1 + rate / 100)
        const lineHT = item.quantity * ht
        if (isInvoiceOrQuote) {
            return [
                String(i + 1).padStart(2, "0"),
                item.product.name,
                String(item.quantity),
                fmt(ht),
                `${rate}%`,
                fmt(lineHT)
            ]
        } else {
            const lineTotal = item.quantity * Number(item.unitPrice)
            return [
                String(i + 1).padStart(2, "0"),
                item.product.name,
                String(item.quantity),
                fmt(Number(item.unitPrice)),
                fmt(lineTotal)
            ]
        }
    })

    autoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: {
            fillColor: [r, g, b],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 7.5,
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        columnStyles: isInvoiceOrQuote
            ? { 0: { halign: "center", cellWidth: 10 }, 2: { halign: "center", cellWidth: 12 }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "center", cellWidth: 16 }, 5: { halign: "right", cellWidth: 30 } }
            : { 0: { halign: "center", cellWidth: 10 }, 2: { halign: "center", cellWidth: 12 }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "right", cellWidth: 30 } },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8

    // ── TVA Breakdown (for invoice/quote) ──
    if (isInvoiceOrQuote) {
        const tvaBreakdown: Record<number, { base: number; amount: number }> = {}
        salesOrder.items.forEach(item => {
            const rate = Number(item.tvaRate ?? 0)
            const ht = Number(item.priceHt) || Number(item.unitPrice) / (1 + rate / 100)
            const htLine = item.quantity * ht
            const tva = htLine * (rate / 100)
            if (!tvaBreakdown[rate]) tvaBreakdown[rate] = { base: 0, amount: 0 }
            tvaBreakdown[rate].base += htLine
            tvaBreakdown[rate].amount += tva
        })

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(60)
        doc.text("Récapitulatif TVA", margin, y)
        y += 4

        autoTable(doc, {
            startY: y,
            head: [["Taux", "Base HT", "Montant TVA"]],
            body: Object.entries(tvaBreakdown).map(([rate, data]) => [
                `${rate}%`, fmt(data.base), fmt(data.amount)
            ]),
            margin: { left: margin, right: pageWidth / 2 + 10 },
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [240, 240, 245], textColor: 60, fontStyle: "bold" },
            tableWidth: 70,
        })
    }

    // ── Totals box (right side) ──
    const totalsX = pageWidth - margin - 65
    const totalsW = 65
    const totalsY = y - 2

    doc.setFillColor(248, 249, 250)
    doc.roundedRect(totalsX, totalsY, totalsW, stampTax > 0 ? 32 : 26, 2, 2, "F")

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)
    let ty = totalsY + 6
    doc.text("Total HT", totalsX + 4, ty)
    doc.text(fmt(subtotalHT), totalsX + totalsW - 4, ty, { align: "right" })
    ty += 5
    doc.text("TVA", totalsX + 4, ty)
    doc.text(fmt(totalTVA), totalsX + totalsW - 4, ty, { align: "right" })
    if (stampTax > 0) {
        ty += 5
        doc.text("Droit de Timbre", totalsX + 4, ty)
        doc.text(fmt(stampTax), totalsX + totalsW - 4, ty, { align: "right" })
    }
    ty += 6
    doc.setFillColor(r, g, b)
    doc.roundedRect(totalsX, ty - 3, totalsW, 9, 1, 1, "F")
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255)
    doc.text("NET À PAYER", totalsX + 4, ty + 3)
    doc.text(`${fmt(totalTTC)} DA`, totalsX + totalsW - 4, ty + 3, { align: "right" })

    // ── Amount in words ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterTvaTable = (doc as any).lastAutoTable?.finalY || y
    const wordsY = Math.max(afterTvaTable + 6, ty + 14)
    doc.setFontSize(7)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(80)
    const wordsLabel = salesOrder.type === "QUOTE"
        ? "Arrêté le présent devis à la somme de :"
        : "Arrêtée la présente facture à la somme de :"
    doc.text(wordsLabel, margin, wordsY)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40)
    doc.text(numberToFrenchWords(totalTTC), margin, wordsY + 4)

    if (salesOrder.paymentMethod) {
        const methodLabels: Record<string, string> = {
            CASH: "Espèces", CHECK: "Chèque", TRANSFER: "Virement",
            CARD: "Carte bancaire", TERM: "À terme"
        }
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(80)
        doc.text(`Mode de règlement : ${methodLabels[salesOrder.paymentMethod] || salesOrder.paymentMethod}`, margin, wordsY + 9)
    }

    // ── Proforma notice ──
    if (salesOrder.type === "QUOTE") {
        doc.setFontSize(7)
        doc.setFont("helvetica", "italic")
        doc.setTextColor(120)
        doc.text("Note : Ce document est un devis estimatif et ne constitue pas une facture. Validité 30 jours.", margin, wordsY + 14)
    }

    // ── Signatures ──
    const sigY = Math.min(wordsY + 22, 255)
    doc.setDrawColor(200)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)

    // Left signature
    doc.text("Signature du Client", margin + 15, sigY, { align: "center" })
    doc.line(margin, sigY + 2, margin + 55, sigY + 2)

    // Right signature
    doc.text("Cachet & Signature", pageWidth - margin - 25, sigY, { align: "center" })
    doc.line(pageWidth - margin - 55, sigY + 2, pageWidth - margin, sigY + 2)

    // ── Footer bar ──
    const footerY = doc.internal.pageSize.getHeight() - 8
    doc.setFillColor(r, g, b)
    doc.rect(0, footerY - 2, pageWidth, 10, "F")
    doc.setFontSize(6)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(255)
    const footerText = store?.headerText || `${store?.name || "SYNCLOUDPOS"} — ${store?.address || ""}${store?.phone ? " | Tél: " + store.phone : ""}${store?.nif ? " | NIF: " + store.nif : ""}`
    doc.text(footerText, pageWidth / 2, footerY + 2, { align: "center" })

    // ── Return as Buffer ──
    const arrayBuffer = doc.output("arraybuffer")
    return Buffer.from(arrayBuffer)
}
