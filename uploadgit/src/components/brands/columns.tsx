"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"

export type BrandColumn = {
    id: string
    name: string
    createdAt: string
}

export function useBrandColumns(): ColumnDef<BrandColumn>[] {
    const t = useTranslations("Brands")
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
