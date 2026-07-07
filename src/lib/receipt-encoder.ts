/**
 * ESC/POS receipt encoder for BLE thermal printers.
 * Converts receipt/BL/warranty data into raw ESC/POS byte arrays.
 */

// ─── ESC/POS Command Constants ───────────────────────────────────────
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

const CMD = {
    INIT: [ESC, 0x40],                    // ESC @ — Initialize
    ALIGN_LEFT: [ESC, 0x61, 0x00],        // ESC a 0
    ALIGN_CENTER: [ESC, 0x61, 0x01],      // ESC a 1
    ALIGN_RIGHT: [ESC, 0x61, 0x02],       // ESC a 2
    BOLD_ON: [ESC, 0x45, 0x01],           // ESC E 1
    BOLD_OFF: [ESC, 0x45, 0x00],          // ESC E 0
    DOUBLE_SIZE: [GS, 0x21, 0x11],        // GS ! 0x11 — Double width+height
    NORMAL_SIZE: [GS, 0x21, 0x00],        // GS ! 0x00
    WIDE_TEXT: [GS, 0x21, 0x10],          // GS ! 0x10 — Double width only
    TALL_TEXT: [GS, 0x21, 0x01],          // GS ! 0x01 — Double height only
    UNDERLINE_ON: [ESC, 0x2D, 0x01],      // ESC - 1
    UNDERLINE_OFF: [ESC, 0x2D, 0x00],     // ESC - 0
    CUT_PARTIAL: [GS, 0x56, 0x42, 0x03], // GS V 66 3 — Partial cut
    CUT_FULL: [GS, 0x56, 0x00],          // GS V 0 — Full cut
    FEED_3: [ESC, 0x64, 0x03],           // ESC d 3 — Feed 3 lines
    FEED_5: [ESC, 0x64, 0x05],           // ESC d 5 — Feed 5 lines
} as const

// ─── Types ───────────────────────────────────────────────────────────
export interface ReceiptItem {
    name: string
    quantity: number
    price: number
    serialNumber?: string
    discountAmount?: number
    discountLabel?: string
}

export interface ReceiptData {
    storeName: string
    storeAddress?: string
    storePhone?: string
    orderId: string
    date: Date
    items: ReceiptItem[]
    total: number
    stampTax?: number
    rounding?: number
    customerName?: string
    paidAmount?: number
    previousBalance?: number
    newBalance?: number
    paperWidth?: "58mm" | "80mm"
}

export interface BLData {
    storeName: string
    storeAddress?: string
    storePhone?: string
    orderId: string
    date: Date
    items: ReceiptItem[]
    total: number
    customerName?: string
    paperWidth?: "58mm" | "80mm"
}

export interface WarrantyData {
    storeName: string
    storePhone?: string
    orderId: string
    date: Date
    items: { name: string; serialNumber?: string; warrantyDuration?: string }[]
    customerName?: string
    paperWidth?: "58mm" | "80mm"
}

// ─── Helpers ─────────────────────────────────────────────────────────
const encoder = new TextEncoder()

function getLineWidth(paperWidth: "58mm" | "80mm"): number {
    return paperWidth === "58mm" ? 32 : 48
}

function text(str: string): number[] {
    return Array.from(encoder.encode(str))
}

function line(str: string): number[] {
    return [...text(str), LF]
}

function separator(width: number, char = "-"): number[] {
    return line(char.repeat(width))
}

function padLine(left: string, right: string, width: number): number[] {
    const padding = width - left.length - right.length
    if (padding <= 0) {
        return line(left.substring(0, width - right.length - 1) + " " + right)
    }
    return line(left + " ".repeat(padding) + right)
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount) + " DA"
}

function wrapText(str: string, maxWidth: number): string[] {
    const words = str.split(" ")
    const lines: string[] = []
    let current = ""
    for (const word of words) {
        if (current.length + word.length + 1 > maxWidth) {
            if (current) lines.push(current)
            current = word
        } else {
            current = current ? current + " " + word : word
        }
    }
    if (current) lines.push(current)
    return lines
}

// ─── Encoders ────────────────────────────────────────────────────────

/**
 * Encode a receipt (Ticket de Caisse) into ESC/POS bytes.
 */
