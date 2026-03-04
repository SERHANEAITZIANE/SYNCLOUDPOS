"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { CreditCard, Banknote, Printer, CheckCircle, ArrowRight, Landmark, FileText, Clock } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { useTranslations } from "next-intl"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Receipt } from "./receipt"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Label } from "@/components/ui/label"

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (method: "CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM", paidAmount: number, accountId: string | undefined, stampTax: number, subtotal: number, tvaAmount: number, totalTTC: number) => Promise<{ success: boolean; data?: any } | void>
    loading: boolean
    total: number
    items?: { name: string; quantity: number; price: number; tvaRate?: number; priceHt?: number }[]
    customerName?: string
    hasCustomer?: boolean
    accounts?: any[]
    storeName?: string
    storeAddress?: string
    storePhone?: string
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    loading,
    total,
    items = [],
    customerName,
    hasCustomer = false,
    accounts = [],
    storeName,
    storeAddress,
    storePhone
}) => {
    const t = useTranslations("PaymentModal")
    const [method, setMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM">("CASH")
    const [accountId, setAccountId] = useState("none")

    // Read localStorage POS defaults on first open, fallback to CAISSE PRINCIPALE
    useEffect(() => {
        if (isOpen) {
            try {
                const stored = localStorage.getItem("pos_defaults_prefs")
                if (stored) {
                    const prefs = JSON.parse(stored)
                    if (prefs.defaultPaymentMethod) setMethod(prefs.defaultPaymentMethod)
                    if (prefs.defaultAccountId && prefs.defaultAccountId !== "none") {
                        setAccountId(prefs.defaultAccountId)
                        return // Exit if valid stored preference exists
                    }
                }

                // Fallback to CAISSE PRINCIPALE if no stored preference found
                const defaultAccount = accounts?.find(a => a.name.toUpperCase() === "CAISSE PRINCIPALE")
                if (defaultAccount) {
                    setAccountId(defaultAccount.id)
                } else {
                    setAccountId("none")
                }
            } catch {
                // Fallback on error
                const defaultAccount = accounts?.find(a => a.name.toUpperCase() === "CAISSE PRINCIPALE")
                if (defaultAccount) setAccountId(defaultAccount.id)
            }
        }
    }, [isOpen, accounts])

    // Core Math
    const originalSubtotal = items.reduce((acc, item) => acc + (item.priceHt || (item.price / (1 + (item.tvaRate ?? 19) / 100))) * item.quantity, 0)
    const originalTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
    const discountRatio = originalTotal > 0 ? total / originalTotal : 1

    const subtotal = originalSubtotal * discountRatio
    const tvaAmount = total - subtotal

    const getStampTaxAmount = (amount: number) => {
        if (amount <= 300) return 0;
        if (amount <= 30000) return Math.max(5, Math.ceil(amount / 100) * 1);
        if (amount <= 100000) return Math.max(5, Math.ceil(amount / 100) * 1.5);
        return Math.min(10000, Math.ceil(amount / 100) * 2);
    }

    const stampTax = 0 // Timbre is not calculated in POS
    const finalTotalTTC = total + stampTax

    const [tenderedStr, setTenderedStr] = useState(finalTotalTTC.toString())
    const [success, setSuccess] = useState(false)
    const [orderData, setOrderData] = useState<any>(null)
    const [finalItems, setFinalItems] = useState<any[]>([])
    const [finalTotal, setFinalTotal] = useState<number>(0)
    const [finalCustomerName, setFinalCustomerName] = useState<string | undefined>(undefined)
    const [hasAutoPrinted, setHasAutoPrinted] = useState(false)
    const componentRef = useRef<HTMLDivElement>(null)

    const tenderedAmount = tenderedStr ? parseInt(tenderedStr, 10) : 0
    const changeAmount = Math.max(0, tenderedAmount - finalTotalTTC)

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    })

    const handleConfirm = async () => {
        const finalAccountId = accountId === "none" ? undefined : accountId
        const result = await onConfirm(method, method === "CASH" ? tenderedAmount : finalTotalTTC, finalAccountId, stampTax, subtotal, tvaAmount, finalTotalTTC)
        if (result && result.success) {
            setFinalItems(items)
            setFinalTotal(finalTotalTTC)
            setFinalCustomerName(customerName)
            if (result.data) setOrderData(result.data)
            setSuccess(true)
            setHasAutoPrinted(false) // Reset auto-print state for the new order
        }
    }

    const handleClose = () => {
        setSuccess(false)
        setOrderData(null)
        setFinalItems([])
        setFinalTotal(0)
        setFinalCustomerName(undefined)
        setMethod("CASH")
        setAccountId("none")
        setTenderedStr(total.toString())
        onClose()
    }

    const isPristineRef = useRef(true)

    useEffect(() => {
        if (isOpen) {
            isPristineRef.current = true
            setTenderedStr(finalTotalTTC.toString())
        }
    }, [isOpen, finalTotalTTC])

    const handleNumpad = React.useCallback((val: string) => {
        setTenderedStr(prev => {
            let current = isPristineRef.current ? "" : prev
            isPristineRef.current = false

            if (val === "C") return ""
            if (val === "DEL") return current.slice(0, -1)

            if (current === "0" && val !== "00") return val
            if (current.length < 8) return current + val
            return current
        })
    }, [])

    const setQuickCash = (amount: number) => {
        isPristineRef.current = false
        setTenderedStr(amount.toString())
    }

    // Keyboard support
    useEffect(() => {
        if (!isOpen || success) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return

            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault()
                handleNumpad(e.key)
            } else if (e.key === "Backspace") {
                e.preventDefault()
                handleNumpad("DEL")
            } else if (e.key === "Enter") {
                e.preventDefault()
                const isMethodCashAndInsufficient = method === "CASH" && tenderedAmount < finalTotalTTC && !hasCustomer
                if (!loading && !isMethodCashAndInsufficient) {
                    handleConfirm()
                }
            } else if (e.key === "Escape") {
                e.preventDefault()
                handleClose()
            } else if (e.key.toLowerCase() === "c") {
                e.preventDefault()
                handleNumpad("C")
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, success, handleNumpad, loading, method, tenderedAmount, finalTotalTTC, hasCustomer])

    // Auto-print effect
    React.useEffect(() => {
        let timeoutId: NodeJS.Timeout

        if (success && !hasAutoPrinted) {
            setHasAutoPrinted(true)

            // Allow React to mount the <Receipt /> component inside the success view
            timeoutId = setTimeout(() => {
                if (componentRef.current && handlePrint) {
                    handlePrint()
                } else {
                    console.log("Print failed: Component ref is null")
                }
            }, 800)
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [success, handlePrint, hasAutoPrinted])

    // Success View
    if (success) {
        return (
            <Modal
                title={t("transactionComplete")}
                description={t("orderProcessed")}
                isOpen={isOpen}
                onClose={handleClose}
            >
                <div className="flex flex-col items-center justify-center space-y-8 py-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
                        <div className="relative bg-gradient-to-tr from-green-400 to-green-600 rounded-full p-5 shadow-2xl shadow-green-500/40">
                            <CheckCircle className="h-16 w-16 text-white" />
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest text-sm">{t("amountPaid")}</p>
                        <h3 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(finalTotalTTC)}
                            <span className="text-xl font-bold text-gray-400 ml-2">DA</span>
                        </h3>
                        {orderData?.receiptNumber && (
                            <p className="text-lg font-bold text-emerald-600 mt-2 text-center bg-emerald-50 dark:bg-emerald-900/20 py-1.5 px-4 rounded-full border border-emerald-200">
                                {orderData.receiptNumber}
                            </p>
                        )}
                    </div>

                    {method === "CASH" && changeAmount > 0 && (
                        <div className="w-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-4 flex justify-between items-center">
                            <span className="text-green-700 dark:text-green-400 font-bold uppercase tracking-wider text-sm">{t("changeToReturn")}</span>
                            <span className="text-2xl font-black text-green-700 dark:text-green-400">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(changeAmount)}
                                <span className="text-sm font-bold ml-1">DA</span>
                            </span>
                        </div>
                    )}

                    <div className="flex w-full flex-col gap-3 sm:flex-row mt-4">
                        <Button variant="outline" size="lg" className="flex-1 h-16 rounded-xl text-lg font-bold gap-3 border-gray-200 hover:bg-gray-50 dark:border-gray-800" onClick={() => handlePrint && handlePrint()}>
                            <Printer size={22} />
                            {t("printTicket")}
                        </Button>
                        <Button size="lg" className="flex-1 h-16 rounded-xl text-lg font-bold gap-3 shadow-xl hover:-translate-y-1 transition-transform" onClick={handleClose}>
                            {t("newOrder")}
                            <ArrowRight size={22} />
                        </Button>
                    </div>

                    {/* Hidden Receipt for Printing */}
                    <div className="hidden">
                        <Receipt
                            ref={componentRef}
                            items={finalItems.length > 0 ? finalItems : items}
                            total={success ? finalTotal : total}
                            date={new Date()}
                            orderId={orderData?.receiptNumber}
                            storeName={storeName}
                            storeAddress={storeAddress}
                            storePhone={storePhone}
                            customerName={success ? finalCustomerName : customerName}
                            paidAmount={orderData?.paidAmount}
                            previousBalance={orderData?.previousBalance}
                            newBalance={orderData?.newBalance}
                        />
                    </div>
                </div>
            </Modal>
        )
    }

    // Determine viable quick-cash amounts based on total
    const roundedUp100 = Math.ceil(total / 100) * 100
    const roundedUp500 = Math.ceil(total / 500) * 500
    const roundedUp1000 = Math.ceil(total / 1000) * 1000
    const roundedUp2000 = Math.ceil(total / 2000) * 2000

    const quickCashOptions = Array.from(new Set([
        finalTotalTTC,
        roundedUp100 > finalTotalTTC ? roundedUp100 : null,
        roundedUp500 > roundedUp100 ? roundedUp500 : null,
        roundedUp1000 > roundedUp500 ? roundedUp1000 : null,
        roundedUp2000 > roundedUp1000 ? roundedUp2000 : null,
        5000
    ].filter(Boolean) as number[])).sort((a, b) => a - b).slice(0, 4)

    return (
        <Modal
            title={t("checkoutTitle")}
            description={t("checkoutDesc")}
            isOpen={isOpen}
            onClose={handleClose}
            className="sm:max-w-4xl p-0 rounded-2xl bg-slate-100 dark:bg-zinc-950 shadow-2xl max-h-[95dvh] overflow-hidden flex flex-col"
        >
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row gap-5">

                    {/* Left Side: Totals + Payment Method + Account + Quick Cash */}
                    <div className="flex-1 flex flex-col gap-4">

                        {/* Total Due */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t("totalDue")}</p>
                            <div className="text-4xl sm:text-5xl leading-none font-black text-gray-900 dark:text-white tracking-tighter">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}
                                <span className="text-xl text-gray-400 font-bold ml-2">DA</span>
                            </div>
                        </div>

                        {/* Payment Method â€” 2 rows on mobile, 1 row on bigger */}
                        <div className="grid grid-cols-5 gap-2">
                            {([
                                { key: "CASH", label: t("cash"), Icon: Banknote },
                                { key: "CARD", label: t("card"), Icon: CreditCard },
                                { key: "TRANSFER", label: t("transfer"), Icon: Landmark },
                                { key: "CHECK", label: t("check"), Icon: FileText },
                                { key: "TERM", label: t("term"), Icon: Clock },
                            ] as const).map(({ key, label, Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => { setMethod(key); if (key !== "CASH") setTenderedStr(finalTotalTTC.toString()) }}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-3 sm:py-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer gap-1.5",
                                        method === key
                                            ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-black"
                                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300 text-gray-500"
                                    )}
                                >
                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
                                    <span className="font-bold text-[9px] sm:text-[10px] text-center leading-tight">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Deposit Account */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t("depositTo")}</Label>
                            <SearchableSelect
                                options={[
                                    { value: "none", label: t("noneDefault") },
                                    ...accounts.map(acc => ({
                                        value: acc.id,
                                        label: `${acc.name} (${t("balanceLabel")} ${acc.balance})`
                                    }))
                                ]}
                                value={accountId}
                                onChange={(val) => setAccountId(val)}
                                disabled={loading}
                                placeholder={t("selectBankAccount")}
                            />
                        </div>

                        {/* Quick Cash â€” only for CASH */}
                        {method === "CASH" && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t("quickCash")}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                                    {quickCashOptions.map((amount) => (
                                        <Button
                                            key={amount}
                                            variant="outline"
                                            className="h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg hover:border-gray-400 hover:text-gray-900 transition-colors border-gray-100 bg-white shadow-sm"
                                            onClick={() => setQuickCash(amount)}
                                        >
                                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Numpad (dimmed when not CASH) */}
                    <div className={cn(
                        "w-full lg:w-[310px] flex flex-col gap-3 transition-all duration-300",
                        method !== "CASH" ? "opacity-30 pointer-events-none blur-[1px]" : "opacity-100"
                    )}>
                        {/* Tendered Amount */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl px-5 py-4 border border-gray-100 dark:border-gray-800 text-right shadow-sm relative">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t("tendered")}</p>
                            <p className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                {tenderedStr ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tenderedAmount) : "0"}
                            </p>
                        </div>

                        {/* Change / Remaining */}
                        <div className={cn(
                            "flex flex-row justify-between items-center px-4 py-3 rounded-xl border",
                            changeAmount > 0
                                ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
                                : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
                        )}>
                            <span className={cn("font-bold text-base", changeAmount > 0 ? "text-green-700 dark:text-green-400" : "text-gray-500")}>
                                {changeAmount > 0 ? t("change") : t("balance")}
                            </span>
                            <span className={cn("text-xl font-black", changeAmount > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400")}>
                                {changeAmount > 0
                                    ? `+${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(changeAmount)}`
                                    : new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.max(0, total - tenderedAmount))
                                }
                            </span>
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-2">
                            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    className="h-14 sm:h-16 rounded-xl text-xl sm:text-2xl font-black shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 transition-all text-gray-900 dark:text-white"
                                    onClick={() => handleNumpad(num)}
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button variant="outline" className="h-14 sm:h-16 rounded-xl text-xl font-black text-red-500 hover:bg-red-50 border-gray-100 shadow-sm bg-white transition-all" onClick={() => handleNumpad("C")}>C</Button>
                            <Button variant="outline" className="h-14 sm:h-16 rounded-xl text-xl font-black shadow-sm bg-white border-gray-100 hover:bg-gray-50 transition-all text-gray-900" onClick={() => handleNumpad("0")}>0</Button>
                            <Button variant="outline" className="h-14 sm:h-16 rounded-xl text-lg font-black bg-white border-gray-100 hover:bg-gray-50 shadow-sm transition-all text-gray-900" onClick={() => handleNumpad("00")}>00</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 rounded-b-2xl shrink-0">
                <Button disabled={loading} variant="ghost" className="w-full sm:w-auto h-12 sm:h-14 px-6 rounded-xl font-bold" onClick={handleClose}>
                    {t("cancel")} <span className="text-[9px] opacity-40 ml-1 hidden sm:inline">Esc</span>
                </Button>
                <Button
                    disabled={loading || (method === "CASH" && tenderedAmount < total && !hasCustomer)}
                    className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-xl font-black text-base sm:text-lg bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-black shadow-xl transition-all disabled:opacity-50"
                    onClick={handleConfirm}
                >
                    {loading ? t("processing") : t("completeOrder")}
                    {!loading && <span className="text-[10px] opacity-60 font-bold tracking-widest ml-2 hidden sm:inline">Enter</span>}
                </Button>
            </div>
        </Modal>
    )
}
