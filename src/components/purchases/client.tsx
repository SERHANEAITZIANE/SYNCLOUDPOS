"use client"

import { Plus, Filter, X, Activity, Calendar as CalendarIcon, RefreshCw, Users } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { usePathname, useSearchParams } from "next/navigation"
import { useState, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { ServerDataTable } from "@/components/ui/server-data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { usePurchaseColumns } from "@/components/purchases/columns"
import { PurchaseOrderColumn } from "@/components/purchases/types"
import { Link } from "@/i18n/routing"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { SearchableSelect } from "@/components/ui/searchable-select"

interface PurchasesClientProps {
    data: PurchaseOrderColumn[]
    totalCount: number
    pageCount: number
    currentPage: number
    suppliers?: { id: string, name: string }[]
}

const LOCALES = {
    fr: {
        statusLabel: "Statut",
        allStatuses: "Tous les statuts",
        resetFilters: "Réinitialiser",
        dateLabel: "Période (date)",
        supplierLabel: "Fournisseur",
        allSuppliers: "Tous les fournisseurs"
    },
    en: {
        statusLabel: "Status",
        allStatuses: "All statuses",
        resetFilters: "Reset",
        dateLabel: "Period (date)",
        supplierLabel: "Supplier",
        allSuppliers: "All suppliers"
    },
    ar: {
        statusLabel: "الحالة",
        allStatuses: "كل الحالات",
        resetFilters: "إعادة ضبط",
        dateLabel: "الفترة (التاريخ)",
        supplierLabel: "المورد",
        allSuppliers: "جميع الموردين"
    }
}

export const PurchasesClient: React.FC<PurchasesClientProps> = ({ data, totalCount, pageCount, currentPage, suppliers = [] }) => {
    const t = useTranslations("Purchases")
    const tCommon = useTranslations("Common")
    const appLocale = useLocale()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const columns = usePurchaseColumns()

    const dict = LOCALES[appLocale as keyof typeof LOCALES] || LOCALES.fr

    const statusFilter = searchParams.get("status") || "ALL"
    const supplierFilter = searchParams.get("supplierId") || "ALL"
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")

    const dateRange = useMemo(() => {
        return {
            from: fromStr ? new Date(fromStr) : undefined,
            to: toStr ? new Date(toStr) : undefined
        }
    }, [fromStr, toStr])

    const setStatusFilter = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set("status", value)
        } else {
            params.delete("status")
        }
        params.set("page", "1")
        router.push(pathname + "?" + params.toString())
    }

    const setSupplierFilter = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set("supplierId", value)
        } else {
            params.delete("supplierId")
        }
        params.set("page", "1")
        router.push(pathname + "?" + params.toString())
    }

    const setDateRange = (range: DateRange | undefined) => {
        const params = new URLSearchParams(searchParams.toString())
        if (range?.from) {
            params.set("from", range.from.toISOString())
        } else {
            params.delete("from")
        }
        if (range?.to) {
            params.set("to", range.to.toISOString())
        } else {
            params.delete("to")
        }
        params.set("page", "1")
        router.push(pathname + "?" + params.toString())
    }

    const handleReset = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("status")
        params.delete("supplierId")
        params.delete("from")
        params.delete("to")
        params.set("page", "1")
        router.push(pathname + "?" + params.toString())
    }

    const supplierOptions = [
        { label: dict.allSuppliers, value: "ALL" },
        ...suppliers.map(s => ({ label: s.name, value: s.id }))
    ]

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Heading
                    title={`${t("title")} (${totalCount})`}
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

            {/* Premium Filter Area */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 mt-6 mb-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <Filter className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">
                            {appLocale === 'fr' ? 'Filtres de recherche avancés' : appLocale === 'ar' ? 'فلاتر البحث المتقدمة' : 'Advanced Search Filters'}
                        </h3>
                    </div>
                    {(statusFilter !== "ALL" || supplierFilter !== "ALL" || dateRange.from !== undefined) && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleReset}
                            className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2 h-8"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{dict.resetFilters}</span>
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> {dict.statusLabel}
                        </label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-purple-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder={dict.allStatuses} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                <SelectItem value="ALL">{dict.allStatuses}</SelectItem>
                                <SelectItem value="PENDING">PENDING</SelectItem>
                                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> {dict.supplierLabel}
                        </label>
                        <SearchableSelect
                            options={supplierOptions}
                            value={supplierFilter}
                            onChange={setSupplierFilter}
                            placeholder={dict.allSuppliers}
                            searchPlaceholder="Rechercher un fournisseur..."
                            className="bg-slate-950/50 border-slate-800 focus:border-purple-500/50 rounded-xl shadow-inner"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> {dict.dateLabel}
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-purple-500/50 transition-all shadow-inner w-full">
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={setDateRange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ServerDataTable exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="search" columns={columns} data={data} pageCount={pageCount} currentPage={currentPage} />
        </>
    )
}

