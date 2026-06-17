"use client"

import { Plus, Filter, X, Tag, Activity, Calendar as CalendarIcon, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { columns, ChequeColumn } from "./columns"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

interface ChequeClientProps {
    data: ChequeColumn[]
}

export const ChequeClient: React.FC<ChequeClientProps> = ({ data }) => {
    const router = useRouter()
    const [selectedType, setSelectedType] = useState("all")
    const [selectedStatus, setSelectedStatus] = useState("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    const handleReset = () => {
        setSelectedType("all")
        setSelectedStatus("all")
        setDateRange(undefined)
    }

    // Filtered data calculation
    const filteredData = useMemo(() => {
        let result = data

        if (selectedType !== "all") {
            result = result.filter(item => item.type === selectedType)
        }

        if (selectedStatus !== "all") {
            result = result.filter(item => item.status === selectedStatus)
        }

        if (dateRange?.from) {
            const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0)
            const toTime = dateRange.to 
                ? new Date(dateRange.to).setHours(23, 59, 59, 999) 
                : new Date(dateRange.from).setHours(23, 59, 59, 999)

            result = result.filter(item => {
                const itemTime = new Date(item.dueDate).getTime()
                return itemTime >= fromTime && itemTime <= toTime
            })
        }

        return result
    }, [data, selectedType, selectedStatus, dateRange])

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading 
                    title={`Chèques (${filteredData.length})`}
                    description="Gérez vos chèques émis et reçus"
                />
                <Button onClick={() => router.push(`/treasury/cheques/new`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                </Button>
            </div>
            <Separator />

            {/* Premium Filter Area */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 my-6 relative overflow-hidden group animate-in fade-in slide-in-from-top-2">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Filter className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">Filtres de recherche avancés</h3>
                    </div>
                    {(selectedType !== "all" || selectedStatus !== "all" || dateRange !== undefined) && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleReset}
                            className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2 h-8"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Réinitialiser</span>
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> Type de chèque
                        </label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder="Tous les types" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="RECEIVED">Reçu (Entrant)</SelectItem>
                                <SelectItem value="ISSUED">Émis (Sortant)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Statut
                        </label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="PENDING">En attente</SelectItem>
                                <SelectItem value="CLEARED">Encaissé</SelectItem>
                                <SelectItem value="BOUNCED">Rejeté</SelectItem>
                                <SelectItem value="CANCELLED">Annulé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> Période d'échéance
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-emerald-500/50 transition-all shadow-inner w-full">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>
            </div>

            <DataTable columns={columns} data={filteredData} searchKey="number" />
        </>
    )
}

