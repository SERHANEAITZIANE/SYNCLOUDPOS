"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

import { Link } from "@/i18n/routing"
import { Eye } from "lucide-react"

export type TreasuryMovementColumn = {
    id: string
    date: string
    rawDate: Date
    type: string
    amount: string
    balanceAfter: string
    source: string
    description: string
    accountName: string
    referenceId: string | null
}

export const columns: ColumnDef<TreasuryMovementColumn>[] = [
    {
        accessorKey: "date",
        header: "Date",
    },
    {
        accessorKey: "accountName",
        header: "Compte / Caisse",
        cell: ({ row }) => <div className="font-semibold">{row.getValue("accountName")}</div>
    },
    {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => {
            const source = row.getValue("source") as string
            return <Badge variant="outline">{source}</Badge>
        }
    },
    {
        accessorKey: "description",
        header: "Observations",
    },
    {
        accessorKey: "amount",
        header: "Entrée / Sortie",
        cell: ({ row }) => {
            const type = row.original.type
            const amount = row.getValue("amount") as string
            if (type === "CREDIT") {
                return <div className="text-green-600 font-bold">+{amount}</div>
            }
            return <div className="text-red-600 font-bold">-{amount}</div>
        }
    },
    {
        accessorKey: "balanceAfter",
        header: "Solde Final",
        cell: ({ row }) => <div className="font-bold">{row.getValue("balanceAfter")}</div>
    },
    {
        accessorKey: "referenceId",
        header: "Opération",
        cell: ({ row }) => {
            const refId = row.original.referenceId
            const source = row.original.source
            if (!refId) return <span className="text-muted-foreground">-</span>

            let href = ""
            let label = "Détail"

            if (source === "SALE") {
                href = `/sales/${refId}`
                label = "Vente"
            } else if (source === "PURCHASE") {
                href = `/purchases/${refId}`
                label = "Achat"
            } else if (source === "EXPENSE") {
                href = `/expenses/${refId}`
                label = "Dépense"
            } else if (source === "TRANSFER") {
                href = `/transfers`
                label = "Transfert"
            } else if (source === "LOAN") {
                const desc = (row.original.description || "").toLowerCase()
                if (desc.includes("fournisseur") || desc.includes("supplier")) {
                    href = `/emprunt-fournisseur`
                } else {
                    href = `/emprunt`
                }
                label = "Emprunt"
            } else if (source === "RETURN") {
                href = `/retours`
                label = "Retour"
            } else if (source === "PAYMENT" || source === "MANUAL_IN" || source === "MANUAL_OUT") {
                const txId = row.original.id
                const desc = (row.original.description || "").toLowerCase()
                if (desc.includes("fournisseur") || desc.includes("supplier")) {
                    href = `/payments/suppliers?paymentId=${txId}`
                } else {
                    href = `/payments?paymentId=${txId}`
                }
                label = "Paiement"
            }

            if (!href) return <span className="text-xs text-muted-foreground">Autre</span>

            return (
                <Link
                    href={href}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline flex items-center gap-1 text-xs"
                >
                    <Eye className="h-3 w-3" />
                    <span>{label}</span>
                </Link>
            )
        }
    }
]
