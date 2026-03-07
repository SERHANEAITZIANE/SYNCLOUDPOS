"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { LoanColumn, useLoanColumns } from "./columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { LoanModal } from "./loan-modal"

interface EmpruntClientProps {
    data: LoanColumn[]
    customers: { id: string; name: string }[]
    treasuryAccounts: { id: string; name: string; balance: number }[]
}

export const EmpruntClient: React.FC<EmpruntClientProps> = ({ data, customers, treasuryAccounts }) => {
    const columns = useLoanColumns()
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedCustomer, setSelectedCustomer] = React.useState<string>("ALL")
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        let result = data

        if (selectedCustomer !== "ALL") {
            result = result.filter(item => item.customerId === selectedCustomer)
        }

        if (dateRange?.from) {
            result = result.filter(item => {
                const itemDate = new Date(item.date)
                itemDate.setHours(0, 0, 0, 0)
                const fromDate = new Date(dateRange.from!)
                fromDate.setHours(0, 0, 0, 0)
                if (dateRange.to) {
                    const toDate = new Date(dateRange.to)
                    toDate.setHours(23, 59, 59, 999)
                    return itemDate >= fromDate && itemDate <= toDate
                }
                return itemDate.getTime() === fromDate.getTime()
            })
        }

        setFilteredData(result)
    }, [data, dateRange, selectedCustomer])

    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + " DA"

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Emprunts Clients (${filteredData.length})`}
                    description="Suivez toutes les avances accordées aux clients (augmente leur solde/dette)"
                />
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 text-red-700 dark:bg-red-950/30 font-bold px-4 py-2 rounded-md border border-red-200 shadow-sm">
                        Total: {formattedTotal}
                    </div>
                    <Button onClick={() => setOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
                        + Enregistrer un Emprunt
                    </Button>
                </div>
            </div>
            <Separator />

            <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
                <div className="w-full sm:w-[300px]">
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrer par Client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les Clients</SelectItem>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <DataTable  exportTitle={"Export"} exportDescription={""} searchKey="customerName" columns={columns} data={filteredData} />

            <LoanModal
                open={open}
                onClose={() => setOpen(false)}
                customers={customers}
                treasuryAccounts={treasuryAccounts}
            />
        </>
    )
}
