"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { TransferCellAction } from "./cell-action"

export type TransferColumn = {
    id: string
    reference: string
    fromStore: string
    toStore: string
    status: string
    createdBy: string
    createdAt: Date
}

export const columns: ColumnDef<TransferColumn>[] = [
    {
        accessorKey: "reference",
        header: "Référence",
    },
    {
        accessorKey: "fromStore",
        header: "Dépôt source",
    },
    {
        accessorKey: "toStore",
        header: "Dépôt destination",
    },
    {
        accessorKey: "createdBy",
        header: "Créé par",
    },
    {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => format(row.original.createdAt, "dd/MM/yyyy HH:mm")
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => {
            const status = row.original.status
            const variant = status === "COMPLETED" ? "success" : status === "SENT" ? "warning" : status === "CANCELLED" ? "destructive" : "secondary"
            const label = status === "COMPLETED" ? "Reçu" : status === "SENT" ? "En cours d'expédition" : status === "CANCELLED" ? "Annulé" : "En attente"
            return <Badge variant={variant as any}>{label}</Badge>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <TransferCellAction data={row.original} />
    }
]
