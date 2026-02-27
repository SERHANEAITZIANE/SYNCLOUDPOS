"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { PurchaseOrderColumn } from "./types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    BON_COMMANDE: "bg-blue-100 text-blue-700",
    BON_LIVRAISON: "bg-amber-100 text-amber-700",
    FACTURE: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
}

export function usePurchaseColumns(): ColumnDef<PurchaseOrderColumn>[] {
    const t = useTranslations("Purchases")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "supplier",
            header: t("fields.supplier"),
        },
        {
            accessorKey: "status",
            header: tCommon("status"),
            cell: ({ row }) => {
                const status = row.original.status
                const labelMap: Record<string, string> = {
                    PENDING: t("status.pending"),
                    BON_COMMANDE: t("status.bonCommande"),
                    BON_LIVRAISON: t("status.bonLivraison"),
                    FACTURE: t("status.facture"),
                    COMPLETED: t("status.completed"),
                    CANCELLED: t("status.cancelled"),
                }
                return (
                    <Badge className={cn("text-xs", STATUS_STYLES[status] || "bg-gray-100 text-gray-700")}>
                        {labelMap[status] || status}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "total",
            header: tCommon("total"),
            cell: ({ row }) => <span className="font-bold">{row.original.total}</span>
        },
        {
            accessorKey: "createdAt",
            header: tCommon("date"),
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />,
        },
    ]
}
