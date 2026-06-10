"use client"

import * as React from "react"
import { Plus, ShoppingCart, CreditCard, DollarSign, Package, TrendingUp } from "lucide-react"
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
}

export const SalesOrderClient: React.FC<SalesOrderClientProps> = ({
    data,
    totalCount,
    pageCount,
    currentPage,
    summary
}) => {
    const t = useTranslations("Sales")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const columns = useSalesColumns()
    const locale = useLocale()

    const typeFilter = searchParams.get("type") || "ALL"
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
                <Select
                    value={typeFilter}
                    onValueChange={setTypeFilter}
                >
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t("filters.filterByType")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
                        <SelectItem value="QUOTE">{t("filters.quote")}</SelectItem>
                        <SelectItem value="ORDER">{t("filters.order")}</SelectItem>
                        <SelectItem value="INVOICE">{t("filters.invoice")}</SelectItem>
                    </SelectContent>
                </Select>
                <div className="w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <ServerDataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="search" columns={columns as any} data={data} pageCount={pageCount} currentPage={currentPage} />
        </>
    )
}