export function encodeReceipt(data: ReceiptData): Uint8Array {
    const w = getLineWidth(data.paperWidth || "80mm")
    const bytes: number[] = []

    // Initialize
    bytes.push(...CMD.INIT)

    // ── Header ──
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...CMD.BOLD_ON)
    bytes.push(...CMD.DOUBLE_SIZE)
    bytes.push(...line(data.storeName))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(...CMD.BOLD_OFF)

    if (data.storeAddress) bytes.push(...line(data.storeAddress))
    if (data.storePhone) bytes.push(...line(data.storePhone))
    bytes.push(LF)

    bytes.push(...CMD.BOLD_ON)
    bytes.push(...line("TICKET DE CAISSE"))
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...CMD.ALIGN_LEFT)
    bytes.push(...separator(w))

    // ── Order info ──
    bytes.push(...padLine("N°:", data.orderId, w))
    bytes.push(...padLine("Date:", formatDate(data.date), w))
    if (data.customerName) {
        bytes.push(...padLine("Client:", data.customerName, w))
    }
    bytes.push(...separator(w))

    // ── Items ──
    for (const item of data.items) {
        const nameLines = wrapText(item.name, w - 12)
        const priceStr = formatCurrency(item.price * item.quantity)
        const qtyStr = `x${item.quantity}`

        // First line: name + qty + price
        bytes.push(...padLine(
            nameLines[0] + " " + qtyStr,
            priceStr,
            w
        ))
        // Wrapped name lines
        for (let i = 1; i < nameLines.length; i++) {
            bytes.push(...line("  " + nameLines[i]))
        }
        if (item.serialNumber) {
            bytes.push(...line("  SN: " + item.serialNumber))
        }
        if (item.discountAmount && item.discountAmount > 0) {
            bytes.push(...padLine(
                "  " + (item.discountLabel || "Remise"),
                "-" + formatCurrency(item.discountAmount),
                w
            ))
        }
    }
    bytes.push(...separator(w))

    // ── Totals ──
    bytes.push(...CMD.BOLD_ON)
    if (data.stampTax && data.stampTax > 0) {
        bytes.push(...padLine("Timbre:", formatCurrency(data.stampTax), w))
    }
    if (data.rounding && data.rounding !== 0) {
        bytes.push(...padLine("Arrondi:", formatCurrency(data.rounding), w))
    }
    bytes.push(...CMD.DOUBLE_SIZE)
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...line("TOTAL: " + formatCurrency(data.total + (data.stampTax || 0) + (data.rounding || 0))))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...CMD.ALIGN_LEFT)

    // ── Payment info ──
    if (data.paidAmount !== undefined) {
        bytes.push(...separator(w))
        bytes.push(...padLine("Payé:", formatCurrency(data.paidAmount), w))
        if (data.previousBalance !== undefined) {
            bytes.push(...padLine("Ancien solde:", formatCurrency(data.previousBalance), w))
        }
        if (data.newBalance !== undefined) {
            bytes.push(...CMD.BOLD_ON)
            bytes.push(...padLine("Nouveau solde:", formatCurrency(data.newBalance), w))
            bytes.push(...CMD.BOLD_OFF)
        }
    }

    // ── Footer ──
    bytes.push(LF)
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...line("Merci pour votre achat!"))
    bytes.push(...CMD.ALIGN_LEFT)
    bytes.push(...CMD.FEED_5)
    bytes.push(...CMD.CUT_PARTIAL)

    return new Uint8Array(bytes)
}

/**
 * Encode a Bon de Livraison into ESC/POS bytes.
 */
