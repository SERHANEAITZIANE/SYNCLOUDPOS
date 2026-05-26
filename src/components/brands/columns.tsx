"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { CellAction } from "./cell-action"
import { Badge } from "@/components/ui/badge"

export type BrandColumn = {
    id: string
    name: string
    imageUrl?: string | null
    isArchived?: boolean
    commissionWholesale?: number
    commissionReseller?: number
    commissionRetail?: number
    createdAt: string
}

export function useBrandColumns(): ColumnDef<BrandColumn>[] {
    const t = useTranslations("Brands")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "imageUrl",
            header: "Photo",
            cell: ({ row }) => {
                const url = row.original.imageUrl
                return url ? (
                    <div className="relative w-10 h-10 rounded-md overflow-hidden">
                        <Image src={url} alt={row.original.name} fill className="object-cover" />
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        —
                    </div>
                )
            },
        },
        {
            accessorKey: "name",
            header: t("fields.name"),
        },
        {
            accessorKey: "isArchived",
            header: "Statut",
            cell: ({ row }) => row.original.isArchived ? (
                <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">Archivée</Badge>
            ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">Active</Badge>
            ),
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
