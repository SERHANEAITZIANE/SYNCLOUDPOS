"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

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
        header: "Ref ID",
        cell: ({ row }) => {
            const refId = row.getValue("referenceId") as string
            if (!refId) return <span className="text-muted-foreground">-</span>
            return <span className="text-xs text-muted-foreground">{refId}</span>
        }
    }
]
