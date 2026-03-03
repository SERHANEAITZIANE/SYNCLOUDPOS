import React from "react"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import Barcode from "react-barcode"

interface ReceiptItem {
    name: string
    quantity: number
    price: number
}

interface ReceiptProps {
    items: ReceiptItem[]
    total: number
    date: Date
    orderId?: string
    storeName?: string
    storeAddress?: string
    storePhone?: string
    customerName?: string
    paidAmount?: number
    previousBalance?: number
    newBalance?: number
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({
    items,
    total,
    date,
    orderId = "12345",
    storeName = "SYNCLOUDPOS",
    storeAddress = "Adresse de la boutique",
    storePhone = "+213 000 000 000",
    customerName,
    paidAmount,
    previousBalance,
    newBalance
}, ref) => {
    const t = useTranslations("Receipt")

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div ref={ref} className="w-[80mm] p-4 bg-white text-black font-sans text-base font-bold leading-tight print:shadow-none shadow-lg print:m-0 mx-auto">
            {/* Header */}
            <div className="text-center mb-6 space-y-1">
                <h1 className="font-black text-2xl tracking-tighter uppercase">{storeName}</h1>
                <p className="text-sm text-black font-bold">{storeAddress}</p>
                <p className="text-sm text-black font-bold">Tel: {storePhone}</p>
                <div className="mt-4 pt-3 border-t-2 border-dashed border-black">
                    <h2 className="font-bold text-lg uppercase tracking-widest bg-black text-white py-1 rounded-sm mt-1">{t("title")}</h2>
                </div>
            </div>

            {/* Order Info */}
            <div className="border-b-2 border-black pb-3 mb-4 text-sm font-bold space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-black">{t("date")}:</span>
                    <span>{format(date, "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-black">{t("ticketNo")}:</span>
                    <span className="font-bold">{orderId}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-black">{t("customer")}:</span>
                    <span className="font-bold uppercase max-w-[45mm] truncate text-right">
                        {customerName || t("guest")}
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="mb-4">
                <div className="border-b-2 border-dashed border-black mb-2"></div>
                <table className="w-full text-sm font-bold">
                    <tbody className="font-black">
                        {items?.map((item, index) => (
                            <tr key={index} className="border-b border-gray-100 last:border-0">
                                <td className="py-2 pr-2 leading-tight break-words text-left">
                                    {item.quantity} X {item.name}
                                </td>
                                <td className="text-right py-2 align-top whitespace-nowrap min-w-[20mm]">
                                    {formatCurrency(item.price * item.quantity)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border-t-2 border-dashed border-black mt-2"></div>
            </div>

            {/* Balances & Totals Box */}
            <div className="border-2 border-black rounded-lg p-3 mb-6 bg-white">
                <div className="space-y-2 text-base font-bold">

                    {/* Only show Ancien Solde if there's a defined tracking parameter and it's not 0 or if there is a customer */}
                    {customerName && previousBalance !== undefined && (
                        <div className="flex justify-between font-bold text-sm text-black">
                            <span>{t("oldBalance")}</span>
                            <span>{formatCurrency(previousBalance)}</span>
                        </div>
                    )}

                    {(() => {
                        const sumOriginal = items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0
                        const remise = sumOriginal - total
                        if (remise > 0) {
                            return (
                                <div className="flex justify-between font-bold text-sm text-black">
                                    <span>{t("discount")}</span>
                                    <span>-{formatCurrency(remise)}</span>
                                </div>
                            )
                        }
                        return null
                    })()}

                    <div className="flex justify-between items-center font-black text-xl py-2 border-y-2 border-dashed border-black my-1">
                        <span>{t("total")}</span>
                        <span>{formatCurrency(total)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-sm text-black">
                        <span>{t("payment")}</span>
                        <span>{formatCurrency(paidAmount ?? 0)}</span>
                    </div>

                    {customerName && newBalance !== undefined && (
                        <div className="flex justify-between font-black text-lg pt-2 border-t-2 border-black mt-1">
                            <span>{t("newBalance")}</span>
                            <span>{formatCurrency(newBalance)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm mt-6 space-y-2">
                <p className="font-bold italic">{t("thanks")}</p>

                {/* Barcode Mockup based on orderId */}
                <div className="mt-4 pt-4 border-t-2 border-black flex flex-col items-center justify-center">
                    <Barcode
                        value={orderId}
                        height={40}
                        width={1.5}
                        fontSize={14}
                        fontOptions="bold"
                        displayValue={true}
                        background="transparent"
                        lineColor="#000000"
                        margin={0}
                    />
                </div>

                <p className="text-xs text-black font-bold mt-4 uppercase tracking-widest">SYNCLOUDPOS ERP</p>
            </div>
        </div>
    )
})

Receipt.displayName = "Receipt"
