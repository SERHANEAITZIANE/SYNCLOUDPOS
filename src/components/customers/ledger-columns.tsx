"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { LedgerLine } from "@/actions/ledger"

import { Link } from "@/i18n/routing"
import { Eye } from "lucide-react"

export const useLedgerColumns = (): ColumnDef<LedgerLine>[] => {

    const formatCurrency = (amount: number) => {
        if (amount === 0) return "-"
        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .format(amount) + ' DA'
    }

    return [
        {
            accessorKey: "date",
            header: "Date Heure",
            cell: ({ row }) => format(new Date(row.original.date), "dd/MM/yyyy HH:mm:ss")
        },
        {
            accessorKey: "debit",
            header: "Vente/Emprunt",
            cell: ({ row }) => (
                <div className="text-right text-red-600 font-medium">
                    {formatCurrency(row.original.debit)}
                </div>
            )
        },
        {
            accessorKey: "credit",
            header: "Paiement",
            cell: ({ row }) => (
                <div className="text-right text-emerald-600 font-medium">
                    {formatCurrency(row.original.credit)}
                </div>
            )
        },
        {
            accessorKey: "balance",
            header: "Solde",
            cell: ({ row }) => {
                const isNegative = row.original.balance > 0; // Positive balance means they owe us (debt)
                return (
                    <div className={`text-right font-bold ${isNegative ? "text-red-700" : "text-emerald-700"}`}>
                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            .format(row.original.balance)} DA
                    </div>
                )
            }
        },
        {
            accessorKey: "observation",
            header: "Observations",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.observation}</span>
        },
        {
            id: "actions",
            header: "Détails",
            cell: ({ row }) => {
                const line = row.original
                let href = ""
                let label = "Détail"

                if (line.id.startsWith("sale-")) {
                    href = `/sales/${line.reference}`
                    label = "Vente"
                } else if (line.id.startsWith("pay-")) {
                    const payId = line.id.replace("pay-", "")
                    href = `/payments?paymentId=${payId}`
                    label = "Paiement"
                } else if (line.id.startsWith("return-")) {
                    href = `/retours`
                    label = "Retour"
                } else if (line.id.startsWith("loan-")) {
                    href = `/emprunt`
                    label = "Emprunt"
                }

                if (!href || line.category === "INITIAL") return null

                return (
                    <Link
                        href={href}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline flex items-center gap-1 no-print text-xs"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{label}</span>
                    </Link>
                )
            }
        }
    ]
}
