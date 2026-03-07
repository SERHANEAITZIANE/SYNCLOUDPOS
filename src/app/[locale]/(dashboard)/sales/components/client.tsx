"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { DateRange } from "react-day-picker"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
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
}

export const SalesOrderClient: React.FC<SalesOrderClientProps> = ({
    data,
    totalCount,
    pageCount,
    currentPage
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
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("title")} (${totalCount})`}
                    description={t("subtitle")}
                />
                <div className="flex flex-row space-x-2">
                    <Button variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:hover:bg-emerald-900/50" onClick={() => router.push(`/${locale}/payments`)}>
                        Paiements
                    </Button>
                    <Button onClick={() => router.push(`/${locale}/sales/new`)}>
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                    </Button>
                </div>
            </div>
            <Separator />

            <div className="flex items-center gap-4 py-4">
                <Select
                    value={typeFilter}
                    onValueChange={setTypeFilter}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("filters.filterByType")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
                        <SelectItem value="QUOTE">{t("filters.quote")}</SelectItem>
                        <SelectItem value="ORDER">{t("filters.order")}</SelectItem>
                        <SelectItem value="INVOICE">{t("filters.invoice")}</SelectItem>
                    </SelectContent>
                </Select>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>

            <ServerDataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="search" columns={columns as any} data={data} pageCount={pageCount} currentPage={currentPage} />
        </>
    )
}
