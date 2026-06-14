"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
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
    treasuryAccounts: { id: string; name: string; type: string; balance: number }[]
}

export const EmpruntFournisseurClient: React.FC<EmpruntFournisseurClientProps> = ({ data, suppliers, treasuryAccounts }) => {
    const columns = useSupplierLoanColumns(treasuryAccounts)
    const [filteredData, setFilteredData] = React.useState(data)
    
    // Filter states
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedSupplier, setSelectedSupplier] = React.useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [minAmount, setMinAmount] = React.useState("")
    const [maxAmount, setMaxAmount] = React.useState("")
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        let result = data

        if (selectedSupplier !== "ALL") {
            result = result.filter(item => item.supplierId === selectedSupplier)
        }

        if (selectedAccount !== "ALL") {
            result = result.filter(item => item.accountId === selectedAccount)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(item => 
                item.supplierName.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                String(item.amount).includes(query)
            )
        }

        if (minAmount) {
            const min = parseFloat(minAmount)
            if (!isNaN(min)) {
                result = result.filter(item => item.amount >= min)
            }
        }

        if (maxAmount) {
            const max = parseFloat(maxAmount)
            if (!isNaN(max)) {
                result = result.filter(item => item.amount <= max)
            }
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
    }, [data, dateRange, selectedSupplier, selectedAccount, searchQuery, minAmount, maxAmount])

    const onReset = () => {
        setSearchQuery("")
        setSelectedSupplier("ALL")
        setSelectedAccount("ALL")
        setDateRange(undefined)
        setMinAmount("")
        setMaxAmount("")
    }

    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + " DA"

    return (
        <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <Heading
                    title={`Emprunts Fournisseurs (${filteredData.length})`}
                    description="Suivez toutes les avances reçues des fournisseurs (augmente votre dette envers eux)"
                />
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="bg-orange-50 text-orange-700 dark:bg-orange-955/30 font-bold px-4 py-2 rounded-md border border-orange-200 shadow-sm whitespace-nowrap">
                        Total: {formattedTotal}
                    </div>
                    <Button onClick={() => setOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap">
                        + Enregistrer un Emprunt
                    </Button>
                </div>
            </div>
            <Separator />

            {/* Premium Filter Area */}
            <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4 my-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recherche</label>
                        <Input
                            placeholder="Rechercher par nom, observation..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Supplier Select */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fournisseur</label>
                        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tous les Fournisseurs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les Fournisseurs</SelectItem>
                                {suppliers.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Treasury Account Select */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caisse / Banque</label>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tous les comptes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les comptes</SelectItem>
                                {treasuryAccounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {/* Date range picker */}
                    <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Période</label>
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    {/* Min Amount */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant Min (DA)</label>
                        <Input
                            type="number"
                            placeholder="Min"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Max Amount */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant Max (DA)</label>
                        <Input
                            type="number"
                            placeholder="Max"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={onReset}>
                        Réinitialiser les filtres
                    </Button>
                </div>
            </div>

            <DataTable exportTitle={"Emprunts_Fournisseurs"} exportDescription={"Liste des emprunts fournisseurs"} searchKey="supplierName" columns={columns} data={filteredData} hideSearch={true} />

            <SupplierLoanModal
                open={open}
                onClose={() => setOpen(false)}
                suppliers={suppliers}
                treasuryAccounts={treasuryAccounts}
            />
        </>
    )
}
