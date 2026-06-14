"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CellAction } from "./cell-action"

export type SupplierLoanColumn = {
    id: string
    date: string
    amount: number
    description: string
    supplierName: string
    supplierId?: string
    accountId?: string
    accountName?: string
}

export const useSupplierLoanColumns = (treasuryAccounts: { id: string; name: string; type: string }[]) => {
    const columns: ColumnDef<SupplierLoanColumn>[] = [
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
            cell: ({ row }) => format(new Date(row.original.date), "dd/MM/yyyy HH:mm")
        },
        {
            accessorKey: "supplierName",
            header: "Fournisseur",
            cell: ({ row }) => (
                <div className="font-medium">{row.original.supplierName}</div>
            )
        },
        {
            accessorKey: "accountName",
            header: "Banque / Caisse",
            cell: ({ row }) => (
                <div className="text-sm font-medium text-muted-foreground">{row.original.accountName || "-"}</div>
            )
        },
        {
            id: "paymentMode",
            header: "Mode de règlement",
            cell: ({ row }) => {
                const account = treasuryAccounts.find(a => a.id === row.original.accountId || a.name === row.original.accountName)
                const type = account ? (account.type === "BANK" ? "Banque" : "Caisse") : "-"
                return (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${type === "Banque" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
                        {type}
                    </span>
                )
            }
        },
        {
            accessorKey: "amount",
            header: "Montant",
            cell: ({ row }) => (
                <div className="font-semibold text-orange-600">
                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        .format(row.original.amount)} DA
                </div>
            )
        },
        {
            accessorKey: "description",
            header: "Observation",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.description || "-"}</span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} treasuryAccounts={treasuryAccounts} />
        }
    ]
    return columns
}
