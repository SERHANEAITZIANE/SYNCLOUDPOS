"use client"

import * as React from "react"
import { Plus, ShoppingCart, CreditCard, DollarSign, Package, TrendingUp, Filter, Tag, Activity, Calendar as CalendarIcon, RefreshCw } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { DateRange } from "react-day-picker"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ServerDataTable } from "@/components/ui/server-data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useSalesColumns } from "@/components/sales/columns"
import { SalesOrderColumn } from "@/components/sales/types"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Users } from "lucide-react"

interface SalesOrderClientProps {
    data: SalesOrderColumn[]
    totalCount: number
    pageCount: number
    currentPage: number
    summary?: {
        totalSalesAmount: string
        totalPaidAmount: string
        totalUnpaidAmount: string
        totalItemsSold: number
    }
    customers?: { id: string, name: string }[]
}

export const SalesOrderClient: React.FC<SalesOrderClientProps> = ({
    data,
    totalCount,
    pageCount,
    currentPage,
    summary,
    customers = []
}) => {
    const t = useTranslations("Sales")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const columns = useSalesColumns()
    const locale = useLocale()

    const typeFilter = searchParams.get("type") || "ALL"
    const statusFilter = searchParams.get("status") || "ALL"
    const customerFilter = searchParams.get("customerId") || "ALL"
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")

    const dateRange = React.useMemo(() => {
        return {
            from: fromStr ? new Date(fromStr) : undefined,
            to: toStr ? new Date(toStr) : undefined
        }
    }, [fromStr, toStr])

    const setTypeFilter = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set("type", value)
        } else {
            params.delete("type")
        }
        params.set("page", "1")
        router.push(pathname + "?" + params.toString())
    }

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

    const setCustomerFilter = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set("customerId", value)
        } else {
            params.delete("customerId")
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

    const onReset = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("type")
        params.delete("status")
        params.delete("customerId")
        params.delete("from")
        params.delete("to")
        params.set("page", "1")
        router.push(pathname + "?" + params.toString())
    }

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Heading
                    title={`${t("title")} (${totalCount})`}
                    description={t("subtitle")}
                />
                <div className="flex flex-row gap-2">
                    <Button variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:hover:bg-emerald-900/50 flex-1 sm:flex-none" onClick={() => router.push(`/${locale}/payments`)}>
                        Paiements
                    </Button>
                    <Button onClick={() => router.push(`/${locale}/sales/new`)} className="flex-1 sm:flex-none">
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                    </Button>
                </div>
            </div>
            <Separator />

            {summary && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-4">
                    {/* Card 1: Total Sales */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                        <div className="absolute right-3 top-3 opacity-15">
                            <ShoppingCart className="h-16 w-16 text-white" />
                        </div>
                        <CardContent className="p-5">
                            <p className="text-xs font-semibold opacity-90 uppercase tracking-wider">Total des Ventes</p>
                            <h3 className="text-2xl font-black mt-2">{summary.totalSalesAmount}</h3>
                            <p className="text-[10px] opacity-75 mt-1">
                                {totalCount} document(s) au total
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 2: Total Paid */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                        <div className="absolute right-3 top-3 opacity-15">
                            <CreditCard className="h-16 w-16 text-white" />
                        </div>
                        <CardContent className="p-5">
                            <p className="text-xs font-semibold opacity-90 uppercase tracking-wider">Total Encaissé</p>
                            <h3 className="text-2xl font-black mt-2">{summary.totalPaidAmount}</h3>
                            <p className="text-[10px] opacity-75 mt-1">
                                Reçu en banque ou caisse
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 3: Total Unpaid */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                        <div className="absolute right-3 top-3 opacity-15">
                            <TrendingUp className="h-16 w-16 text-white" />
                        </div>
                        <CardContent className="p-5">
                            <p className="text-xs font-semibold opacity-90 uppercase tracking-wider">Reste à Recouvrer</p>
                            <h3 className="text-2xl font-black mt-2">{summary.totalUnpaidAmount}</h3>
                            <p className="text-[10px] opacity-75 mt-1">
                                Crédit global clients en cours
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 4: Total Quantity */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                        <div className="absolute right-3 top-3 opacity-15">
                            <Package className="h-16 w-16 text-white" />
                        </div>
                        <CardContent className="p-5">
                            <p className="text-xs font-semibold opacity-90 uppercase tracking-wider">Articles Vendus</p>
                            <h3 className="text-2xl font-black mt-2">{summary.totalItemsSold}</h3>
                            <p className="text-[10px] opacity-75 mt-1">
                                Quantité totale d'unités livrées
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Premium Filter Area */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 mt-6 mb-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <Filter className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">Filtres de recherche avancés</h3>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onReset}
                        className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2 h-8"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Réinitialiser</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 relative z-10">
                    {/* Type Filter */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> Type de document
                        </label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder={t("filters.filterByType")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
                                <SelectItem value="QUOTE">{t("filters.quote")}</SelectItem>
                                <SelectItem value="ORDER">{t("filters.order")}</SelectItem>
                                <SelectItem value="INVOICE">{t("filters.invoice")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> État
                        </label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder="Filtrer par État" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                <SelectItem value="ALL">Tous les états</SelectItem>
                                <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
                                <SelectItem value="VALIDATED">{t("status.validated")}</SelectItem>
                                <SelectItem value="PAID">{t("status.paid")}</SelectItem>
                                <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Customer Filter */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> Client
                        </label>
                        <SearchableSelect
                            options={[
                                { label: "Tous les clients", value: "ALL" },
                                ...customers.map(c => ({ label: c.name, value: c.id }))
                            ]}
                            value={customerFilter}
                            onChange={setCustomerFilter}
                            placeholder="Tous les clients"
                            searchPlaceholder="Rechercher un client..."
                            className="bg-slate-950/50 border-slate-800 focus:border-indigo-500/50 rounded-xl shadow-inner"
                        />
                    </div>

                    {/* Date range picker */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> Période
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-indigo-500/50 transition-all shadow-inner">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>
            </div>

            <ServerDataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="search" columns={columns as any} data={data} pageCount={pageCount} currentPage={currentPage} />
        </>
    )
}
