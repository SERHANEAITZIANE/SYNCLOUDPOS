"use client"

import { useState } from "react"
import { Plus, ArrowRightLeft, ArrowRight, Wallet, History } from "lucide-react"

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
import { cn } from "@/lib/utils"

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
    const [activeTab, setActiveTab] = useState<"accounts" | "movements">("accounts")

    return (
        <div className="space-y-6">
            <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
            <TransactionModal accounts={accounts} isOpen={isTransactionOpen} onClose={() => setIsTransactionOpen(false)} />
            <TransferModal accounts={accounts} isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />

            {/* Premium Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-gray-100/80 dark:bg-gray-800/50 rounded-xl w-fit backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <button
                    onClick={() => setActiveTab("accounts")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
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
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                        activeTab === "movements"
                            ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <History className="w-4 h-4" />
                    Historique des Mouvements
                </button>
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
                            <Button onClick={() => setIsAccountOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="mr-2 h-4 w-4" />
                                Nouveau Compte
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <DataTable searchKey="name" columns={columns} data={accounts} />
                </div>
            ) : (
                <MouvementsClient data={movements} accounts={accounts} />
            )}
        </div>
    )
}
