"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TreasuryTransactionColumn } from "./types"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<TreasuryTransactionColumn>[] = [
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
        header: "Ref ID",
        cell: ({ row }) => {
            const refId = row.getValue("referenceId") as string
            if (!refId) return <span className="text-muted-foreground">-</span>
            return <span className="text-xs text-muted-foreground">{refId}</span>
        }
    }
]
