"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, ArrowRightLeft, ArrowRight, Wallet, History, TrendingUp, Filter, Activity, Calendar as CalendarIcon, RefreshCw, Building, Search, Calculator } from "lucide-react"
import { format } from "date-fns"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { TreasuryAccountColumn } from "./types"
import { AccountModal } from "./account-modal"
import { TransactionModal } from "./transaction-modal"
import { TransferModal } from "./transfer-modal"
import { ReconciliationModal } from "./reconciliation-modal"
import { MouvementsClient } from "./mouvements-client"
import { TreasuryMovementColumn } from "./mouvements-columns"
import { AnalyticsTab } from "./analytics-tab"
import { cn } from "@/lib/utils"

import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRange } from "react-day-picker"

interface TreasuryClientProps {
    accounts: TreasuryAccountColumn[]
    movements: TreasuryMovementColumn[]
}

export const TreasuryClient: React.FC<TreasuryClientProps> = ({
    accounts,
    movements
}) => {
    const [isAccountOpen, setIsAccountOpen] = useState(false)
    const [isTransactionOpen, setIsTransactionOpen] = useState(false)
    const [isTransferOpen, setIsTransferOpen] = useState(false)
    const [isReconciliationOpen, setIsReconciliationOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"accounts" | "movements" | "analytics">("accounts")

    // Global Filter States
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [selectedAccount, setSelectedAccount] = useState<string>("ALL")
    const [selectedSource, setSelectedSource] = useState<string>("ALL")
    
    // Manual transaction type pre-selection
    const [defaultTransactionType, setDefaultTransactionType] = useState<"CREDIT" | "DEBIT">("CREDIT")

    // Listen to URL action queries for Hors-ERP flows
    const searchParams = useSearchParams()
    const urlAction = searchParams?.get("action")

    useEffect(() => {
        if (urlAction === "manual-credit") {
            setDefaultTransactionType("CREDIT")
            setIsTransactionOpen(true)
        } else if (urlAction === "manual-debit") {
            setDefaultTransactionType("DEBIT")
            setIsTransactionOpen(true)
        } else if (urlAction === "transfer") {
            setIsTransferOpen(true)
        }
    }, [urlAction])

    // Memoized Filtered Movements
    const filteredMovements = useMemo(() => {
        let result = movements

        if (selectedAccount !== "ALL") {
            const accName = accounts.find(a => a.id === selectedAccount)?.name
            if (accName) {
                result = result.filter(item => item.accountName === accName)
            }
        }

        if (selectedSource !== "ALL") {
            if (selectedSource === "CREDIT_TYPE") {
                result = result.filter(item => item.type === "CREDIT")
            } else if (selectedSource === "DEBIT_TYPE") {
                result = result.filter(item => item.type === "DEBIT")
            } else if (selectedSource === "PAIEMENT_CLIENT") {
                result = result.filter(item => item.source === "SALE" || item.source === "CUSTOMER_PAYMENT" || (item.source === "MANUAL_IN" && !item.description?.toLowerCase().includes("emprunt") && !item.description?.toLowerCase().includes("retour")))
            } else if (selectedSource === "PAIEMENT_FOURNISSEUR") {
                result = result.filter(item => item.source === "PURCHASE" || item.source === "SUPPLIER_PAYMENT" || (item.source === "MANUAL_OUT" && !item.description?.toLowerCase().includes("emprunt") && !item.description?.toLowerCase().includes("prêt") && !item.description?.toLowerCase().includes("retour")))
            } else if (selectedSource === "RETOUR_CLIENT") {
                result = result.filter(item => (item.source === "RETURN" && item.type === "DEBIT") || (item.source === "MANUAL_OUT" && item.description?.toLowerCase().includes("retour")))
            } else if (selectedSource === "RETOUR_FOURNISSEUR") {
                result = result.filter(item => (item.source === "RETURN" && item.type === "CREDIT") || (item.source === "MANUAL_IN" && item.description?.toLowerCase().includes("retour")))
            } else if (selectedSource === "EMPRUNT_CLIENT") {
                result = result.filter(item => (item.source === "LOAN" && item.type === "DEBIT") || (item.source === "CUSTOMER_LOAN") || (item.source === "MANUAL_OUT" && (item.description?.toLowerCase().includes("emprunt") || item.description?.toLowerCase().includes("prêt"))))
            } else if (selectedSource === "EMPRUNT_FOURNISSEUR") {
                result = result.filter(item => (item.source === "LOAN" && item.type === "CREDIT") || (item.source === "SUPPLIER_LOAN") || (item.source === "MANUAL_IN" && (item.description?.toLowerCase().includes("emprunt") || item.description?.toLowerCase().includes("prêt"))))
            } else {
                result = result.filter(item => item.source === selectedSource)
            }
        }

        if (dateRange?.from) {
            const fromTime = dateRange.from.getTime()
            const toTime = dateRange.to ? dateRange.to.getTime() + 86400000 : fromTime + 86400000

            result = result.filter(item => {
                const itemTime = new Date(item.rawDate).getTime()
                return itemTime >= fromTime && itemTime <= toTime
            })
        }

        return result
    }, [movements, accounts, selectedAccount, selectedSource, dateRange])

    return (
        <div className="space-y-6">
            <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
            <TransactionModal accounts={accounts} isOpen={isTransactionOpen} onClose={() => setIsTransactionOpen(false)} defaultType={defaultTransactionType} />
            <TransferModal accounts={accounts} isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
            <ReconciliationModal accounts={accounts} isOpen={isReconciliationOpen} onClose={() => setIsReconciliationOpen(false)} />

            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Premium Tab Switcher */}
                <div className="flex items-center gap-2 p-1 bg-gray-100/80 dark:bg-gray-800/50 rounded-xl w-fit backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                    <button
                        onClick={() => setActiveTab("accounts")}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                            activeTab === "accounts"
                                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <Wallet className="w-4 h-4" />
                        Comptes & Caisses
                    </button>
                    <button
                        onClick={() => setActiveTab("movements")}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                            activeTab === "movements"
                                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <History className="w-4 h-4" />
                        Historique
                    </button>
                    <button
                        onClick={() => setActiveTab("analytics")}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                            activeTab === "analytics"
                                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Analyses & Rapports
                    </button>
                </div>

            </div>

            {/* Premium Filter Area (shown for history and analytics tabs) */}
            {activeTab !== "accounts" && (
                <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 my-6 relative overflow-hidden group animate-in fade-in slide-in-from-top-2">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <Filter className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-200">Filtres Globaux</h3>
                        </div>
                        {(selectedAccount !== "ALL" || selectedSource !== "ALL" || dateRange !== undefined) && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                    setSelectedAccount("ALL")
                                    setSelectedSource("ALL")
                                    setDateRange(undefined)
                                }}
                                className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2 h-8"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Réinitialiser</span>
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Wallet className="w-3 h-3" /> Caisse / Banque
                            </label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 rounded-xl shadow-inner">
                                    <SelectValue placeholder="Tous les comptes" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                    <SelectItem value="ALL">Tous les comptes</SelectItem>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3 h-3" /> Type d'opération
                            </label>
                            <Select value={selectedSource} onValueChange={setSelectedSource}>
                                <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 rounded-xl shadow-inner">
                                    <SelectValue placeholder="Tous les types" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                    <SelectItem value="ALL">Tous les types</SelectItem>
                                    <SelectItem value="CREDIT_TYPE">Entrée (Crédit)</SelectItem>
                                    <SelectItem value="DEBIT_TYPE">Sortie (Débit)</SelectItem>
                                    <SelectItem value="PAIEMENT_CLIENT">Paiement Client</SelectItem>
                                    <SelectItem value="PAIEMENT_FOURNISSEUR">Paiement Fournisseur</SelectItem>
                                    <SelectItem value="RETOUR_CLIENT">Retour Client</SelectItem>
                                    <SelectItem value="RETOUR_FOURNISSEUR">Retour Fournisseur</SelectItem>
                                    <SelectItem value="EXPENSE">Dépense</SelectItem>
                                    <SelectItem value="EMPRUNT_CLIENT">Emprunt Client</SelectItem>
                                    <SelectItem value="EMPRUNT_FOURNISSEUR">Emprunt Fournisseur</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarIcon className="w-3 h-3" /> Période
                            </label>
                            <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-emerald-500/50 transition-all shadow-inner w-full">
                                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "accounts" ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Heading
                            title={`Comptes (${accounts.length})`}
                            description="Gérez vos caisses et comptes bancaires"
                        />
                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={() => setIsReconciliationOpen(true)}>
                                <Calculator className="mr-2 h-4 w-4" />
                                Rapprochement
                            </Button>
                            <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Transfert
                            </Button>
                            <Button onClick={() => setIsTransactionOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                Nouvelle Transaction
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <DataTable exportTitle={"Export"} exportDescription={""} searchKey="name" columns={columns} data={accounts} />
                </div>
            ) : activeTab === "movements" ? (
                <MouvementsClient data={filteredMovements} />
            ) : (
                <AnalyticsTab movements={filteredMovements} accounts={accounts} dateRange={dateRange} selectedAccount={selectedAccount} />
            )}
        </div>
    )
}
