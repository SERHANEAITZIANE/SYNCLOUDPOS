"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export type PaymentColumn = {
    id: string
    date: string
    amount: number
    source: string
    description: string
    accountName: string
    customerName: string
    customerId?: string
}

export const usePaymentColumns = () => {
    const t = useTranslations("Sales") // Reuse some translations
    const tCommon = useTranslations("Common")

    const columns: ColumnDef<PaymentColumn>[] = [
        {
            accessorKey: "date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return format(new Date(row.original.date), "dd/MM/yyyy HH:mm")
            }
        },
        {
            accessorKey: "customerName",
            header: "Client",
            cell: ({ row }) => (
                <div className="font-medium">{row.original.customerName}</div>
            )
        },
        {
            accessorKey: "amount",
            header: "Montant",
            cell: ({ row }) => {
                return (
                    <div className="font-semibold text-emerald-600">
                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            .format(row.original.amount)} DA
                    </div>
                )
            }
        },
        {
            accessorKey: "accountName",
            header: "Caisse/Banque",
        },
        {
            accessorKey: "source",
            header: "Type",
            cell: ({ row }) => {
                const source = row.original.source
                if (source === "SALE") {
                    return <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/30 dark:text-blue-300">Vente Directe</span>
                }
                if (source === "MANUAL_IN") {
                    return <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full dark:bg-amber-900/30 dark:text-amber-300">Recouvrement Dette</span>
                }
                return source
            }
        },
        {
            accessorKey: "description",
            header: "Observation",
            cell: ({ row }) => {
                return <span className="text-sm text-muted-foreground">{row.original.description || "-"}</span>
            }
        },
    ]

    return columns
}
