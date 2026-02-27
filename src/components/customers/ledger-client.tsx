"use client"

import * as React from "react"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useLedgerColumns } from "./ledger-columns"
import { LedgerLine } from "@/actions/ledger"

interface LedgerClientProps {
    data: LedgerLine[]
    finalBalance: number
    customerName: string
}

export const LedgerClient: React.FC<LedgerClientProps> = ({
    data,
    finalBalance,
    customerName
}) => {
    const columns = useLedgerColumns()

    const totalDebits = data.reduce((acc, curr) => acc + curr.debit, 0)
    const totalCredits = data.reduce((acc, curr) => acc + curr.credit, 0)

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .format(val) + ' DA'
    }

    const isOwed = finalBalance > 0

    return (
        <>
            <div className="flex items-center justify-between pb-4">
                <Heading
                    title={`Log d'un client: ${customerName}`}
                    description="Historique détaillé des ventes, emprunts et paiements"
                />
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimer
                </Button>
            </div>

            <Separator />

            {/* Top Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-sm text-red-600 font-semibold mb-1">Total Vente/Emprunt</span>
                    <span className="text-xl font-bold text-red-700">{formatCurrency(totalDebits)}</span>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-sm text-emerald-600 font-semibold mb-1">Total Paiement</span>
                    <span className="text-xl font-bold text-emerald-700">{formatCurrency(totalCredits)}</span>
                </div>
                <div className={`p-4 border rounded-lg flex flex-col items-center justify-center ${isOwed ? 'bg-red-50 border-red-200 dark:bg-red-900/30' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30'}`}>
                    <span className={`text-sm font-semibold mb-1 ${isOwed ? 'text-red-600' : 'text-emerald-600'}`}>Solde Actuel</span>
                    <span className={`text-2xl font-black ${isOwed ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(finalBalance)}</span>
                </div>
            </div>

            <div className="border rounded-md">
                <DataTable searchKey="observation" columns={columns} data={data} />
            </div>
        </>
    )
}
