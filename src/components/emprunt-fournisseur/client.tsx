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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { SupplierLoanModal } from "./loan-modal"
import { Search, Building2, Wallet, Calendar as CalendarIcon, ArrowDownUp, RefreshCw, Filter } from "lucide-react"

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
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 my-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-2 relative z-10">
                    <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <Filter className="w-4 h-4 text-orange-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">Filtres de recherche avancés</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                    {/* Search */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Search className="w-3 h-3" /> Recherche
                        </label>
                        <div className="relative">
                            <Input
                                placeholder="Rechercher par nom, observation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950/50 border-slate-800 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all rounded-xl pl-3 shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Supplier Select */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" /> Fournisseur
                        </label>
                        <SearchableSelect
                            options={[
                                { label: "Tous les Fournisseurs", value: "ALL" },
                                ...suppliers.map(s => ({ label: s.name, value: s.id }))
                            ]}
                            value={selectedSupplier}
                            onChange={setSelectedSupplier}
                            placeholder="Tous les Fournisseurs"
                            searchPlaceholder="Rechercher un fournisseur..."
                            className="bg-slate-950/50 border-slate-800 focus:border-orange-500/50 rounded-xl shadow-inner"
                        />
                    </div>

                    {/* Treasury Account Select */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> Caisse / Banque
                        </label>
                        <SearchableSelect
                            options={[
                                { label: "Tous les comptes", value: "ALL" },
                                ...treasuryAccounts.map(acc => ({ label: `${acc.name} (${acc.type})`, value: acc.id }))
                            ]}
                            value={selectedAccount}
                            onChange={setSelectedAccount}
                            placeholder="Tous les comptes"
                            searchPlaceholder="Rechercher un compte..."
                            className="bg-slate-950/50 border-slate-800 focus:border-orange-500/50 rounded-xl shadow-inner"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-end relative z-10">
                    {/* Date range picker */}
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> Période
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-orange-500/50 transition-all shadow-inner">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>

                    {/* Min Amount */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowDownUp className="w-3 h-3" /> Montant Min (DA)
                        </label>
                        <Input
                            type="number"
                            placeholder="Min"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="w-full bg-slate-950/50 border-slate-800 focus:border-orange-500/50 rounded-xl shadow-inner"
                        />
                    </div>

                    {/* Max Amount */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowDownUp className="w-3 h-3" /> Montant Max (DA)
                        </label>
                        <Input
                            type="number"
                            placeholder="Max"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="w-full bg-slate-950/50 border-slate-800 focus:border-orange-500/50 rounded-xl shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/60 relative z-10 mt-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onReset}
                        className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
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
