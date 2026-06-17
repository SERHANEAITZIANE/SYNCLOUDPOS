import React from "react"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react"

interface ReceiptItem {
    name: string
    quantity: number
    price: number
    serialNumber?: string
    discountAmount?: number
    discountLabel?: string
}

interface ReceiptProps {
    items: ReceiptItem[]
    total: number
    stampTax?: number
    rounding?: number
    date: Date
    orderId?: string
    storeName?: string
    storeAddress?: string
    storePhone?: string
    customerName?: string
    paidAmount?: number
    previousBalance?: number
    newBalance?: number
    logo?: string
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({
    items,
    total,
    stampTax = 0,
    rounding = 0,
    date,
    orderId = "12345",
    storeName = "SYNCLOUDPOS",
    storeAddress = "Adresse de la boutique",
    storePhone = "+213 000 000 000",
    customerName,
    paidAmount,
    previousBalance,
    newBalance,
    logo
}, ref) => {
    const t = useTranslations("Receipt")

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div ref={ref} className="w-[80mm] p-4 bg-[#f8fafc] text-indigo-950 font-sans text-base font-bold leading-tight print:shadow-none shadow-lg print:m-0 mx-auto print:bg-white print:text-black border border-indigo-100 print:border-0 rounded-2xl print:rounded-none">
            {/* Header */}
            <div className="text-center mb-6 space-y-1">
                {logo && (
                    <div className="flex justify-center mb-2">
                        <img src={logo} alt="Logo" className="max-h-[60px] max-w-[60mm] object-contain" />
                    </div>
                )}
                <h1 className="font-black text-2xl tracking-tighter uppercase text-indigo-900 print:text-black">{storeName}</h1>
                <p className="text-sm text-indigo-950 print:text-black font-bold">{storeAddress}</p>
                <p className="text-sm text-indigo-950 print:text-black font-bold">Tel: {storePhone}</p>
                <div className="mt-4 pt-3 border-t-2 border-dashed border-indigo-900/30 print:border-black">
                    <h2 className="font-bold text-lg uppercase tracking-widest bg-indigo-900 text-white py-1 rounded-sm mt-1 print:bg-black">{t("title")}</h2>
                </div>
            </div>

            {/* Order Info */}
            <div className="border-b-2 border-indigo-900/30 print:border-black pb-3 mb-4 text-sm font-bold space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-indigo-900/70 print:text-black">{t("date")}:</span>
                    <span>{format(date, "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-indigo-900/70 print:text-black">{t("ticketNo")}:</span>
                    <span className="font-bold">{orderId}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-indigo-900/70 print:text-black">{t("customer")}:</span>
                    <span className="font-bold uppercase max-w-[45mm] truncate text-right">
                        {customerName || t("guest")}
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="mb-4">
                <div className="border-b-2 border-dashed border-indigo-900/30 print:border-black mb-2"></div>
                <table className="w-full text-sm font-bold">
                    <tbody className="font-black">
                        {items?.map((item, index) => (
                            <tr key={index} className="border-b border-indigo-900/10 print:border-black last:border-0">
                                <td className="py-2 pr-2 leading-tight break-words text-left">
                                    <div className="text-indigo-950 print:text-black">{item.quantity} X {item.name}</div>
                                    {item.serialNumber && (
                                        <div className="text-indigo-900/60 print:text-black">
                                            S/N: {item.serialNumber}
                                        </div>
                                    )}
                                    {item.discountAmount && item.discountAmount > 0 && (
                                        <div className="text-[10px] text-indigo-900/70 print:text-black font-bold mt-0.5">
                                            🏷️ {item.discountLabel} (-{formatCurrency(item.discountAmount)} DA)
                                        </div>
                                    )}
                                </td>
                                <td className="text-right py-2 align-top whitespace-nowrap min-w-[20mm]">
                                    {item.discountAmount && item.discountAmount > 0 ? (
                                        <>
                                            <div className="line-through text-indigo-900/50 print:text-black text-xs font-normal">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                            <div className="text-indigo-950 print:text-black font-black">
                                                {formatCurrency((item.price * item.quantity) - item.discountAmount)}
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-indigo-950 print:text-black">{formatCurrency(item.price * item.quantity)}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border-t-2 border-dashed border-indigo-900/30 print:border-black mt-2"></div>
            </div>

            {/* Balances & Totals Box */}
            <div className="border border-indigo-900/20 print:border-2 print:border-black rounded-xl p-3 mb-6 bg-indigo-50/20 print:bg-white">
                <div className="space-y-2 text-base font-bold">

                    {/* Only show Ancien Solde if there's a defined tracking parameter and it's not 0 or if there is a customer */}
                    {customerName && previousBalance !== undefined && (
                        <div className="flex justify-between font-bold text-sm text-indigo-900/80 print:text-black">
                            <span>{t("oldBalance")}</span>
                            <span>{formatCurrency(previousBalance)}</span>
                        </div>
                    )}

                    {(() => {
                        const sumOriginal = items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0
                        const remise = sumOriginal + stampTax + rounding - total
                        if (remise > 0) {
                            return (
                                <div className="flex justify-between font-bold text-sm text-indigo-900/80 print:text-black">
                                    <span>{t("discount")}</span>
                                    <span>-{formatCurrency(remise)}</span>
                                </div>
                            )
                        }
                        return null
                    })()}

                    {stampTax > 0 && (
                        <div className="flex justify-between font-bold text-sm text-indigo-900/80 print:text-black">
                            <span>Droit de Timbre</span>
                            <span>+{formatCurrency(stampTax)}</span>
                        </div>
                    )}

                    {rounding !== 0 && (
                        <div className="flex justify-between font-bold text-sm text-indigo-900/80 print:text-black">
                            <span>Arrondi</span>
                            <span>{rounding > 0 ? "+" : ""}{formatCurrency(rounding)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center font-black text-xl py-2 border-y border-dashed border-indigo-900/30 print:border-y-2 print:border-black my-1 text-indigo-900 print:text-black">
                        <span>{t("total")}</span>
                        <span>{formatCurrency(total)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-sm text-indigo-900/80 print:text-black">
                        <span>{t("payment")}</span>
                        <span>{formatCurrency(paidAmount ?? 0)}</span>
                    </div>

                    {customerName && newBalance !== undefined && (
                        <div className="flex justify-between font-black text-lg pt-2 border-t border-indigo-900/20 print:border-t-2 print:border-black mt-1 text-indigo-950 print:text-black">
                            <span>{t("newBalance")}</span>
                            <span>{formatCurrency(newBalance)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm mt-6 space-y-2 text-indigo-950 print:text-black">
                <p className="font-bold italic">{t("thanks")}</p>


                {/* QR Code — links to online receipt portal */}
                <div className="mt-4 flex flex-col items-center gap-1">
                    <QRCodeSVG
                        value={`${process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com"}/receipt/${orderId}`}
                        size={80}
                        bgColor="#ffffff"
                        fgColor="#1e1b4b"
                        level="M"
                    />
                    <p className="text-[9px] text-indigo-900/70 print:text-black font-bold uppercase tracking-wider mt-1">Scannez pour votre facture</p>
                </div>

                <p className="text-xs text-indigo-900/40 print:text-black font-bold mt-4 uppercase tracking-widest">SYNCLOUDPOS ERP</p>
            </div>
        </div>
    )
})

Receipt.displayName = "Receipt"
