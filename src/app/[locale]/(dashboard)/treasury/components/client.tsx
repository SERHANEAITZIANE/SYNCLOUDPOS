"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, ArrowRightLeft, ArrowRight, Wallet, History, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { TreasuryAccountColumn } from "./types"
import { AccountModal } from "./account-modal"
import { TransactionModal } from "./transaction-modal"
import { TransferModal } from "./transfer-modal"
import { MouvementsClient } from "./mouvements-client"
import { TreasuryMovementColumn } from "./mouvements-columns"
import { AnalyticsTab } from "./analytics-tab"
import { cn } from "@/lib/utils"

import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRange } from "react-day-picker"
import { useSearchParams } from "next/navigation"

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
    const [activeTab, setActiveTab] = useState<"accounts" | "movements" | "analytics">("accounts")

    // Global Filter States
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [selectedAccount, setSelectedAccount] = useState<string>("ALL")
    
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

        if (dateRange?.from) {
            const fromTime = dateRange.from.getTime()
            const toTime = dateRange.to ? dateRange.to.getTime() + 86400000 : fromTime + 86400000

            result = result.filter(item => {
                const itemTime = new Date(item.rawDate).getTime()
                return itemTime >= fromTime && itemTime <= toTime
            })
        }

        return result
    }, [movements, accounts, selectedAccount, dateRange])

    return (
        <div className="space-y-6">
            <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
            <TransactionModal accounts={accounts} isOpen={isTransactionOpen} onClose={() => setIsTransactionOpen(false)} defaultType={defaultTransactionType} />
            <TransferModal accounts={accounts} isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />

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

                {/* Global Filters (shown for history and analytics tabs) */}
                {activeTab !== "accounts" && (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="w-[180px] h-9 text-xs font-semibold">
                                <SelectValue placeholder="Tous les comptes" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[9999]">
                                <SelectItem value="ALL">Tous les comptes</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-[250px] sm:w-[280px]"
                        />
                    </div>
                )}
            </div>

            {activeTab === "accounts" ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Heading
                            title={`Comptes (${accounts.length})`}
                            description="Gérez vos caisses et comptes bancaires"
                        />
                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Virement
                            </Button>
                            <Button variant="outline" onClick={() => setIsTransactionOpen(true)}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Saisie Manuelle
                            </Button>
                            <Button onClick={() => setIsAccountOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                <Plus className="mr-2 h-4 w-4" />
                                Nouveau Compte
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
