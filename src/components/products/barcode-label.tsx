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
}> = {
    "4x2": {
        container: "w-[4cm] h-[2cm]",
        bcHeight: 20,
        bcWidth: 1.0,
        bcFontSize: 7,
        titleSize: "text-[8px]",
        priceSize: "text-[10px]",
    },
    "4.5x3.5": {
        container: "w-[4.5cm] h-[3.5cm]",
        bcHeight: 26,
        bcWidth: 1.2,
        bcFontSize: 9,
        titleSize: "text-[10px]",
        priceSize: "text-[13px]",
    },
    "5x3": {
        container: "w-[5cm] h-[3cm]",
        bcHeight: 28,
        bcWidth: 1.4,
        bcFontSize: 10,
        titleSize: "text-[11px]",
        priceSize: "text-[14px]",
    },
}

export const BarcodeLabel = forwardRef<HTMLDivElement, BarcodeLabelProps>(
    ({ productName, price, barcodeValue, size, model = "classic" }, ref) => {
        const s = sizeMap[size]

        const priceFormatted = new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price) + " DA"

        const BcComp = (light = true, displayValue = true) => (
            <Barcode
                value={barcodeValue}
                format="CODE128"
                width={s.bcWidth}
                height={s.bcHeight}
                fontSize={s.bcFontSize}
                margin={0}
                displayValue={displayValue}
                background="transparent"
                lineColor={light ? "#000" : "#fff"}
            />
        )

        const renderContent = () => {
            switch (model) {
                case "modern":
                    return (
                        <div className={`${s.container} bg-gray-900 text-white flex flex-col items-center justify-center p-1`}>
                            <p className={`${s.titleSize} tracking-widest uppercase opacity-70 truncate w-full text-center`}>{productName}</p>
                            {BcComp(false, false)}
                            <p className={`${s.priceSize} font-black tracking-wide mt-0.5`}>{priceFormatted}</p>
                        </div>
                    )
                case "elegant":
                    return (
                        <div className={`${s.container} bg-white text-black border border-gray-400 flex flex-col p-1`}>
                            <div className="flex justify-between items-center border-b border-gray-300 pb-0.5 mb-0.5 w-full">
                                <p className={`${s.titleSize} font-semibold truncate`}>{productName}</p>
                                <p className={`${s.priceSize} font-black shrink-0 ml-1`}>{priceFormatted}</p>
                            </div>
                            <div className="flex items-center justify-center flex-1">{BcComp(true, false)}</div>
                            <p className="text-[6px] text-gray-400 text-center tracking-widest">{barcodeValue}</p>
                        </div>
                    )
                case "retro":
                    return (
                        <div className={`${s.container} bg-amber-50 border border-amber-400 flex flex-col items-center justify-center p-1`}>
                            <p className={`${s.titleSize} font-bold uppercase tracking-wider text-amber-900 truncate w-full text-center`}>{productName}</p>
                            <div>{BcComp(true, true)}</div>
                            <p className={`${s.priceSize} font-black text-amber-800`}>{priceFormatted}</p>
                        </div>
                    )
                case "minimal":
                    return (
                        <div className={`${s.container} bg-white text-black flex flex-col items-center justify-center p-1`}>
                            <div className="flex-1 flex items-center">{BcComp(true, true)}</div>
                            <div className="flex justify-between w-full mt-0.5 px-1">
                                <p className={`${s.titleSize} text-gray-500 truncate`}>{productName}</p>
                                <p className={`${s.titleSize} font-black`}>{priceFormatted}</p>
                            </div>
                        </div>
                    )
                case "bold":
                    return (
                        <div className={`${s.container} bg-white text-black flex flex-col border-t-4 border-black p-1`}>
                            <p className={`${s.titleSize} font-black uppercase tracking-tighter text-black text-center w-full`}>{productName}</p>
                            <div className="flex-1 flex items-center justify-center">{BcComp(true, false)}</div>
                            <div className="bg-black text-white text-center rounded-sm py-0.5 w-full">
                                <p className={`${s.priceSize} font-black tracking-wider`}>{priceFormatted}</p>
                            </div>
                        </div>
                    )
                default: // classic
                    return (
                        <div className={`${s.container} bg-white text-black flex flex-col items-center justify-center p-1`}>
                            <p className={`${s.titleSize} font-bold uppercase text-center truncate w-full`}>{productName}</p>
                            <div>{BcComp(true, true)}</div>
                            <p className={`${s.priceSize} font-black text-center`}>{priceFormatted}</p>
                        </div>
                    )
            }
        }

        return (
            <div
                ref={ref}
                style={{
                    pageBreakAfter: "always",
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
