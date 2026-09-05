"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TreasuryTransactionColumn } from "./types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Eye } from "lucide-react"
import { Link } from "@/i18n/routing"
import { MovementCellAction } from "../../components/movement-cell-action"

export function getAccountOperationInfo(row: TreasuryTransactionColumn) {
    const refId = row.referenceId
    const source = row.source
    const type = row.type
    const isCaisseDirect = ["INITIAL_BALANCE", "MANUAL_IN", "MANUAL_OUT"].includes(source)
    if (!refId && !isCaisseDirect) return { href: "", label: "-" }

    let href = ""
    let label = "Autre"

    const txId = row.id
    const desc = (row.description || "").toLowerCase()
    const accId = row.accountId

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
        label = type === "DEBIT" ? "Virement Sortant" : "Virement Entrant"
    } else if (source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN") {
        if (source === "SUPPLIER_LOAN" || desc.includes("fournisseur") || desc.includes("supplier")) {
            href = `/emprunt-fournisseur`
            label = "Emprunt Fournisseur"
        } else {
            href = `/emprunt`
            label = "Emprunt Client"
        }
    } else if (source === "RETURN") {
        href = `/retours`
        label = type === "DEBIT" ? "Retour Client" : "Retour Fournisseur"
    } else if (source === "PAYMENT" || source === "CUSTOMER_PAYMENT" || source === "SUPPLIER_PAYMENT") {
        if (source === "SUPPLIER_PAYMENT" || desc.includes("fournisseur") || desc.includes("supplier")) {
            href = `/payments/suppliers?paymentId=${txId}`
            label = "Paiement Fournisseur"
        } else {
            href = `/payments?paymentId=${txId}`
            label = "Paiement Client"
        }
    }

    return { href, label }
}

export const getColumns = (accounts: any[] = []): ColumnDef<TreasuryTransactionColumn>[] => [
    {
        accessorKey: "date",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        sortingFn: (rowA, rowB) => {
            const dateA = new Date(rowA.original.rawDate || rowA.original.date).getTime()
            const dateB = new Date(rowB.original.rawDate || rowB.original.date).getTime()
            return dateA - dateB
        }
    },
    {
        accessorKey: "source",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Source
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const source = row.getValue("source") as string
            return <Badge variant="outline">{source}</Badge>
        }
    },
    {
        accessorKey: "description",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Observations
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-sm whitespace-normal break-words max-w-[280px]" title={row.original.description || ""}>
                {row.original.description || <span className="text-muted-foreground">-</span>}
            </div>
        )
    },
    {
        accessorKey: "amount",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Entrée / Sortie
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        sortingFn: (rowA, rowB) => {
            const numA = (rowA.original.type === "CREDIT" ? 1 : -1) * (parseFloat(String(rowA.original.amount).replace(/[^0-9.-]/g, "")) || 0)
            const numB = (rowB.original.type === "CREDIT" ? 1 : -1) * (parseFloat(String(rowB.original.amount).replace(/[^0-9.-]/g, "")) || 0)
            return numA - numB
        },
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
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Solde (Balance)
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        sortingFn: (rowA, rowB) => {
            const numA = parseFloat(String(rowA.original.balanceAfter).replace(/[^0-9.-]/g, "")) || 0
            const numB = parseFloat(String(rowB.original.balanceAfter).replace(/[^0-9.-]/g, "")) || 0
            return numA - numB
        },
        cell: ({ row }) => <div className="font-bold">{row.getValue("balanceAfter")}</div>
    },
    {
        id: "operation",
        accessorFn: (row) => getAccountOperationInfo(row).label,
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Opération
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const { href, label } = getAccountOperationInfo(row.original)
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