export function encodeBonLivraison(data: BLData): Uint8Array {
    const w = getLineWidth(data.paperWidth || "80mm")
    const bytes: number[] = []

    bytes.push(...CMD.INIT)

    // ── Header ──
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...CMD.BOLD_ON)
    bytes.push(...CMD.DOUBLE_SIZE)
    bytes.push(...line(data.storeName))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(...CMD.BOLD_OFF)

    if (data.storeAddress) bytes.push(...line(data.storeAddress))
    if (data.storePhone) bytes.push(...line(data.storePhone))
    bytes.push(LF)

    bytes.push(...CMD.BOLD_ON)
    bytes.push(...CMD.WIDE_TEXT)
    bytes.push(...line("BON DE LIVRAISON"))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...CMD.ALIGN_LEFT)
    bytes.push(...separator(w, "="))

    // ── Info ──
    bytes.push(...padLine("BL N°:", data.orderId, w))
    bytes.push(...padLine("Date:", formatDate(data.date), w))
    if (data.customerName) {
        bytes.push(...padLine("Client:", data.customerName, w))
    }
    bytes.push(...separator(w, "="))

    // ── Column headers ──
    bytes.push(...CMD.BOLD_ON)
    bytes.push(...padLine("Article", "Qte   Prix", w))
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...separator(w))

    // ── Items ──
    for (const item of data.items) {
        const nameLines = wrapText(item.name, w - 16)
        const qtyStr = String(item.quantity).padStart(3)
        const priceStr = formatCurrency(item.price * item.quantity)

        bytes.push(...padLine(nameLines[0], qtyStr + " " + priceStr, w))
        for (let i = 1; i < nameLines.length; i++) {
            bytes.push(...line("  " + nameLines[i]))
        }
        if (item.serialNumber) {
            bytes.push(...line("  SN: " + item.serialNumber))
        }
    }
    bytes.push(...separator(w, "="))

    // ── Total ──
    bytes.push(...CMD.BOLD_ON)
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...CMD.DOUBLE_SIZE)
    bytes.push(...line("TOTAL: " + formatCurrency(data.total)))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...CMD.ALIGN_LEFT)

    // ── Signature ──
    bytes.push(LF)
    bytes.push(...separator(w))
    const sigLeft = "Vendeur:"
    const sigRight = "Client:"
    bytes.push(...padLine(sigLeft, sigRight, w))
    bytes.push(LF, LF, LF)
    bytes.push(...padLine("__________", "__________", w))

    bytes.push(...CMD.FEED_5)
    bytes.push(...CMD.CUT_PARTIAL)

    return new Uint8Array(bytes)
}

/**
 * Encode a Bon de Garantie into ESC/POS bytes.
 */
export function encodeBonGarantie(data: WarrantyData): Uint8Array {
    const w = getLineWidth(data.paperWidth || "80mm")
    const bytes: number[] = []

    bytes.push(...CMD.INIT)

    // ── Header ──
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...CMD.BOLD_ON)
    bytes.push(...CMD.DOUBLE_SIZE)
    bytes.push(...line(data.storeName))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(LF)
    bytes.push(...CMD.WIDE_TEXT)
    bytes.push(...line("BON DE GARANTIE"))
    bytes.push(...CMD.NORMAL_SIZE)
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...CMD.ALIGN_LEFT)
    bytes.push(...separator(w, "="))

    // ── Info ──
    bytes.push(...padLine("N°:", data.orderId, w))
    bytes.push(...padLine("Date:", formatDate(data.date), w))
    if (data.customerName) {
        bytes.push(...padLine("Client:", data.customerName, w))
    }
    if (data.storePhone) {
        bytes.push(...padLine("Tel:", data.storePhone, w))
    }
    bytes.push(...separator(w, "="))

    // ── Items with warranty ──
    for (const item of data.items) {
        bytes.push(...CMD.BOLD_ON)
        const nameLines = wrapText(item.name, w)
        for (const l of nameLines) {
            bytes.push(...line(l))
        }
        bytes.push(...CMD.BOLD_OFF)
        if (item.serialNumber) {
            bytes.push(...line("  N/S: " + item.serialNumber))
        }
        if (item.warrantyDuration) {
            bytes.push(...line("  Garantie: " + item.warrantyDuration))
        }
        bytes.push(...separator(w))
    }

    // ── Terms ──
    bytes.push(LF)
    bytes.push(...CMD.ALIGN_CENTER)
    bytes.push(...CMD.BOLD_ON)
    bytes.push(...line("CONDITIONS DE GARANTIE"))
    bytes.push(...CMD.BOLD_OFF)
    bytes.push(...CMD.ALIGN_LEFT)

    const terms = [
        "Conservez ce bon comme preuve de garantie.",
        "La garantie couvre les defauts de fabrication.",
        "La garantie ne couvre pas les dommages physiques.",
    ]
    for (const term of terms) {
        const lines = wrapText("- " + term, w)
        for (const l of lines) {
            bytes.push(...line(l))
        }
    }

    bytes.push(...CMD.FEED_5)
    bytes.push(...CMD.CUT_PARTIAL)

    return new Uint8Array(bytes)
}

// ─── Date formatter ──────────────────────────────────────────────────
function formatDate(date: Date): string {
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}
