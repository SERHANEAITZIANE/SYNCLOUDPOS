"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { DateRange } from "react-day-picker"

import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { PaymentColumn, usePaymentColumns } from "./columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface PaymentsClientProps {
    data: PaymentColumn[]
    customers: { id: string; name: string }[]
}

export const PaymentsClient: React.FC<PaymentsClientProps> = ({ data, customers }) => {
    const columns = usePaymentColumns()
    // Local filtering states
    const [filteredData, setFilteredData] = React.useState(data)

    // Instead of querying the database immediately on every change, we can filter locally 
    // since `data` already represents a reasonably bounded set. Or we can push route params. 
    // Given the architecture so far, we will do client-side filtering unless the user hits "Rechercher"
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedCustomer, setSelectedCustomer] = React.useState<string>("ALL")

    React.useEffect(() => {
        let result = data

        // 1. Filter by Customer
        if (selectedCustomer !== "ALL") {
            result = result.filter(item => item.customerId === selectedCustomer)
        }

        // 2. Filter by Date range
        if (dateRange?.from) {
            result = result.filter(item => {
                const itemDate = new Date(item.date)
                // zero out time for comparison
                itemDate.setHours(0, 0, 0, 0)
                const fromDate = new Date(dateRange.from!)
                fromDate.setHours(0, 0, 0, 0)

                if (dateRange.to) {
                    const toDate = new Date(dateRange.to)
                    toDate.setHours(23, 59, 59, 999)
                    // If it has a 'to' date, check the interval
                    return itemDate >= fromDate && itemDate <= toDate
                }

                // If only start date is selected, assume they want that specific day
                return itemDate.getTime() === fromDate.getTime()
            })
        }

        setFilteredData(result)
    }, [data, dateRange, selectedCustomer])

    // Calculate sum of currently filtered
    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + ' DA'

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Paiements (${filteredData.length})`}
                    description={"Suivez tous les encaissements clients (Ventes directes et Recouvrements)"}
                />
                <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 font-bold px-4 py-2 rounded-md border border-emerald-200 shadow-sm">
                    Total: {formattedTotal}
                </div>
            </div>
            <Separator />

            <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
                {/* Advanced Filtering Handlers */}
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
        </>
    )
}
