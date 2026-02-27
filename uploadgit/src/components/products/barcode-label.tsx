"use client"

import { forwardRef } from "react"
import Barcode from "react-barcode"

interface BarcodeLabelProps {
    productName: string
    price: number
    barcodeValue: string
    size: "4x2" | "4.5x3.5" | "5x3"
}

export const BarcodeLabel = forwardRef<HTMLDivElement, BarcodeLabelProps>(
    ({ productName, price, barcodeValue, size }, ref) => {

        const isSmall = size === "4x2";
        const isLarge = size === "5x3";

        let containerClass = 'w-[4.5cm] h-[3.5cm]'; // Default standard
        let titleClass = 'text-[10px] leading-tight mb-1';
        let barcodeScale = 'scale-[0.7] -my-2';
        let priceClass = 'text-[16px] leading-tight font-black mt-1'; // Bigger price

        if (isSmall) {
            containerClass = 'w-[4cm] h-[2cm]';
            titleClass = 'text-[8px] leading-tight mb-0.5';
            barcodeScale = 'scale-[0.55] -my-3';
            priceClass = 'text-[14px] leading-tight font-extrabold mt-0.5'; // Bigger price
        } else if (isLarge) {
            containerClass = 'w-[5cm] h-[3cm]';
            titleClass = 'text-[12px] leading-tight mb-1';
            barcodeScale = 'scale-[0.8] -my-1';
            priceClass = 'text-[18px] leading-tight font-black mt-1.5'; // Bigger price
        }

        return (
            <div
                ref={ref}
                className={`bg-white text-black flex flex-col items-center justify-center p-1 font-sans ${containerClass}`}
                style={{
                    pageBreakAfter: "always",
                    margin: 0,
                    boxSizing: "border-box",
                }}
            >
                <div className={`font-bold text-center w-full truncate ${titleClass}`}>
                    {productName}
                </div>

                <div className={`flex items-center justify-center ${barcodeScale}`}>
                    <Barcode
                        value={barcodeValue}
                        format="CODE128"
                        width={2}
                        height={40}
                        fontSize={14}
                        margin={0}
                        displayValue={true}
                        background="transparent"
                    />
                </div>

                <div className={`text-center ${priceClass}`}>
                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)} DA
                </div>
            </div>
        )
    }
)
BarcodeLabel.displayName = "BarcodeLabel"
