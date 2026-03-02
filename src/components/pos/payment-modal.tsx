"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { CreditCard, Banknote, Printer, CheckCircle, ArrowRight, Landmark, FileText, Clock } from "lucide-react"
import { useReactToPrint } from "react-to-print"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Receipt } from "./receipt"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    accounts = []
}) => {
    const [method, setMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM">("CASH")
    const [accountId, setAccountId] = useState("none")

    // Core Math
    const subtotal = items.reduce((acc, item) => acc + (item.priceHt || (item.price / (1 + (item.tvaRate ?? 19) / 100))) * item.quantity, 0)
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
                title="Transaction Complete"
                description="The order has been processed successfully."
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
                        <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest text-sm">Amount Paid</p>
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
                            <span className="text-green-700 dark:text-green-400 font-bold uppercase tracking-wider text-sm">Change to return</span>
                            <span className="text-2xl font-black text-green-700 dark:text-green-400">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(changeAmount)}
                                <span className="text-sm font-bold ml-1">DA</span>
                            </span>
                        </div>
                    )}

                    <div className="flex w-full flex-col gap-3 sm:flex-row mt-4">
                        <Button variant="outline" size="lg" className="flex-1 h-16 rounded-xl text-lg font-bold gap-3 border-gray-200 hover:bg-gray-50 dark:border-gray-800" onClick={() => handlePrint && handlePrint()}>
                            <Printer size={22} />
                            Print Ticket
                        </Button>
                        <Button size="lg" className="flex-1 h-16 rounded-xl text-lg font-bold gap-3 shadow-xl hover:-translate-y-1 transition-transform" onClick={handleClose}>
                            New Order
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
            title="Checkout"
            description="Complete the payment for this order."
            isOpen={isOpen}
            onClose={handleClose}
            className="sm:max-w-4xl p-4 sm:p-8 rounded-2xl sm:rounded-[32px] bg-slate-100 shadow-2xl dark:bg-zinc-950 max-h-[90vh] overflow-y-auto"
        >
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">

                {/* Left Side: Payment Method & Totals */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center border-2 border-gray-50 dark:border-gray-800 shadow-sm flex flex-col justify-center h-32">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Due</p>
                        <div className="text-[3.5rem] leading-none font-black text-gray-900 dark:text-white tracking-tighter">
                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}
                            <span className="text-2xl text-gray-400 font-bold ml-2">DA</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200",
                                method === "CASH"
                                    ? "bg-gray-100/50 dark:bg-gray-800 border-gray-900 dark:border-white text-gray-900 dark:text-white"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 text-gray-500 shadow-sm"
                            )}
                            onClick={() => setMethod("CASH")}
                        >
                            <Banknote className="h-6 w-6 mb-2" strokeWidth={1.5} />
                            <span className="font-bold text-[10px] sm:text-xs text-center leading-tight">ESPÈCES</span>
                        </div>
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200",
                                method === "CARD"
                                    ? "bg-gray-100/50 dark:bg-gray-800 border-gray-900 dark:border-white text-gray-900 dark:text-white"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 text-gray-500 shadow-sm"
                            )}
                            onClick={() => {
                                setMethod("CARD")
                                setTenderedStr(finalTotalTTC.toString())
                            }}
                        >
                            <CreditCard className="h-6 w-6 mb-2" strokeWidth={1.5} />
                            <span className="font-bold text-[10px] sm:text-xs text-center leading-tight">CARTE / TPE</span>
                        </div>
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200",
                                method === "TRANSFER"
                                    ? "bg-gray-100/50 dark:bg-gray-800 border-gray-900 dark:border-white text-gray-900 dark:text-white"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 text-gray-500 shadow-sm"
                            )}
                            onClick={() => {
                                setMethod("TRANSFER")
                                setTenderedStr(finalTotalTTC.toString())
                            }}
                        >
                            <Landmark className="h-6 w-6 mb-2" strokeWidth={1.5} />
                            <span className="font-bold text-[10px] sm:text-xs text-center leading-tight">VIREMENT</span>
                        </div>
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200",
                                method === "CHECK"
                                    ? "bg-gray-100/50 dark:bg-gray-800 border-gray-900 dark:border-white text-gray-900 dark:text-white"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 text-gray-500 shadow-sm"
                            )}
                            onClick={() => {
                                setMethod("CHECK")
                                setTenderedStr(finalTotalTTC.toString())
                            }}
                        >
                            <FileText className="h-6 w-6 mb-2" strokeWidth={1.5} />
                            <span className="font-bold text-[10px] sm:text-xs text-center leading-tight">CHÈQUE</span>
                        </div>
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200",
                                method === "TERM"
                                    ? "bg-gray-100/50 dark:bg-gray-800 border-gray-900 dark:border-white text-gray-900 dark:text-white"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 text-gray-500 shadow-sm"
                            )}
                            onClick={() => {
                                setMethod("TERM")
                                setTenderedStr(finalTotalTTC.toString())
                            }}
                        >
                            <Clock className="h-6 w-6 mb-2" strokeWidth={1.5} />
                            <span className="font-bold text-[10px] sm:text-xs text-center leading-tight">À TERME</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Deposit To</Label>
                        <Select
                            disabled={loading}
                            value={accountId}
                            onValueChange={(val) => setAccountId(val)}
                        >
                            <SelectTrigger className="mt-1 h-12 rounded-xl bg-white border-gray-200">
                                <SelectValue placeholder="Select Caisse / Bank" />
                            </SelectTrigger>
                            <SelectContent className="z-[99999]">
                                <SelectItem value="none">None / Default</SelectItem>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name} (Solde: {acc.balance})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {method === "CASH" && (
                        <div className="space-y-3 pt-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quick Cash</p>
                            <div className="grid grid-cols-2 gap-3">
                                {quickCashOptions.map((amount) => (
                                    <Button
                                        key={amount}
                                        variant="outline"
                                        className="h-14 rounded-2xl font-bold text-lg hover:border-gray-400 hover:text-gray-900 transition-colors border-gray-100 bg-white shadow-sm"
                                        onClick={() => setQuickCash(amount)}
                                    >
                                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Numpad (Only for Cash) */}
                <div className="w-full lg:w-[340px] flex flex-col mt-2 lg:mt-0 relative">

                    <div className={cn(
                        "transition-all duration-500 flex flex-col h-full",
                        method === "CASH" ? "opacity-100 pointer-events-auto" : "opacity-30 pointer-events-none filter blur-[1px]"
                    )}>
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border-2 border-gray-50 dark:border-gray-800 mb-2 text-right shadow-sm flex flex-col justify-center h-28 relative">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest absolute top-4 right-6">Tendered</p>
                            <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tight mt-4">
                                {tenderedStr ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tenderedAmount) : "0"}
                            </p>
                        </div>

                        {changeAmount > 0 ? (
                            <div className="mb-4 flex flex-row justify-between items-center px-4 py-3 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                                <span className="text-gray-500 font-bold text-sm sm:text-lg">Change</span>
                                <span className="text-xl sm:text-2xl font-black text-green-500">+{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(changeAmount)}</span>
                            </div>
                        ) : (
                            <div className="mb-4 flex flex-row justify-between items-center px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-gray-500 font-bold text-sm sm:text-lg">Balance</span>
                                <span className="text-xl sm:text-2xl font-bold text-gray-400">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.max(0, total - tenderedAmount))}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
                            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    className="h-14 sm:h-16 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-black shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-gray-900 dark:text-white"
                                    onClick={() => handleNumpad(num)}
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button variant="outline" className="h-14 sm:h-16 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-black text-red-500 hover:bg-red-50 hover:text-red-600 border-gray-100 shadow-sm bg-white transition-all uppercase" onClick={() => handleNumpad("C")}>
                                C
                            </Button>
                            <Button variant="outline" className="h-14 sm:h-16 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-black shadow-sm bg-white border-gray-100 hover:bg-gray-50 transition-all text-gray-900" onClick={() => handleNumpad("0")}>
                                0
                            </Button>
                            <Button variant="outline" className="h-14 sm:h-16 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-black bg-white border-gray-100 hover:bg-gray-50 shadow-sm transition-all text-gray-900" onClick={() => handleNumpad("00")}>
                                00
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 sm:pt-10 mt-4 sm:mt-6 md:-mr-4">
                <Button disabled={loading} variant="ghost" className="w-full sm:w-auto h-12 sm:h-14 px-6 rounded-xl sm:rounded-2xl font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center justify-center" onClick={handleClose}>
                    <span>Cancel</span>
                    <span className="text-[9px] opacity-50 uppercase tracking-widest mt-0.5 hidden sm:block">Esc</span>
                </Button>
                <Button
                    disabled={loading || (method === "CASH" && tenderedAmount < total && !hasCustomer)}
                    className="w-full sm:w-auto h-14 sm:h-16 px-10 rounded-xl sm:rounded-[20px] font-black text-lg sm:text-xl bg-[#0f0f0f] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-100 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
                    onClick={handleConfirm}
                >
                    <span>{loading ? "Processing..." : "Complete Order"}</span>
                    {!loading && <span className="text-[10px] opacity-70 font-bold tracking-widest leading-none mt-1 uppercase hidden sm:block">Enter</span>}
                </Button>
            </div>
        </Modal>
    )
}
