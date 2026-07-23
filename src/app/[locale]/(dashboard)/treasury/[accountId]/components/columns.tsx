"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TreasuryTransactionColumn } from "./types"
import { Badge } from "@/components/ui/badge"

import { Link } from "@/i18n/routing"
import { Eye } from "lucide-react"
import { MovementCellAction } from "../../components/movement-cell-action"

export const getColumns = (accounts: any[] = []): ColumnDef<TreasuryTransactionColumn>[] => [
    {
        accessorKey: "date",
        header: "Date",
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
        header: "Solde (Balance)",
        cell: ({ row }) => <div className="font-bold">{row.getValue("balanceAfter")}</div>
    },
    {
        accessorKey: "referenceId",
        header: "Opération",
        cell: ({ row }) => {
            const refId = row.original.referenceId
            const source = row.original.source
            const isCaisseDirect = ["INITIAL_BALANCE", "MANUAL_IN", "MANUAL_OUT"].includes(source)
            if (!refId && !isCaisseDirect) return <span className="text-muted-foreground">-</span>

            let href = ""
            let label = "Autre"

            const txId = row.original.id
            const desc = (row.original.description || "").toLowerCase()
            const accId = row.original.accountId

            if (isCaisseDirect) {
                href = accId ? `/treasury/${accId}` : ""
                if (source === "INITIAL_BALANCE") label = "Solde Initial"
                else if (source === "MANUAL_IN") label = "Entrée Caisse"
                else if (source === "MANUAL_OUT") label = "Sortie Caisse"
            } else if (source === "SALE") {
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
            } else if (source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN") {
                if (source === "SUPPLIER_LOAN" || desc.includes("fournisseur") || desc.includes("supplier")) {
                    href = `/emprunt-fournisseur`
                } else {
                    href = `/emprunt`
                }
                label = "Emprunt"
            } else if (source === "RETURN") {
                href = `/retours`
                label = "Retour"
            } else if (source === "PAYMENT" || source === "CUSTOMER_PAYMENT" || source === "SUPPLIER_PAYMENT") {
                if (source === "SUPPLIER_PAYMENT" || desc.includes("fournisseur") || desc.includes("supplier")) {
                    href = `/payments/suppliers?paymentId=${txId}`
                } else {
                    href = `/payments?paymentId=${txId}`
                }
                label = "Paiement"
            }

            if (!href) return <span className="text-xs text-muted-foreground">{label}</span>

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
    },
    {
        id: "actions",
        cell: ({ row }) => <MovementCellAction data={row.original} accounts={accounts} />
    }
]
