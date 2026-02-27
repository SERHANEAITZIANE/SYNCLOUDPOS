"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { TreasuryAccountColumn } from "./types"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<TreasuryAccountColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("type") as string
            return <Badge variant={type === "BANK" ? "default" : "secondary"}>{type}</Badge>
        }
    },
    {
        accessorKey: "rib",
        header: "RIB / Details",
    },
    {
        accessorKey: "balance",
        header: "Balance (Solde)",
        cell: ({ row }) => <div className="font-bold">{row.getValue("balance")}</div>
    },
    {
        accessorKey: "createdAt",
        header: "Date Created",
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
]
