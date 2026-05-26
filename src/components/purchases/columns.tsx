"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { PurchaseOrderColumn } from "./types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

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
            accessorKey: "imageUrl1",
            header: "Preuves",
            cell: ({ row }) => {
                const images = [
                    row.original.imageUrl1,
                    row.original.imageUrl2,
                    row.original.imageUrl3,
                ].filter(Boolean) as string[]

                if (images.length === 0) return <span className="text-muted-foreground text-xs italic">Aucune</span>

                return (
                    <div className="flex gap-1 items-center">
                        {images.map((url, idx) => (
                            <Dialog key={url}>
                                <DialogTrigger asChild>
                                    <div className="relative w-8 h-8 rounded border hover:opacity-80 transition cursor-pointer overflow-hidden flex-shrink-0">
                                        <Image
                                            fill
                                            src={url}
                                            alt={`Preuve ${idx + 1}`}
                                            className="object-cover"
                                        />
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl p-1 bg-black border-none">
                                    <div className="relative w-full h-[70vh] bg-black">
                                        <Image
                                            fill
                                            src={url}
                                            alt={`Preuve ${idx + 1}`}
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />,
        },
    ]
}
