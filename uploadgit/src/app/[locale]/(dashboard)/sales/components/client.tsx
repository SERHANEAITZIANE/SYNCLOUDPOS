"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
import { DateRange } from "react-day-picker"
import { startOfDay, endOfDay, isWithinInterval } from "date-fns"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
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
}

export const SalesOrderClient: React.FC<SalesOrderClientProps> = ({
    data
}) => {
    const t = useTranslations("Sales")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const locale = useLocale()
    const columns = useSalesColumns()
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: undefined,
        to: undefined,
    })
    const [typeFilter, setTypeFilter] = React.useState<string>("ALL")

    React.useEffect(() => {
        let result = data

        // Filter by Date
        if (dateRange?.from) {
            result = result.filter(item => {
                if (!item.originalDate) return true
                const itemDate = new Date(item.originalDate)

                if (dateRange.to) {
                    return isWithinInterval(itemDate, {
                        start: startOfDay(dateRange.from!),
                        end: endOfDay(dateRange.to)
                    })
                }

                // If only start date is selected, assume >= start date
                return itemDate >= startOfDay(dateRange.from!)
            })
        }

        // Filter by Type
        if (typeFilter !== "ALL") {
            result = result.filter(item => item.type === typeFilter)
        }

        setFilteredData(result)
    }, [data, dateRange, typeFilter])

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("title")} (${filteredData.length})`}
                    description={t("subtitle")}
                />
                <div className="flex flex-row space-x-2">
                    <Button variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:hover:bg-emerald-900/50" onClick={() => router.push(`/payments`)}>
                        Paiements
                    </Button>
                    <Button onClick={() => router.push(`/sales/new`)}>
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

            <DataTable searchKey="customer" columns={columns} data={filteredData} />
        </>
    )
}
