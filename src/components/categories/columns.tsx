"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"

export type CategoryColumn = {
    id: string
    name: string
    createdAt: string
}

export function useCategoryColumns(): ColumnDef<CategoryColumn>[] {
    const t = useTranslations("Categories")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "name",
            header: t("fields.name"),
        },
        {
            accessorKey: "date",
            header: tCommon("date"),
            cell: ({ row }) => row.original.createdAt,
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />,
        },
    ]
}
