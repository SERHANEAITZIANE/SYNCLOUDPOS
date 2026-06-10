"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CellAction } from "./cell-action"

export type SpoilageColumn = {
    id: string
    productId: string
    productName: string
    quantity: number
    reason: string
    date: Date
    userName: string
}

export const columns: ColumnDef<SpoilageColumn>[] = [
    {
        accessorKey: "productName",
        header: "Produit",
    },
    {
        accessorKey: "quantity",
        header: "Quantité",
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            return format(new Date(row.original.date), 'dd/MM/yyyy' + ' HH:mm', { locale: fr })
        }
    },
    {
        accessorKey: "reason",
        header: "Motif",
    },
    {
        accessorKey: "userName",
        header: "Déclaré par",
    },
    {
        id: "actions",
        cell: ({ row, table }) => <CellAction data={row.original} products={(table.options.meta as any)?.products} />
    }
]

