"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, Star } from "lucide-react"
import { useState, useEffect } from "react"

interface LoyaltyBadgeModalProps {
    isOpen: boolean
    onClose: () => void
    customer: {
        id: string
        name: string
        phone?: string | null
        barcode?: string | null
        loyaltyPoints?: number
    }
    storeName?: string
}

type CardModel = "violet" | "dark" | "ocean"

const STORAGE_KEY = "pos_printing_prefs"

// Generate a simple barcode SVG using Code128-like rendering
function generateBarcodeSvg(code: string, lineColor = "black"): string {
    const barWidth = 2
    const height = 60
    const chars = code.split("").map(c => c.charCodeAt(0))
    let x = 10
    let bars = ""
    bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="${lineColor}"/>`
    x += barWidth + barWidth
    bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="${lineColor}"/>`
    x += barWidth * 2

    for (const charCode of chars) {
        const binary = charCode.toString(2).padStart(8, "0")
        for (const bit of binary) {
            if (bit === "1") {
                bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="${lineColor}"/>`
            }
            x += barWidth
        }
        x += barWidth
    }

    bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="${lineColor}"/>`
    x += barWidth + barWidth
    bars += `<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="${lineColor}"/>`
    x += barWidth * 3

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${x + 10}" height="${height + 20}">
        ${bars}
        <text x="${(x + 10) / 2}" y="${height + 16}" text-anchor="middle" font-family="monospace" font-size="10" fill="${lineColor}">${code}</text>
    </svg>`
}

/* ═══════════════════════════════════════════════════════════════════════
   CARD THEME DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════ */
const THEMES: Record<CardModel, {
    bg: string
    accentColor: string
    badgeBg: string
    badgeBorder: string
    badgeText: string
    chipBg: string
    chipBorder: string
    circle1: string
    circle2: string
    storeOpacity: number
}> = {
    violet: {
        bg: "linear-gradient(135deg, #1e0e3e 0%, #3b1f6a 50%, #5b21b6 100%)",
        accentColor: "#ffd700",
        badgeBg: "rgba(255,200,0,0.2)",
        badgeBorder: "rgba(255,200,0,0.4)",
        badgeText: "#ffd700",
        chipBg: "rgba(255,200,0,0.15)",
        chipBorder: "rgba(255,200,0,0.3)",
        circle1: "rgba(255,255,255,0.05)",
        circle2: "rgba(255,255,255,0.04)",
        storeOpacity: 0.7,
    },
    dark: {
        bg: "linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #1e293b 100%)",
        accentColor: "#60a5fa",
        badgeBg: "rgba(96,165,250,0.15)",
        badgeBorder: "rgba(96,165,250,0.3)",
        badgeText: "#93c5fd",
        chipBg: "rgba(96,165,250,0.12)",
        chipBorder: "rgba(96,165,250,0.25)",
        circle1: "rgba(96,165,250,0.06)",
        circle2: "rgba(96,165,250,0.04)",
        storeOpacity: 0.5,
    },
    ocean: {
        bg: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #0ea5e9 100%)",
        accentColor: "#fbbf24",
        badgeBg: "rgba(251,191,36,0.2)",
        badgeBorder: "rgba(251,191,36,0.4)",
        badgeText: "#fde68a",
        chipBg: "rgba(251,191,36,0.15)",
        chipBorder: "rgba(251,191,36,0.3)",
        circle1: "rgba(255,255,255,0.08)",
        circle2: "rgba(255,255,255,0.05)",
        storeOpacity: 0.7,
    },
}

const THEME_LABELS: Record<CardModel, string> = {
    violet: "Violet",
    dark: "Noir Premium",
    ocean: "Océan",
}

/* ═══════════════════════════════════════════════════════════════════════
   PRINT HTML GENERATOR
   ═══════════════════════════════════════════════════════════════════════ */
function buildPrintHTML(
    customer: LoyaltyBadgeModalProps["customer"],
    storeName: string,
    barcodeSvg: string,
    badgeCode: string,
    theme: typeof THEMES[CardModel]
): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Carte Fidélité - ${customer.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        @media print { body { margin: 0; } .no-print { display: none; } }
        .card {
            width: 85.6mm; height: 53.98mm;
            background: ${theme.bg};
            border-radius: 8px; overflow: hidden; position: relative;
            display: flex; flex-direction: column; justify-content: space-between;
            padding: 10px 12px 8px; color: white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .card::before { content:''; position:absolute; top:-30px; right:-30px; width:120px; height:120px; border-radius:50%; background:${theme.circle1}; }
        .card::after { content:''; position:absolute; bottom:-20px; left:-20px; width:80px; height:80px; border-radius:50%; background:${theme.circle2}; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; }
        .store-name { font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; opacity:${theme.storeOpacity}; }
        .loyalty-badge { background:${theme.badgeBg}; border:1px solid ${theme.badgeBorder}; border-radius:20px; padding:2px 8px; font-size:8px; font-weight:600; color:${theme.badgeText}; letter-spacing:1px; }
        .stars { font-size:10px; }
        .middle { flex:1; display:flex; flex-direction:column; justify-content:center; }
        .customer-name { font-size:14px; font-weight:900; letter-spacing:0.5px; margin-bottom:2px; }
        .customer-phone { font-size:8px; opacity:0.6; }
        .points-chip { display:inline-flex; align-items:center; gap:4px; background:${theme.chipBg}; border:1px solid ${theme.chipBorder}; border-radius:20px; padding:2px 8px; margin-top:4px; width:fit-content; }
        .points-value { font-size:11px; font-weight:900; color:${theme.accentColor}; }
        .points-label { font-size:7px; color:${theme.accentColor}; opacity:0.7; text-transform:uppercase; letter-spacing:1px; }
        .points-star { font-size:10px; color:${theme.accentColor}; }
        .footer { display:flex; flex-direction:column; align-items:center; gap:2px; }
        .barcode-container { background:white; border-radius:4px; padding:4px 8px 2px; display:flex; flex-direction:column; align-items:center; }
        .barcode-container svg { max-width:160px; height:32px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div>
                <div class="store-name">${storeName}</div>
                <div class="stars">⭐⭐⭐</div>
            </div>
            <div class="loyalty-badge">CARTE FIDÉLITÉ</div>
        </div>
        <div class="middle">
            <div class="customer-name">${customer.name}</div>
            ${customer.phone ? `<div class="customer-phone">${customer.phone}</div>` : ""}
            <div class="points-chip">
                <span class="points-star">★</span>
                <span class="points-value">${(customer.loyaltyPoints || 0).toLocaleString("fr-FR")}</span>
                <span class="points-label">points</span>
            </div>
        </div>
        <div class="footer">
            <div class="barcode-container">${barcodeSvg}</div>
        </div>
    </div>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }</script>
</body>
</html>`
}

/* ═══════════════════════════════════════════════════════════════════════
   MODAL COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export const LoyaltyBadgeModal = ({ isOpen, onClose, customer, storeName }: LoyaltyBadgeModalProps) => {
    const badgeCode = customer.barcode || customer.id.slice(0, 12).toUpperCase()
    const barcodeSvg = generateBarcodeSvg(badgeCode)

    const [cardModel, setCardModel] = useState<CardModel>("violet")

    // Load saved preference from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.loyaltyCardModel && THEMES[parsed.loyaltyCardModel as CardModel]) {
                    setCardModel(parsed.loyaltyCardModel as CardModel)
                }
            }
        } catch { /* noop */ }
    }, [])

    const theme = THEMES[cardModel]

    const handlePrint = () => {
        const printWindow = window.open("", "_blank", "width=600,height=400")
        if (!printWindow) return
        printWindow.document.write(buildPrintHTML(customer, storeName || "SyncloudPOS", barcodeSvg, badgeCode, theme))
        printWindow.document.close()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
                <DialogTitle className="sr-only">Carte Fidélité - {customer.name}</DialogTitle>
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        Carte Fidélité
                    </h2>
                </div>

                {/* Template selector pills */}
                <div className="px-4 pt-2 flex items-center gap-2">
                    {(Object.keys(THEMES) as CardModel[]).map(key => (
                        <button
                            key={key}
                            onClick={() => setCardModel(key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                cardModel === key
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {THEME_LABELS[key]}
                        </button>
                    ))}
                </div>

                {/* Badge Preview */}
                <div className="p-6 pt-4 flex justify-center bg-gray-50 dark:bg-gray-900/60">
                    <div
                        className="relative rounded-xl overflow-hidden shadow-2xl"
                        style={{
                            width: 323,
                            height: 204,
                            background: theme.bg,
                            color: "white",
                            padding: "16px 18px 12px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full" style={{ background: theme.circle1 }} />
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full" style={{ background: theme.circle2 }} />

                        {/* Header */}
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <div className="text-[9px] font-bold tracking-widest uppercase" style={{ opacity: theme.storeOpacity }}>{storeName || "SyncloudPOS"}</div>
                                <div className="text-xs mt-0.5">⭐⭐⭐</div>
                            </div>
                            <div
                                className="rounded-full px-2 py-0.5 text-[8px] font-semibold tracking-wide"
                                style={{ background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}`, color: theme.badgeText }}
                            >
                                CARTE FIDÉLITÉ
                            </div>
                        </div>

                        {/* Middle */}
                        <div className="relative z-10">
                            <div className="text-base font-black tracking-tight">{customer.name}</div>
                            {customer.phone && <div className="text-[9px] opacity-60 mt-0.5">{customer.phone}</div>}
                            <div
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 mt-2"
                                style={{ background: theme.chipBg, border: `1px solid ${theme.chipBorder}` }}
                            >
                                <span className="text-xs" style={{ color: theme.accentColor }}>★</span>
                                <span className="font-black text-xs" style={{ color: theme.accentColor }}>{(customer.loyaltyPoints || 0).toLocaleString("fr-FR")}</span>
                                <span className="text-[8px] uppercase tracking-wider" style={{ color: theme.accentColor, opacity: 0.7 }}>points</span>
                            </div>
                        </div>

                        {/* Barcode */}
                        <div className="flex justify-center relative z-10">
                            <div className="bg-white rounded-lg px-3 py-1.5 flex flex-col items-center">
                                <div
                                    className="w-[160px] h-[28px]"
                                    dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                                />
                                <div className="text-[8px] text-black/50 font-mono mt-0.5 tracking-widest">{badgeCode}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Format standard carte bancaire (85.6 × 54 mm)
                    </p>
                    <Button onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
