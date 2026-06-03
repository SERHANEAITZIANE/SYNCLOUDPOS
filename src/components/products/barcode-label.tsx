"use client"

import { forwardRef } from "react"
import Barcode from "react-barcode"

export type BarcodeLabelSize = "4x2" | "4.5x3.5" | "5x3"
export type BarcodeLabelModel = "classic" | "modern" | "elegant" | "retro" | "minimal" | "bold"

interface BarcodeLabelProps {
    productName: string
    price: number
    barcodeValue: string
    size: BarcodeLabelSize
    model?: BarcodeLabelModel
}

// ── size helpers ────────────────────────────────────────────
const sizeMap: Record<BarcodeLabelSize, {
    container: string
    bcHeight: number
    bcWidth: number
    bcFontSize: number
    titleSize: string
    priceSize: string
    bcWrapper: string
}> = {
    "4x2": {
        container: "w-[4cm] h-[2cm] max-w-full max-h-full print:w-[40mm] print:h-[20mm] overflow-hidden box-border border-0 print:m-0 print:p-0",
        bcHeight: 26,
        bcWidth: 0.9,
        bcFontSize: 7,
        titleSize: "text-[7.5px] font-bold leading-tight truncate",
        priceSize: "text-[17px] font-black leading-none",
        bcWrapper: "w-[36mm] print:w-[36mm]",
    },
    "4.5x3.5": {
        container: "w-[4.5cm] h-[3.5cm] max-w-full max-h-full print:w-[45mm] print:h-[35mm] overflow-hidden box-border border-0 print:m-0 print:p-0",
        bcHeight: 45,
        bcWidth: 1.1,
        bcFontSize: 8.5,
        titleSize: "text-[9.5px] font-bold leading-tight truncate",
        priceSize: "text-[22px] font-black leading-none",
        bcWrapper: "w-[41mm] print:w-[41mm]",
    },
    "5x3": {
        container: "w-[5cm] h-[3cm] max-w-full max-h-full print:w-[50mm] print:h-[30mm] overflow-hidden box-border border-0 print:m-0 print:p-0",
        bcHeight: 50,
        bcWidth: 1.3,
        bcFontSize: 9.5,
        titleSize: "text-[10px] font-bold leading-tight truncate",
        priceSize: "text-[26px] font-black leading-none",
        bcWrapper: "w-[46mm] print:w-[46mm]",
    },
}

export const BarcodeLabel = forwardRef<HTMLDivElement, BarcodeLabelProps>(
    ({ productName, price, barcodeValue, size, model = "classic" }, ref) => {
        const s = sizeMap[size]

        const priceFormatted = new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price) + " DA"

        const BcComp = (light = true, _ignoredDisplayValue = false) => (
            <div
                className={`${s.bcWrapper} flex justify-center [&>svg]:w-full [&>svg]:!h-[var(--barcode-height)]`}
                style={{ "--barcode-height": `${s.bcHeight}px` } as any}
            >
                <Barcode
                    value={barcodeValue}
                    format="CODE128"
                    width={s.bcWidth}
                    height={s.bcHeight}
                    fontSize={s.bcFontSize}
                    margin={0}
                    displayValue={false}
                    background="transparent"
                    lineColor={light ? "#000" : "#fff"}
                />
            </div>
        )

        const renderContent = () => {
            switch (model) {
                case "modern":
                    return (
                        <div className={`${s.container} bg-gray-900 text-white flex flex-col items-center justify-between py-1.5 px-2`}>
                            <p className={`${s.titleSize} tracking-widest uppercase opacity-70 truncate w-full text-center`}>{productName}</p>
                            <div className="flex-1 flex items-center justify-center">{BcComp(false, false)}</div>
                            <p className={`${s.priceSize} font-black tracking-wide -mt-1`}>{priceFormatted}</p>
                        </div>
                    )
                case "elegant":
                    return (
                        <div className={`${s.container} bg-white text-black border border-gray-400 flex flex-col p-1.5 justify-between`}>
                            <div className="border-b border-gray-300 pb-0.5 mb-0.5 w-full shrink-0">
                                <p className={`${s.titleSize} font-semibold text-center truncate`}>{productName}</p>
                            </div>
                            <div className="flex-1 flex items-center justify-center">{BcComp(true, false)}</div>
                            <p className={`${s.priceSize} font-black text-center -mt-0.5 shrink-0`}>{priceFormatted}</p>
                        </div>
                    )
                case "retro":
                    return (
                        <div className={`${s.container} bg-amber-50 border border-amber-400 flex flex-col items-center justify-between py-1.5 px-2`}>
                            <p className={`${s.titleSize} font-bold uppercase tracking-wider text-amber-900 truncate w-full text-center`}>{productName}</p>
                            <div className="flex-1 flex items-center justify-center">{BcComp(true, true)}</div>
                            <p className={`${s.priceSize} font-black text-amber-800 -mt-1`}>{priceFormatted}</p>
                        </div>
                    )
                case "minimal":
                    return (
                        <div className={`${s.container} bg-white text-black flex flex-col items-center justify-between py-1.5 px-2`}>
                            <p className={`${s.titleSize} text-gray-500 truncate w-full text-center`}>{productName}</p>
                            <div className="flex-1 flex items-center justify-center">{BcComp(true, true)}</div>
                            <p className={`${s.priceSize} font-black text-center -mt-0.5 shrink-0`}>{priceFormatted}</p>
                        </div>
                    )
                case "bold":
                    return (
                        <div className={`${s.container} bg-white text-black flex flex-col border-t-4 border-black p-1.5 justify-between`}>
                            <p className={`${s.titleSize} font-black uppercase tracking-tighter text-black text-center w-full`}>{productName}</p>
                            <div className="flex-1 flex items-center justify-center">{BcComp(true, false)}</div>
                            <div className="bg-black text-white text-center rounded-sm py-0.5 w-full shrink-0 -mt-1">
                                <p className={`${s.priceSize} font-black tracking-wider`}>{priceFormatted}</p>
                            </div>
                        </div>
                    )
                default: // classic
                    return (
                        <div className={`${s.container} bg-white text-black flex flex-col items-center justify-between py-1.5 px-2`}>
                            <p className={`${s.titleSize} font-bold uppercase text-center truncate w-full`}>{productName}</p>
                            <div className="flex-1 flex items-center justify-center">{BcComp(true, true)}</div>
                            <p className={`${s.priceSize} font-black text-center -mt-1`}>{priceFormatted}</p>
                        </div>
                    )
            }
        }

        return (
            <div
                ref={ref}
                className="barcode-print-item"
                style={{
                    margin: 0,
                    boxSizing: "border-box",
                    fontFamily: "sans-serif",
                }}
            >
                {renderContent()}
            </div>
        )
    }
)
BarcodeLabel.displayName = "BarcodeLabel"
