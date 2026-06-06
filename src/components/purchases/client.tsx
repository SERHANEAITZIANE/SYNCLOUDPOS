"use client"

import { Plus, Filter, X } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { useState, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { usePurchaseColumns } from "@/components/purchases/columns"
import { PurchaseOrderColumn } from "@/components/purchases/types"
import { Link } from "@/i18n/routing"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

interface PurchasesClientProps {
    data: PurchaseOrderColumn[]
}

const LOCALES = {
    fr: {
        statusLabel: "Statut",
        allStatuses: "Tous les statuts",
        resetFilters: "Réinitialiser",
        dateLabel: "Période (date)"
    },
    en: {
        statusLabel: "Status",
        allStatuses: "All statuses",
        resetFilters: "Reset",
        dateLabel: "Period (date)"
    },
    ar: {
        statusLabel: "الحالة",
        allStatuses: "كل الحالات",
        resetFilters: "إعادة ضبط",
        dateLabel: "الفترة (التاريخ)"
    }
}

export const PurchasesClient: React.FC<PurchasesClientProps> = ({ data }) => {
    const t = useTranslations("Purchases")
    const tCommon = useTranslations("Common")
    const appLocale = useLocale()
    const router = useRouter()
    const columns = usePurchaseColumns()

    const dict = LOCALES[appLocale as keyof typeof LOCALES] || LOCALES.fr

    // Filter states
    const [selectedStatus, setSelectedStatus] = useState("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    const handleReset = () => {
        setSelectedStatus("all")
        setDateRange(undefined)
    }

    // Filtered data calculation
    const filteredData = useMemo(() => {
        let result = data

        if (selectedStatus !== "all") {
            result = result.filter(item => item.status === selectedStatus)
        }

        if (dateRange?.from) {
            const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0)
            const toTime = dateRange.to 
                ? new Date(dateRange.to).setHours(23, 59, 59, 999) 
                : new Date(dateRange.from).setHours(23, 59, 59, 999)

            result = result.filter(item => {
                const itemTime = new Date(item.rawDate).getTime()
                return itemTime >= fromTime && itemTime <= toTime
            })
        }

        return result
    }, [data, selectedStatus, dateRange])

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Heading
                    title={`${t("title")} (${filteredData.length})`}
                    description={t("subtitle")}
                />
                <Link href="/purchases/new" className="w-full sm:w-auto">
                    <Button id="global-add-new" className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest hidden sm:inline">[F3]</span>
                    </Button>
                </Link>
            </div>
            <Separator />

            {/* Filter controls */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Filter className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>{appLocale === 'fr' ? 'Filtres de recherche' : appLocale === 'ar' ? 'فلاتر البحث' : 'Search Filters'}</span>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {dict.statusLabel}
                        </span>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs font-medium">
                                <SelectValue placeholder={dict.allStatuses} />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">{dict.allStatuses}</SelectItem>
                                <SelectItem value="PENDING">PENDING</SelectItem>
                                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {dict.dateLabel}
                        </span>
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full sm:w-[260px] md:w-[280px]"
                        />
                    </div>

                    {(selectedStatus !== "all" || dateRange !== undefined) && (
                        <Button
                            variant="ghost"
                            onClick={handleReset}
                            className="h-9 px-3 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1 animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                            <X className="h-3.5 w-3.5" />
                            {dict.resetFilters}
                        </Button>
                    )}
                </div>
            </div>

            <DataTable exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="supplier" columns={columns} data={filteredData} />
        </>
    )
}

