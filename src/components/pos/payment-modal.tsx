"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { CreditCard, Banknote, Printer, CheckCircle, ArrowRight, Landmark, FileText, Clock, Shield } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Label } from "@/components/ui/label"

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (
        method: "CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM",
        paidAmount: number,
        accountId: string | undefined,
        stampTax: number,
        subtotal: number,
        tvaAmount: number,
        totalTTC: number,
        vendorId: string | undefined,
        shouldPrint: boolean,
        printTicket: boolean,
        printBL: boolean,
        printWarranty: boolean
    ) => Promise<{ success: boolean; data?: any } | void>
    loading: boolean
    total: number
    items?: {
        name: string;
        quantity: number;
        price: number;
        tvaRate?: number;
        priceHt?: number;
        serialNumber?: string;
        discountAmount?: number;
        discountLabel?: string;
    }[]
    customerName?: string
    hasCustomer?: boolean
    accounts?: any[]
    storeName?: string
    storeAddress?: string
    storePhone?: string
    posTimbreEnabled?: boolean
    storeData?: any
    sellers?: { id: string; name: string | null; role: string }[]
    currentUserId?: string
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
    storePhone,
    posTimbreEnabled = false,
    storeData,
    sellers = [],
    currentUserId
}) => {
    const t = useTranslations("PaymentModal")
    const [method, setMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM">("CASH")
    const [accountId, setAccountId] = useState("none")
    const [selectedVendorId, setSelectedVendorId] = useState<string>(currentUserId || "")

    const [printTicket, setPrintTicket] = useState(true)
    const [printBL, setPrintBL] = useState(false)
    const [printWarranty, setPrintWarranty] = useState(false)

    // Load auto-print preferences
    useEffect(() => {
        if (isOpen) {
            try {
                const stored = localStorage.getItem("pos_auto_print_prefs")
                if (stored) {
                    const prefs = JSON.parse(stored)
                    let ticket = prefs.printTicket !== undefined ? prefs.printTicket : true
                    let bl = prefs.printBL !== undefined ? prefs.printBL : false
                    if (ticket && bl) {
                        bl = false // Resolve mutual exclusivity conflict
                    }
                    setPrintTicket(ticket)
                    setPrintBL(bl)
                    if (prefs.printWarranty !== undefined) setPrintWarranty(prefs.printWarranty)
                } else {
                    setPrintTicket(true)
                    setPrintBL(false)
                    setPrintWarranty(false)
                }
            } catch (err) {
                console.error("Failed to load local auto-print prefs:", err)
            }
        }
    }, [isOpen])

    const togglePrintTicket = (val: boolean) => {
        setPrintTicket(val)
        if (val) {
            setPrintBL(false)
        }
        try {
            const stored = localStorage.getItem("pos_auto_print_prefs")
            const prefs = stored ? JSON.parse(stored) : {}
            prefs.printTicket = val
            if (val) prefs.printBL = false
            localStorage.setItem("pos_auto_print_prefs", JSON.stringify(prefs))
        } catch { }
    }

    const togglePrintBL = (val: boolean) => {
        setPrintBL(val)
        if (val) {
            setPrintTicket(false)
        }
        try {
            const stored = localStorage.getItem("pos_auto_print_prefs")
            const prefs = stored ? JSON.parse(stored) : {}
            prefs.printBL = val
            if (val) prefs.printTicket = false
            localStorage.setItem("pos_auto_print_prefs", JSON.stringify(prefs))
        } catch { }
    }

    const togglePrintWarranty = (val: boolean) => {
        setPrintWarranty(val)
        try {
            const stored = localStorage.getItem("pos_auto_print_prefs")
            const prefs = stored ? JSON.parse(stored) : {}
            prefs.printWarranty = val
            localStorage.setItem("pos_auto_print_prefs", JSON.stringify(prefs))
        } catch { }
    }

    useEffect(() => {
        if (isOpen && currentUserId) {
            setSelectedVendorId(currentUserId)
        }
    }, [isOpen, currentUserId])

    // Read localStorage POS defaults on first open, fallback to CAISSE SECONDAIRE
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

                // Fallback to CAISSE SECONDAIRE if no stored preference found
                const defaultAccount = accounts?.find(a => a.name.toUpperCase() === "CAISSE SECONDAIRE")
                if (defaultAccount) {
                    setAccountId(defaultAccount.id)
                } else {
                    setAccountId("none")
                }
            } catch {
                // Fallback on error
                const defaultAccount = accounts?.find(a => a.name.toUpperCase() === "CAISSE SECONDAIRE")
                if (defaultAccount) setAccountId(defaultAccount.id)
            }
        }
    }, [isOpen, accounts])

    const tvaEnabled = storeData?.tvaEnabled ?? false
    const effectiveTvaRate = (itemTvaRate: number | undefined) => tvaEnabled ? (itemTvaRate ?? 0) : 0

    // Core Math
    const originalSubtotal = tvaEnabled
        ? items.reduce((acc, item) => acc + (item.priceHt || (item.price / (1 + effectiveTvaRate(item.tvaRate) / 100))) * item.quantity, 0)
        : total
    const originalTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
    const discountRatio = originalTotal > 0 ? total / originalTotal : 1

    const subtotal = tvaEnabled ? originalSubtotal * discountRatio : total
    const tvaAmount = tvaEnabled ? total - subtotal : 0

    const getStampTaxAmount = (amount: number) => {
        if (amount <= 300) return 0;
        if (amount <= 30000) return Math.max(5, Math.ceil(amount / 100) * 1);
        if (amount <= 100000) return Math.max(5, Math.ceil(amount / 100) * 1.5);
        return Math.min(10000, Math.ceil(amount / 100) * 2);
    }

    const stampTax = (posTimbreEnabled && method === "CASH") ? getStampTaxAmount(total) : 0
    const unroundedTotalTTC = total + stampTax
    const posCashRoundingEnabled = storeData?.posCashRounding ?? true
    const getRoundedAmount = (val: number) => Math.round(val / 5) * 5
    const finalTotalTTC = (method === "CASH" && posCashRoundingEnabled) ? getRoundedAmount(unroundedTotalTTC) : unroundedTotalTTC
    const roundingDifference = finalTotalTTC - unroundedTotalTTC

    const [printerReceipt, setPrinterReceipt] = useState("default")
    const [printerA4, setPrinterA4] = useState("default")

    useEffect(() => {
        if (isOpen) {
            try {
                const stored = localStorage.getItem("pos_printing_prefs")
                if (stored) {
                    const prefs = JSON.parse(stored)
                    if (prefs.printerReceipt) setPrinterReceipt(prefs.printerReceipt)
                    if (prefs.printerA4) setPrinterA4(prefs.printerA4)
                }
            } catch (err) {
                console.error("Failed to load local printing prefs:", err)
            }
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            // Blur any parent page inputs to prevent capturing keyboard events
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }
        }
    }, [isOpen])

    const [tenderedStr, setTenderedStr] = useState(finalTotalTTC.toString())
    const tenderedAmount = tenderedStr ? parseFloat(tenderedStr) : 0
    const changeAmount = Math.max(0, tenderedAmount - finalTotalTTC)

    const handleConfirm = async (shouldPrint: boolean) => {
        if (storeData?.posVendorRequired && !selectedVendorId) {
            toast.error("Veuillez sélectionner un vendeur pour continuer.")
            return
        }
        const finalAccountId = accountId === "none" ? undefined : accountId
        const actualPaidAmount = method === "CASH"
            ? (finalTotalTTC < 0 ? Math.max(tenderedAmount, finalTotalTTC) : Math.min(tenderedAmount, finalTotalTTC))
            : finalTotalTTC
        const result = await onConfirm(
            method,
            actualPaidAmount,
            finalAccountId,
            stampTax,
            subtotal,
            tvaAmount,
            finalTotalTTC,
            selectedVendorId,
            shouldPrint,
            printTicket,
            printBL,
            printWarranty
        )
        if (result && result.success) {
            handleClose()
        }
    }

    const handleClose = () => {
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

    // Keyboard support
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement
            if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
                const isInsideModalOrPopover = activeEl.closest('[role="dialog"]') || activeEl.closest('[data-radix-popper-content-wrapper]')
                if (isInsideModalOrPopover) {
                    return
                }
            }

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
                    handleConfirm(true)
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
    }, [isOpen, handleNumpad, loading, method, tenderedAmount, finalTotalTTC, hasCustomer])

    // Success View is bypassed to return directly to POS


    return (
        <Modal
            title={t("checkoutTitle")}
            description={t("checkoutDesc")}
            isOpen={isOpen}
            onClose={handleClose}
            className="sm:max-w-4xl w-[95vw] sm:w-[90vw] p-0 rounded-2xl bg-slate-100 dark:bg-zinc-950 shadow-2xl overflow-hidden h-auto max-h-[90dvh] flex flex-col"
        >
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">

                    {/* Left Side: Totals + Payment Method + Account + Quick Cash */}
                    <div className="flex-1 flex flex-col gap-4">

                        {/* Total Due */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-2xl p-4 sm:p-5 text-center border border-blue-100 dark:border-blue-900/30 shadow-md">
                            <p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{t("totalDue")}</p>
                            <div className="text-4xl sm:text-5xl leading-none font-black text-blue-700 dark:text-blue-300 tracking-tighter">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(finalTotalTTC)}
                                <span className="text-xl text-blue-500 font-bold ml-2">DA</span>
                            </div>
                            {(stampTax > 0 || roundingDifference !== 0) && (
                                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-blue-800 dark:text-blue-400/80 font-medium">
                                    <span>Sous-total: {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(total)} DA</span>
                                    {stampTax > 0 && (
                                        <span className="text-amber-600 font-bold">Timbre: +{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(stampTax)} DA</span>
                                    )}
                                    {roundingDifference !== 0 && (
                                        <span className={cn(
                                            "font-bold font-mono px-2.5 py-0.5 rounded-full text-[10px] shadow-sm select-none border",
                                            roundingDifference > 0
                                                ? "bg-amber-50/80 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30"
                                                : "bg-emerald-50/80 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                                        )}>
                                            Arrondi: {roundingDifference > 0 ? "+" : ""}{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(roundingDifference)} DA
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Payment Method — 2 rows on mobile, 1 row on bigger */}
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
                                        "flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl border transition-all duration-200 cursor-pointer gap-1",
                                        method === key
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300 text-gray-500"
                                    )}
                                >
                                    <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={1.5} />
                                    <span className="font-bold text-[8px] sm:text-[9px] text-center leading-tight">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Vendor Selector - Displayed when there are salespeople available in system */}
                        {sellers.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                    Vendeur / Commercial {storeData?.posVendorRequired && <span className="text-red-500">*</span>}
                                </Label>
                                <Select
                                    value={selectedVendorId}
                                    onValueChange={(val) => setSelectedVendorId(val)}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="rounded-xl bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800 h-9 text-xs text-gray-950 dark:text-slate-100">
                                        <SelectValue placeholder="Sélectionner le vendeur..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!storeData?.posVendorRequired && (
                                            <SelectItem value="none">Aucun (Par défaut)</SelectItem>
                                        )}
                                        {sellers.map((seller) => (
                                            <SelectItem key={seller.id} value={seller.id}>
                                                {seller.name || "Inconnu"} ({seller.role === "ADMIN" ? "Admin" : seller.role === "CASHIER" ? "Caissier" : "Vendeur"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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

                        {/* Printing Options */}
                        <div className="space-y-2 pt-1">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Printer className="h-3 w-3 text-gray-400" /> Options d'impression auto
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => togglePrintTicket(!printTicket)}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                                        printTicket
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500"
                                    )}
                                >
                                    <Printer className="h-3.5 w-3.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[9px] leading-tight">Ticket (80mm)</span>
                                        <span className="text-[7.5px] opacity-70">Impression auto</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => togglePrintBL(!printBL)}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                                        printBL
                                            ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500"
                                    )}
                                >
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[9px] leading-tight">Bon Livraison</span>
                                        <span className="text-[7.5px] opacity-70">Format {storeData?.posBlFormat === "A5" ? "A5" : "A4"}</span>
                                    </div>
                                </button>

                                {storeData?.warrantyEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => togglePrintWarranty(!printWarranty)}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left col-span-1 sm:col-span-2 lg:col-span-1",
                                            printWarranty
                                                ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400"
                                                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500"
                                        )}
                                    >
                                        <Shield className="h-3.5 w-3.5 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[9px] leading-tight">Garantie</span>
                                            <span className="text-[7.5px] opacity-70">Bon Garantie</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Numpad (dimmed when not CASH) */}
                    <div className={cn(
                        "w-full lg:w-[310px] flex flex-col gap-3 transition-all duration-300",
                        method !== "CASH" ? "opacity-30 pointer-events-none blur-[1px]" : "opacity-100"
                    )}>
                        {/* Tendered Amount */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 rounded-2xl px-5 py-4 border border-amber-100 dark:border-amber-900/30 text-right shadow-md relative">
                            <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">{t("tendered")}</p>
                            <p className="text-4xl sm:text-5xl font-black text-amber-700 dark:text-amber-300 tracking-tight">
                                {tenderedStr ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tenderedAmount) : "0"}
                                <span className="text-lg text-amber-500 font-bold ml-1.5">DA</span>
                            </p>
                        </div>

                        {/* Change / Remaining */}
                        {(() => {
                            const balanceState = tenderedAmount === finalTotalTTC
                                ? "exact"
                                : changeAmount > 0
                                    ? "change"
                                    : "debt";

                            const balanceStyles = {
                                change: {
                                    container: "bg-gradient-to-r from-emerald-50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300",
                                    text: "text-emerald-700 dark:text-emerald-400",
                                    value: "text-emerald-600 dark:text-emerald-400"
                                },
                                exact: {
                                    container: "bg-gradient-to-r from-teal-50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/10 border-teal-200 dark:border-teal-900/40 text-teal-800 dark:text-teal-300",
                                    text: "text-teal-700 dark:text-teal-400",
                                    value: "text-teal-600 dark:text-teal-400"
                                },
                                debt: {
                                    container: "bg-gradient-to-r from-rose-50 to-red-50/50 dark:from-rose-950/20 dark:to-red-950/10 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300",
                                    text: "text-rose-700 dark:text-rose-400",
                                    value: "text-rose-600 dark:text-rose-400"
                                }
                            }[balanceState];

                            return (
                                <div className={cn(
                                    "flex flex-row justify-between items-center px-4 py-3 rounded-xl border shadow-sm transition-all duration-300",
                                    balanceStyles.container
                                )}>
                                    <span className={cn("font-bold text-base", balanceStyles.text)}>
                                        {balanceState === "change"
                                            ? t("change")
                                            : balanceState === "exact"
                                                ? "Règlement Exact"
                                                : t("balance")
                                        }
                                    </span>
                                    <span className={cn("text-xl font-black", balanceStyles.value)}>
                                        {balanceState === "change"
                                            ? `+${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(changeAmount)} DA`
                                            : balanceState === "exact"
                                                ? "0.00 DA"
                                                : `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.max(0, finalTotalTTC - tenderedAmount))} DA`
                                        }
                                    </span>
                                </div>
                            );
                        })()}

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    className="h-10 sm:h-12 rounded-xl text-md sm:text-lg font-bold shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850/60 transition-all text-gray-900 dark:text-white"
                                    onClick={() => handleNumpad(num)}
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button variant="outline" className="h-10 sm:h-12 rounded-xl text-lg font-bold text-red-500 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shadow-sm" onClick={() => handleNumpad("C")}>C</Button>
                            <Button variant="outline" className="h-10 sm:h-12 rounded-xl text-lg font-bold shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850/60 transition-all text-gray-900 dark:text-white" onClick={() => handleNumpad("0")}>0</Button>
                            <Button variant="outline" className="h-10 sm:h-12 rounded-xl text-md font-bold shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850/60 transition-all text-gray-900 dark:text-white" onClick={() => handleNumpad("00")}>00</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 rounded-b-2xl shrink-0 mt-auto">
                <Button disabled={loading} variant="ghost" className="w-full sm:w-auto h-10 sm:h-11 px-5 rounded-xl font-bold text-xs sm:text-sm" onClick={handleClose}>
                    {t("cancel")} <span className="text-[9px] opacity-40 ml-1 hidden sm:inline">Esc</span>
                </Button>
                <Button
                    disabled={loading || (method === "CASH" && tenderedAmount < finalTotalTTC && !hasCustomer)}
                    variant="outline"
                    className="w-full sm:w-auto h-10 sm:h-11 px-5 rounded-xl font-bold text-xs sm:text-sm border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-950/20 shadow-sm transition-all disabled:opacity-50"
                    onClick={() => handleConfirm(false)}
                >
                    {loading ? t("processing") : t("saveOnly")}
                </Button>
                <Button
                    disabled={loading || (method === "CASH" && tenderedAmount < finalTotalTTC && !hasCustomer)}
                    className="w-full sm:w-auto h-10 sm:h-11 px-6 rounded-xl font-black text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl transition-all disabled:opacity-50"
                    onClick={() => handleConfirm(true)}
                >
                    {loading ? t("processing") : t("saveAndPrint")}
                    {!loading && <span className="text-[10px] opacity-60 font-bold tracking-widest ml-2 hidden sm:inline">Enter</span>}
                </Button>
            </div>
        </Modal>
    )
}
