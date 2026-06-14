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
            accessorKey: "itemsSummary",
            header: "Articles",
            cell: ({ row }) => {
                const summary = row.original.itemsSummary || ""
                const count = row.original.productCount || 0
                const qty = row.original.totalQuantity || 0
                if (count === 0) return <span className="text-xs text-muted-foreground italic">Aucun article</span>
                return (
                    <div className="flex flex-col max-w-[220px] min-w-[150px]">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
                            {count} {count > 1 ? "articles" : "article"} ({qty} {qty > 1 ? "unités" : "unité"})
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-355 truncate" title={summary}>
                            {summary}
                        </span>
                    </div>
                )
            }
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
            accessorKey: "paymentMethod",
            header: "Mode de règlement",
            cell: ({ row }) => {
                const method = row.original.paymentMethod;
                const labels: Record<string, string> = {
                    CASH: "Espèces",
                    CARD: "Carte",
                    TRANSFER: "Virement",
                    CHECK: "Chèque",
                    TERM: "À terme",
                };
                const label = labels[method] || method || "-";
                return (
                    <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        method === "CASH" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" :
                        method === "CARD" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                        method === "TRANSFER" ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" :
                        method === "CHECK" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" :
                        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    )}>
                        {label}
                    </span>
                );
            }
        },
        {
            accessorKey: "total",
            header: t("fields.total"),
            cell: ({ row }) => <span className="font-bold">{row.original.total}</span>
        },
        {
            accessorKey: "amountPaid",
            header: "Payé",
            cell: ({ row }) => {
                return (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450">
                        {row.original.amountPaid}
                    </span>
                )
            }
        },
        {
            accessorKey: "unpaid",
            header: "Crédit (Reste)",
            cell: ({ row }) => {
                const unpaidVal = row.original.unpaid || ""
                const cleanVal = unpaidVal.replace(/[^0-9.-]+/g, "")
                const numericVal = parseFloat(cleanVal) || 0
                const hasUnpaid = numericVal > 0.01
                return (
                    <span className={cn("text-xs font-bold", hasUnpaid ? "text-amber-600 dark:text-amber-500" : "text-slate-400 dark:text-slate-500")}>
                        {unpaidVal}
                    </span>
                )
            }
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
