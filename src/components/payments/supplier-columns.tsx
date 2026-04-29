"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CellAction } from "./cell-action"

export type SupplierPaymentColumn = {
    id: string
    date: string
    amount: number
    source: string
    description: string
    accountName: string
    accountId: string
    supplierName: string
    supplierId?: string
}

export const useSupplierPaymentColumns = () => {
    const columns: ColumnDef<SupplierPaymentColumn>[] = [
        {
            accessorKey: "date",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
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
            accessorKey: "amount",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Montant
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-red-600">
                    {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        .format(row.original.amount)} DA
                </div>
            )
        },
        {
            accessorKey: "accountName",
            header: "Modalité",
            cell: ({ row }) => (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full dark:bg-purple-900/30 dark:text-purple-300">
                    {row.original.accountName}
                </span>
            )
        },
        {
            accessorKey: "source",
            header: "Type",
            cell: ({ row }) => {
                const source = row.original.source
                if (source === "PURCHASE") {
                    return <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/30 dark:text-blue-300">Achat</span>
                }
                if (source === "MANUAL_OUT") {
                    return <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full dark:bg-amber-900/30 dark:text-amber-300">Règlement</span>
                }
                return source
            }
        },
        {
            accessorKey: "description",
            header: "Observation",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description || "-"}</span>
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                // Adapt to the same CellAction by mapping fields
                const adapted = {
                    ...row.original,
                    customerName: row.original.supplierName,
                    customerId: row.original.supplierId,
                }
                return <CellAction data={adapted as any} />
            }
        }
    ]

    return columns
}
