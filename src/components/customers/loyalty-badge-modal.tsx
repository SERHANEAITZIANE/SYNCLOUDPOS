"use client"

import { useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, Star, X } from "lucide-react"

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

// Generate a simple barcode SVG using Code128-like rendering
function generateBarcodeSvg(code: string): string {
    // Simple visual barcode using alternating bars (not a real standard, for display)
    const barWidth = 2
    const height = 60
    const chars = code.split("").map(c => c.charCodeAt(0))
    let x = 10
    let bars = ""
    // Start guard
    bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`
    x += barWidth + barWidth
    bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`
    x += barWidth * 2

    // Data bars
    for (const charCode of chars) {
        const binary = charCode.toString(2).padStart(8, "0")
        for (const bit of binary) {
            if (bit === "1") {
                bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`
            }
            x += barWidth
        }
        x += barWidth // gap between chars
    }

    // End guard
    bars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`
    x += barWidth + barWidth
    bars += `<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="black"/>`
    x += barWidth * 3

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${x + 10}" height="${height + 20}">
        ${bars}
        <text x="${(x + 10) / 2}" y="${height + 16}" text-anchor="middle" font-family="monospace" font-size="10" fill="black">${code}</text>
    </svg>`
}

export const LoyaltyBadgeModal = ({ isOpen, onClose, customer, storeName }: LoyaltyBadgeModalProps) => {
    const badgeCode = customer.barcode || customer.id.slice(0, 12).toUpperCase()
    const barcodeSvg = generateBarcodeSvg(badgeCode)

    const handlePrint = () => {
        const printWindow = window.open("", "_blank", "width=600,height=400")
        if (!printWindow) return

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Carte Fidélité - ${customer.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        .card {
            width: 85.6mm;
            height: 53.98mm;
            background: linear-gradient(135deg, #1e0e3e 0%, #3b1f6a 50%, #5b21b6 100%);
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 10px 12px 8px;
            color: white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .card::before {
            content: '';
            position: absolute;
            top: -30px; right: -30px;
            width: 120px; height: 120px;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
        }
        .card::after {
            content: '';
            position: absolute;
            bottom: -20px; left: -20px;
            width: 80px; height: 80px;
            border-radius: 50%;
            background: rgba(255,255,255,0.04);
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .store-name { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; }
        .loyalty-badge { background: rgba(255,200,0,0.2); border: 1px solid rgba(255,200,0,0.4); border-radius: 20px; padding: 2px 8px; font-size: 8px; font-weight: 600; color: #ffd700; letter-spacing: 1px; }
        .stars { font-size: 10px; }
        .middle { flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .customer-name { font-size: 14px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
        .customer-phone { font-size: 8px; opacity: 0.6; }
        .points-chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,200,0,0.15); border: 1px solid rgba(255,200,0,0.3); border-radius: 20px; padding: 2px 8px; margin-top: 4px; width: fit-content; }
        .points-value { font-size: 11px; font-weight: 900; color: #ffd700; }
        .points-label { font-size: 7px; color: rgba(255,200,0,0.7); text-transform: uppercase; letter-spacing: 1px; }
        .footer { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .barcode-container { background: white; border-radius: 4px; padding: 4px 8px 2px; display: flex; flex-direction: column; align-items: center; }
        .barcode-container svg { max-width: 160px; height: 32px; }
        .card-number { font-size: 7px; opacity: 0.4; letter-spacing: 2px; margin-top: 2px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div>
                <div class="store-name">${storeName || "SyncloudPOS"}</div>
                <div class="stars">⭐⭐⭐</div>
            </div>
            <div class="loyalty-badge">CARTE FIDÉLITÉ</div>
        </div>
        <div class="middle">
            <div class="customer-name">${customer.name}</div>
            ${customer.phone ? `<div class="customer-phone">${customer.phone}</div>` : ""}
            <div class="points-chip">
                <span style="font-size:10px;">★</span>
                <span class="points-value">${(customer.loyaltyPoints || 0).toLocaleString("fr-FR")}</span>
                <span class="points-label">points</span>
            </div>
        </div>
        <div class="footer">
            <div class="barcode-container">
                ${barcodeSvg}
            </div>
        </div>
    </div>
    <script>
        window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }
    </script>
</body>
</html>`

        printWindow.document.write(html)
        printWindow.document.close()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                <DialogTitle className="sr-only">Carte Fidélité - {customer.name}</DialogTitle>
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        Carte Fidélité
                    </h2>
                </div>

                {/* Badge Preview */}
                <div className="p-6 flex justify-center bg-gray-50 dark:bg-gray-900/60">
                    <div
                        className="relative rounded-xl overflow-hidden shadow-2xl"
                        style={{
                            width: 323, // 85.6mm at 96dpi
                            height: 204, // 53.98mm at 96dpi
                            background: "linear-gradient(135deg, #1e0e3e 0%, #3b1f6a 50%, #5b21b6 100%)",
                            color: "white",
                            padding: "16px 18px 12px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/5" />
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/4" />

                        {/* Header */}
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <div className="text-[9px] font-bold tracking-widest uppercase opacity-70">{storeName || "SyncloudPOS"}</div>
                                <div className="text-xs mt-0.5">⭐⭐⭐</div>
                            </div>
                            <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-full px-2 py-0.5 text-[8px] font-semibold text-yellow-300 tracking-wide">
                                CARTE FIDÉLITÉ
                            </div>
                        </div>

                        {/* Middle */}
                        <div className="relative z-10">
                            <div className="text-base font-black tracking-tight">{customer.name}</div>
                            {customer.phone && <div className="text-[9px] opacity-60 mt-0.5">{customer.phone}</div>}
                            <div className="inline-flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-full px-3 py-0.5 mt-2">
                                <span className="text-yellow-300 text-xs">★</span>
                                <span className="text-yellow-300 font-black text-xs">{(customer.loyaltyPoints || 0).toLocaleString("fr-FR")}</span>
                                <span className="text-yellow-300/70 text-[8px] uppercase tracking-wider">points</span>
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
