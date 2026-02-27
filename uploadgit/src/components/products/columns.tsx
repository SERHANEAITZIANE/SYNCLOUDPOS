"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { cn } from "@/lib/utils"

export type ProductColumn = {
    id: string
    name: string
    price: string
    wholesalePrice: string
    dealerPrice: string
    category: string
    brand: string
    isFeatured: boolean
    isArchived: boolean
    stock: number
    minStock: number
    createdAt: string
}

export function useProductColumns(): ColumnDef<ProductColumn>[] {
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "name",
            header: t("fields.name"),
        },
        {
            accessorKey: "isArchived",
            header: t("fields.archived"),
            cell: ({ row }) => (
                <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded",
                    row.original.isArchived ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600")}>
                    {row.original.isArchived ? "✓" : "—"}
                </span>
            )
        },
        {
            accessorKey: "isFeatured",
            header: t("fields.featured"),
            cell: ({ row }) => (
                <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded",
                    row.original.isFeatured ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>
                    {row.original.isFeatured ? "★" : "—"}
                </span>
            )
        },
        {
            accessorKey: "price",
            header: t("fields.price"),
        },
        {
            accessorKey: "wholesalePrice",
            header: t("fields.wholesalePrice"),
        },
        {
            accessorKey: "dealerPrice",
            header: t("fields.dealerPrice"),
        },
        {
            accessorKey: "category",
            header: t("fields.category"),
        },
        {
            accessorKey: "brand",
            header: t("fields.brand"),
        },
        {
            accessorKey: "stock",
            header: t("fields.stock"),
            cell: ({ row }) => {
                const stock = Number(row.getValue("stock"))
                const minStock = row.original.minStock
                const isLow = stock <= minStock
                return (
                    <div className={cn("font-bold tabular-nums", isLow ? "text-red-600" : "text-emerald-600")}>
                        {stock}
                        {isLow && <span className="ml-1 text-xs">⚠</span>}
                    </div>
                )
            }
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

// Legacy compat shim — update client.tsx to call useProductColumns() instead
export const columns: ColumnDef<ProductColumn>[] = []
