"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { SupplierLoanColumn, useSupplierLoanColumns } from "./columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SupplierLoanModal } from "./loan-modal"

interface EmpruntFournisseurClientProps {
    data: SupplierLoanColumn[]
    suppliers: { id: string; name: string }[]
    treasuryAccounts: { id: string; name: string; balance: number }[]
}

export const EmpruntFournisseurClient: React.FC<EmpruntFournisseurClientProps> = ({ data, suppliers, treasuryAccounts }) => {
    const columns = useSupplierLoanColumns()
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedSupplier, setSelectedSupplier] = React.useState<string>("ALL")
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        let result = data

        if (selectedSupplier !== "ALL") {
            result = result.filter(item => item.supplierId === selectedSupplier)
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
    }, [data, dateRange, selectedSupplier])

    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + " DA"

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Emprunts Fournisseurs (${filteredData.length})`}
                    description="Suivez toutes les avances reçues des fournisseurs (augmente votre dette envers eux)"
                />
                <div className="flex items-center gap-3">
                    <div className="bg-orange-50 text-orange-700 dark:bg-orange-950/30 font-bold px-4 py-2 rounded-md border border-orange-200 shadow-sm">
                        Total: {formattedTotal}
                    </div>
                    <Button onClick={() => setOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                        + Enregistrer un Emprunt
                    </Button>
                </div>
            </div>
            <Separator />

            <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
                <div className="w-full sm:w-[300px]">
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrer par Fournisseur" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les Fournisseurs</SelectItem>
                            {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <DataTable searchKey="supplierName" columns={columns} data={filteredData} />

            <SupplierLoanModal
                open={open}
                onClose={() => setOpen(false)}
                suppliers={suppliers}
                treasuryAccounts={treasuryAccounts}
            />
        </>
    )
}
