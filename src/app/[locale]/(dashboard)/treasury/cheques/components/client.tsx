"use client"

import { Plus, Filter, X } from "lucide-react"
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

            {/* Filter controls */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Filtres de recherche</span>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Type de chèque
                        </span>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs font-medium">
                                <SelectValue placeholder="Tous les types" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">Tous les types</SelectItem>
                                <SelectItem value="RECEIVED">Reçu (Entrant)</SelectItem>
                                <SelectItem value="ISSUED">Émis (Sortant)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Statut
                        </span>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs font-medium">
                                <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="PENDING">En attente</SelectItem>
                                <SelectItem value="CLEARED">Encaissé</SelectItem>
                                <SelectItem value="BOUNCED">Rejeté</SelectItem>
                                <SelectItem value="CANCELLED">Annulé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Période d'échéance (date)
                        </span>
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full sm:w-[260px] md:w-[280px]"
                        />
                    </div>

                    {(selectedType !== "all" || selectedStatus !== "all" || dateRange !== undefined) && (
                        <Button
                            variant="ghost"
                            onClick={handleReset}
                            className="h-9 px-3 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1 animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                            <X className="h-3.5 w-3.5" />
                            Réinitialiser
                        </Button>
                    )}
                </div>
            </div>

            <DataTable columns={columns} data={filteredData} searchKey="number" />
        </>
    )
}

