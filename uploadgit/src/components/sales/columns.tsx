"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { SalesOrderColumn } from "./types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TYPE_STYLES: Record<string, string> = {
    QUOTE: "bg-gray-100 text-gray-700",
    ORDER: "bg-amber-100 text-amber-700",
    INVOICE: "bg-purple-100 text-purple-700",
}
const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    VALIDATED: "bg-blue-100 text-blue-700",
    PAID: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
}

export function useSalesColumns(): ColumnDef<SalesOrderColumn>[] {
    const t = useTranslations("Sales")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "receiptNumber",
            header: t("fields.receiptNumber"),
        },
        {
            accessorKey: "customer",
            header: t("fields.customer"),
        },
        {
            accessorKey: "type",
            header: tCommon("type"),
            cell: ({ row }) => {
                const type = row.getValue("type") as string
                const labels: Record<string, string> = {
                    QUOTE: t("filters.quote"),
                    ORDER: t("filters.order"),
                    INVOICE: t("filters.invoice"),
                }
                return (
                    <Badge className={cn("text-xs", TYPE_STYLES[type] || "bg-gray-100 text-gray-700")}>
                        {labels[type] || type}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "status",
            header: tCommon("status"),
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                const labels: Record<string, string> = {
                    DRAFT: t("status.draft"),
                    VALIDATED: t("status.validated"),
                    PAID: t("status.paid"),
                    CANCELLED: t("status.cancelled"),
                }
                return (
                    <Badge className={cn("text-xs", STATUS_STYLES[status] || "bg-gray-100 text-gray-700")}>
                        {labels[status] || status}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "total",
            header: t("fields.total"),
            cell: ({ row }) => <span className="font-bold">{row.original.total}</span>
        },
        {
            accessorKey: "createdAt",
            header: t("fields.date"),
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />
        },
    ]
}

// Keep static export for backwards compat with existing client.tsx that imports `columns`
// The client.tsx uses `columns` directly — update it to use the hook or keep this shim
export const columns = [] // Will be replaced by hook usage in client
