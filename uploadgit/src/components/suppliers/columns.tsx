"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { format } from "date-fns"
import { SupplierColumn } from "./types"

export function useSupplierColumns(): ColumnDef<SupplierColumn>[] {
    const t = useTranslations("Suppliers")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "name",
            header: t("fields.name"),
        },
        {
            accessorKey: "contactPerson",
            header: t("fields.contact"),
        },
        {
            accessorKey: "phone",
            header: t("fields.phone"),
        },
        {
            accessorKey: "email",
            header: t("fields.email"),
        },
        {
            accessorKey: "taxId",
            header: t("fields.taxId"),
        },
        {
            accessorKey: "balance",
            header: t("fields.balance"),
            cell: ({ row }) => {
                const bal = Number(row.original.balance ?? 0)
                return <span className={bal > 0 ? "text-red-600 font-bold" : "text-emerald-600"}>{bal.toLocaleString()} DA</span>
            }
        },
        {
            accessorKey: "createdAt",
            header: tCommon("date"),
            cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy"),
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />,
        },
    ]
}
