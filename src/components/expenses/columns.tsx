"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { ExpenseColumn } from "./types"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export function useExpenseColumns(): ColumnDef<ExpenseColumn>[] {
    const t = useTranslations("Expenses")
    const tCommon = useTranslations("Common")

    return [
        {
            accessorKey: "description",
            header: tCommon("description"),
        },
        {
            accessorKey: "category",
            header: t("fields.category"),
            cell: ({ row }) => <div className="font-medium">{row.getValue("category")}</div>
        },
        {
            accessorKey: "accountName",
            header: t("fields.account"),
            cell: ({ row }) => <div className="font-medium text-slate-600 dark:text-slate-400">{row.getValue("accountName")}</div>
        },
        {
            accessorKey: "amount",
            header: tCommon("amount"),
            cell: ({ row }) => <div className="text-red-600 font-bold">-{row.getValue("amount")}</div>
        },
        {
            accessorKey: "date",
            header: tCommon("date"),
        },
        {
            accessorKey: "imageUrl",
            header: "Justificatif",
            cell: ({ row }) => {
                const imageUrl = row.original.imageUrl
                if (!imageUrl) return <span className="text-muted-foreground text-xs italic">Aucun</span>
                return (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative w-10 h-10 rounded border hover:opacity-80 transition cursor-pointer overflow-hidden">
                                <Image
                                    fill
                                    src={imageUrl}
                                    alt="Justificatif"
                                    className="object-cover"
                                />
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl p-1 bg-black border-none">
                            <div className="relative w-full h-[70vh] bg-black">
                                <Image
                                    fill
                                    src={imageUrl}
                                    alt="Justificatif"
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => <CellAction data={row.original} />
        },
    ]
}
