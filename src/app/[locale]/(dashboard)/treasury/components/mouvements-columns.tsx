"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Eye } from "lucide-react"
import { Link } from "@/i18n/routing"

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
    referenceNumber?: string | null
    accountId?: string
}

import { MovementCellAction } from "./movement-cell-action"

export function getOperationInfo(row: TreasuryMovementColumn) {
    const refId = row.referenceId
    const source = row.source
    const type = row.type
    const isCaisseDirect = ["INITIAL_BALANCE", "MANUAL_IN", "MANUAL_OUT"].includes(source)
    if (!refId && !isCaisseDirect) return { href: "", label: "-" }

    let href = ""
    let label = ""

    const txId = row.id
    const desc = (row.description || "").toLowerCase()
    const accId = row.accountId
    
    const isRetour = source === "RETURN" || desc.includes("retour client") || desc.includes("retour fournisseur")
    const isEmprunt = source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN" || desc.includes("emprunt") || desc.includes("prêt")
    const refNumber = row.referenceNumber

    if (isCaisseDirect) {
        href = accId ? `/treasury/${accId}` : ""
        if (source === "INITIAL_BALANCE") label = "Solde Initial"
        else if (source === "MANUAL_IN") label = "Entrée Caisse"
        else if (source === "MANUAL_OUT") label = "Sortie Caisse"
    } else if (isRetour) {
        href = `/retours?returnId=${refId}`
        label = type === "DEBIT" ? "Retour Client" : "Retour Fournisseur"
        if (refNumber) label += ` (${refNumber})`
    } else if (isEmprunt) {
        if (type === "DEBIT") {
            href = `/emprunt`
            label = "Emprunt Client"
        } else {
            href = `/emprunt-fournisseur`
            label = "Emprunt Fournisseur"
        }
    } else if (source === "SALE") {
        href = `/sales/${refId}`
        label = "Vente POS"
        if (refNumber) label += ` (${refNumber})`
    } else if (source === "CUSTOMER_PAYMENT") {
        href = `/payments?paymentId=${txId}`
        label = "Paiement Client"
        if (refNumber) label += ` (${refNumber})`
    } else if (source === "SUPPLIER_PAYMENT") {
        href = `/payments/suppliers?paymentId=${txId}`
        label = "Paiement Fournisseur"
        if (refNumber) label += ` (${refNumber})`
    } else if (source === "PURCHASE") {
        href = `/purchases/${refId}`
        label = "Achat / BL"
        if (refNumber) label += ` (${refNumber})`
    } else if (source === "EXPENSE") {
        href = `/expenses/${refId}`
        label = "Dépense"
    } else if (source === "TRANSFER") {
        href = `/transfers`
        label = type === "DEBIT" ? "Virement Sortant" : "Virement Entrant"
    } else if (source === "PAYMENT") {
        if (desc.includes("fournisseur") || desc.includes("supplier")) {
            href = `/payments/suppliers?paymentId=${txId}`
            label = "Paiement Fournisseur"
        } else {
            href = `/payments?paymentId=${txId}`
            label = "Paiement Client"
        }
    }

    return { href, label: label || "Autre" }
}

export function getSourceDisplay(row: TreasuryMovementColumn) {
    const source = row.source
    const type = row.type
    const desc = (row.description || "").toLowerCase()
    
    let displaySource = source
    const isRetour = source === "RETURN" || desc.includes("retour client") || desc.includes("retour fournisseur")
    const isEmprunt = source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN" || desc.includes("emprunt") || desc.includes("prêt")

    if (isRetour) {
        displaySource = type === "DEBIT" ? "Retour Client" : "Retour Fournisseur"
    }
    else if (isEmprunt) {
        displaySource = type === "DEBIT" ? "Emprunt Client" : "Emprunt Fournisseur"
    }
    else if (source === "SALE" || source === "MANUAL_IN" || source === "CUSTOMER_PAYMENT") displaySource = "Paiement Client"
    else if (source === "PURCHASE" || source === "MANUAL_OUT" || source === "SUPPLIER_PAYMENT") displaySource = "Paiement Fournisseur"
    else if (source === "PAYMENT") displaySource = "Paiement"
    else if (source === "EXPENSE") displaySource = "Dépense"
    else if (source === "TRANSFER") {
        displaySource = type === "DEBIT" ? "Virement Sortant" : "Virement Entrant"
    }
    else if (source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN") {
        displaySource = type === "DEBIT" ? "Emprunt Client" : "Emprunt Fournisseur"
    }
    else if (source === "INITIAL_BALANCE") displaySource = "Solde Initial"

    return displaySource
}

export const getColumns = (accounts: any[] = []): ColumnDef<TreasuryMovementColumn>[] => [
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
        accessorKey: "accountName",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Compte / Caisse
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-semibold">{row.getValue("accountName")}</div>
    },
    {
        id: "source",
        accessorFn: (row) => getSourceDisplay(row),
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
            const displaySource = getSourceDisplay(row.original)
            return <Badge variant="outline">{displaySource}</Badge>
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
                Solde Final
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
        accessorFn: (row) => getOperationInfo(row).label,
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
            const { href, label } = getOperationInfo(row.original)
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
