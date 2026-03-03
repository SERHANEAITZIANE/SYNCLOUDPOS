"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { format } from "date-fns"
import { CustomerColumn } from "./types"

export function useCustomerColumns(): ColumnDef<CustomerColumn>[] {
    const t = useTranslations("Customers")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "name",
            header: t("fields.name"),
        },
        {
            accessorKey: "phone",
            header: t("fields.phone"),
        },
        {
            accessorKey: "city",
            header: t("fields.city"),
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
            accessorKey: "loyaltyPoints",
            header: "Points de Fidélité",
            cell: ({ row }) => {
                const points = Number(row.original.loyaltyPoints ?? 0)
                return (
                    <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-500">
                        <span className="text-amber-500 text-[10px]">★</span> {points.toLocaleString()}
                    </span>
                )
            }
        },
        {
            accessorKey: "clientType",
            header: "Type",
            cell: ({ row }) => {
                const type = row.original.clientType;
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${type === 'WHOLESALE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30' :
                        type === 'RESELLER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' :
                            'bg-slate-100 text-slate-800 dark:bg-slate-800'
                        }`}>
                        {type === 'WHOLESALE' ? 'Grossiste' : type === 'RESELLER' ? 'Revendeur' : 'Détaillant'}
                    </span>
                )
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
