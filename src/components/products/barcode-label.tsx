"use client"

import { forwardRef } from "react"
import Barcode from "react-barcode"

export type BarcodeLabelSize = "4x2" | "4.5x3.5"
export type BarcodeLabelModel = "simple_40x20" | "side_store_45x35" | "store_40x20"

interface BarcodeLabelProps {
    productName: string
    price: number
    barcodeValue: string
    size?: BarcodeLabelSize
    model?: BarcodeLabelModel
    tenantName?: string
    tenantPhone?: string
}

const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    
    if (cleaned.startsWith("213") && (cleaned.length === 11 || cleaned.length === 12)) {
        const local = "0" + cleaned.slice(3);
        if (local.length === 10) {
            return `${local.slice(0, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
        }
    }
    
    if (cleaned.startsWith("00213") && (cleaned.length === 13 || cleaned.length === 14)) {
        const local = "0" + cleaned.slice(5);
        if (local.length === 10) {
            return `${local.slice(0, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
        }
    }

    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
    }
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`;
    }
    return phone;
}

export const BarcodeLabel = forwardRef<HTMLDivElement, BarcodeLabelProps>(
    ({ productName, price, barcodeValue, model = "simple_40x20", tenantName = "", tenantPhone = "" }, ref) => {
        
        const priceFormatted = new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price) + " DA"

        const renderContent = () => {
            switch (model) {
                case "side_store_45x35": {
                    const phoneFormatted = formatPhone(tenantPhone)
                    return (
                        <div 
                            style={{
                                width: "45mm",
                                height: "35mm",
                                maxWidth: "45mm",
                                maxHeight: "35mm",
                                overflow: "hidden",
                                boxSizing: "border-box",
                                backgroundColor: "#ffffff",
                                color: "#000000",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "stretch",
                                padding: 0,
                                margin: 0
                            }}
                        >
                            {/* Left rotated column - white background, separated by vertical dashed line */}
                            <div 
                                style={{
                                    width: "12mm",
                                    flexShrink: 0,
                                    borderRight: "1px dashed #666666",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    overflow: "hidden",
                                    backgroundColor: "#ffffff",
                                    padding: "2px 0",
                                    boxSizing: "border-box"
                                }}
                            >
                                <div 
                                    style={{
                                        writingMode: "vertical-rl",
                                        transform: "rotate(180deg)",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: "4px",
                                        height: "100%",
                                        maxHeight: "33mm",
                                        width: "100%",
                                        overflow: "hidden"
                                    }}
                                >
                                    {/* Company Name (Line 1, vertical) */}
                                    <div 
                                        style={{
                                            fontSize: "9.5px",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.02em",
                                            color: "#000000",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden"
                                        }}
                                    >
                                        {tenantName || "SYNCLOUDPOS"}
                                    </div>
                                    {/* Phone Number (Line 2, vertical) */}
                                    {phoneFormatted && (
                                        <div 
                                            style={{
                                                fontSize: "9.5px",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.02em",
                                                color: "#000000",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden"
                                            }}
                                        >
                                            {phoneFormatted}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right content column */}
                            <div 
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    justifyContent: "space-between",
                                    padding: "3px 6px 2px 6px",
                                    overflow: "hidden",
                                    backgroundColor: "#ffffff",
                                    color: "#000000",
                                    boxSizing: "border-box"
                                }}
                            >
                                {/* Product name in multiline, left-aligned, semi-bold */}
                                <div 
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "-0.01em",
                                        textAlign: "left",
                                        width: "100%",
                                        lineHeight: "1.25",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        maxHeight: "41px"
                                    }}
                                >
                                    {productName}
                                </div>
                                {/* Barcode (Large, displayValue=true) - Pushed down to let space for name */}
                                <div 
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "flex-end",
                                        marginTop: "auto",
                                        marginBottom: "2px"
                                    }}
                                >
                                    <div style={{ width: "30mm", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        <Barcode
                                            value={barcodeValue}
                                            format="CODE128"
                                            width={1.05}
                                            height={40}
                                            fontSize={7}
                                            margin={0}
                                            displayValue={true}
                                            background="transparent"
                                            lineColor="#000000"
                                        />
                                    </div>
                                </div>
                                {/* Price (centered) */}
                                <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                                    <p 
                                        style={{
                                            fontSize: "19px",
                                            fontWeight: 900,
                                            letterSpacing: "-0.02em",
                                            textAlign: "center",
                                            width: "100%",
                                            margin: 0,
                                            padding: 0,
                                            lineHeight: "1"
                                        }}
                                    >
                                        {priceFormatted}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                }
                case "store_40x20":
                    return (
                        <div 
                            style={{
                                width: "40mm",
                                height: "20mm",
                                maxWidth: "40mm",
                                maxHeight: "20mm",
                                overflow: "hidden",
                                boxSizing: "border-box",
                                backgroundColor: "#ffffff",
                                color: "#000000",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "2px 2px",
                                margin: 0
                            }}
                        >
                            {/* Company name */}
                            <p 
                                style={{
                                    fontSize: "9.5px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em",
                                    textAlign: "center",
                                    width: "100%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    margin: 0,
                                    padding: 0,
                                    color: "#333333",
                                    lineHeight: "1.1"
                                }}
                            >
                                {tenantName || "SYNCLOUDPOS"}
                            </p>
                            {/* Dashed line */}
                            <div style={{ width: "100%", borderBottom: "1px dashed #666666", margin: "1px 0" }}></div>
                            {/* Product name */}
                            <p 
                                style={{
                                    fontSize: "10.5px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "-0.01em",
                                    textAlign: "center",
                                    width: "100%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    margin: 0,
                                    padding: 0,
                                    lineHeight: "1.1"
                                }}
                            >
                                {productName}
                            </p>
                            {/* Barcode (displayValue=false) */}
                            <div style={{ width: "38mm", display: "flex", justifyContent: "center", alignItems: "center", height: "18px", overflow: "hidden" }}>
                                <Barcode
                                    value={barcodeValue}
                                    format="CODE128"
                                    width={1.1}
                                    height={18}
                                    margin={0}
                                    displayValue={false}
                                    background="transparent"
                                    lineColor="#000000"
                                />
                            </div>
                            {/* Price */}
                            <p 
                                style={{
                                    fontSize: "13.5px",
                                    fontWeight: 900,
                                    textAlign: "center",
                                    width: "100%",
                                    margin: 0,
                                    padding: 0,
                                    lineHeight: "1",
                                    letterSpacing: "-0.02em"
                                }}
                            >
                                {priceFormatted}
                            </p>
                        </div>
                    )
                case "simple_40x20":
                default:
                    return (
                        <div 
                            style={{
                                width: "40mm",
                                height: "20mm",
                                maxWidth: "40mm",
                                maxHeight: "20mm",
                                overflow: "hidden",
                                boxSizing: "border-box",
                                backgroundColor: "#ffffff",
                                color: "#000000",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "2px 2px",
                                margin: 0
                            }}
                        >
                            {/* Product name */}
                            <p 
                                style={{
                                    fontSize: "10.5px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "-0.01em",
                                    textAlign: "center",
                                    width: "100%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    margin: 0,
                                    padding: 0,
                                    lineHeight: "1.1"
                                }}
                            >
                                {productName}
                            </p>
                            {/* Barcode (Wide and bigger, displayValue=false) */}
                            <div style={{ width: "38mm", display: "flex", justifyContent: "center", alignItems: "center", height: "28px", overflow: "hidden" }}>
                                <Barcode
                                    value={barcodeValue}
                                    format="CODE128"
                                    width={1.15}
                                    height={28}
                                    margin={0}
                                    displayValue={false}
                                    background="transparent"
                                    lineColor="#000000"
                                />
                            </div>
                            {/* Price */}
                            <p 
                                style={{
                                    fontSize: "16.5px",
                                    fontWeight: 900,
                                    textAlign: "center",
                                    width: "100%",
                                    margin: 0,
                                    padding: 0,
                                    lineHeight: "1",
                                    letterSpacing: "-0.02em"
                                }}
                            >
                                {priceFormatted}
                            </p>
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
                    padding: 0,
                    boxSizing: "border-box",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    width: model === "side_store_45x35" ? "45mm" : "40mm",
                    height: model === "side_store_45x35" ? "35mm" : "20mm",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    color: "#000000"
                }}
            >
                {renderContent()}
            </div>
        )
    }
)
BarcodeLabel.displayName = "BarcodeLabel"
