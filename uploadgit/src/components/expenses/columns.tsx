"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { ExpenseColumn } from "./types"

export function useExpenseColumns(): ColumnDef<ExpenseColumn>[] {
    const t = useTranslations("Expenses")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "description",
            header: tCommon("description"),
        },
        {
            accessorKey: "category",
            header: t("fields.category"),
            cell: ({ row }) => <div className="font-medium">{row.getValue("category")}</div>
        },
        {
            accessorKey: "amount",
            header: tCommon("amount"),
            cell: ({ row }) => <div className="text-red-600 font-bold">-{row.getValue("amount")}</div>
        },
        {
            accessorKey: "date",
            header: tCommon("date"),
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />
        },
    ]
}
