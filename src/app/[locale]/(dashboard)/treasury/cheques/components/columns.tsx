"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ChequeCellAction } from "./cell-action"

export type ChequeColumn = {
    id: string
    number: string
    bank: string
    amount: string
    dueDate: Date
    status: string
    type: string
    partyName: string
}

export const columns: ColumnDef<ChequeColumn>[] = [
    {
        accessorKey: "number",
        header: "Numéro",
    },
    {
        accessorKey: "bank",
        header: "Banque",
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
            <Badge 
                variant={row.original.type === "RECEIVED" ? "outline" : "destructive"}
                className={row.original.type === "RECEIVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50" : ""}
            >
                {row.original.type === "RECEIVED" ? "Reçu" : "Émis"}
            </Badge>
        )
    },
    {
        accessorKey: "partyName",
        header: "Tiers",
    },
    {
        accessorKey: "amount",
        header: "Montant",
    },
    {
        accessorKey: "dueDate",
        header: "Date d'échéance",
        cell: ({ row }) => format(row.original.dueDate, "dd/MM/yyyy")
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => {
            const status = row.original.status
            const label = status === "CLEARED" ? "Encaissé" : status === "BOUNCED" ? "Rejeté" : status === "CANCELLED" ? "Annulé" : "En attente"
            
            if (status === "CLEARED") {
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">{label}</Badge>
            }
            if (status === "BOUNCED") {
                return <Badge variant="destructive">{label}</Badge>
            }
            if (status === "CANCELLED") {
                return <Badge variant="secondary">{label}</Badge>
            }
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50">{label}</Badge>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <ChequeCellAction data={row.original} />
    }
]
