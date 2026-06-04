"use client"

import { Plus, Filter, X } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations, useLocale } from "next-intl"
import { useState, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useExpenseColumns } from "@/components/expenses/columns"
import { ExpenseColumn } from "@/components/expenses/types"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

interface ExpensesClientProps {
    data: ExpenseColumn[]
    categories: any[]
    accounts: any[]
}

const LOCALES = {
    fr: {
        categoryLabel: "Catégorie",
        accountLabel: "Banque / Caisse",
        allCategories: "Toutes les catégories",
        allAccounts: "Tous les comptes",
        resetFilters: "Réinitialiser",
        noAccount: "Aucun compte",
        dateLabel: "Période (date)"
    },
    en: {
        categoryLabel: "Category",
        accountLabel: "Bank / Caisse",
        allCategories: "All categories",
        allAccounts: "All accounts",
        resetFilters: "Reset",
        noAccount: "No account",
        dateLabel: "Period (date)"
    },
    ar: {
        categoryLabel: "الفئة",
        accountLabel: "الحساب / الخزينة",
        allCategories: "كل الفئات",
        allAccounts: "كل الحسابات",
        resetFilters: "إعادة ضبط",
        noAccount: "بدون حساب",
        dateLabel: "الفترة (التاريخ)"
    }
}

export const ExpensesClient: React.FC<ExpensesClientProps> = ({ 
    data,
    categories = [],
    accounts = []
}) => {
    const router = useRouter()
    const appLocale = useLocale()
    const t = useTranslations("Expenses")
    const tCommon = useTranslations("Common")
    const columns = useExpenseColumns()

    const dict = LOCALES[appLocale as keyof typeof LOCALES] || LOCALES.fr

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [selectedAccount, setSelectedAccount] = useState("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    const handleReset = () => {
        setSelectedCategory("all")
        setSelectedAccount("all")
        setDateRange(undefined)
    }

    // Filtered data calculation
    const filteredData = useMemo(() => {
        let result = data

        if (selectedCategory !== "all") {
            result = result.filter(item => item.categoryId === selectedCategory)
        }

        if (selectedAccount !== "all") {
            result = result.filter(item => item.accountId === selectedAccount)
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
    }, [data, selectedCategory, selectedAccount, dateRange])

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("title")} (${filteredData.length})`}
                    description={t("subtitle")}
                />
                <Button onClick={() => router.push(`/expenses/new`)}>
                    <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                </Button>
            </div>
            <Separator />
            
            {/* Filter controls */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{appLocale === 'fr' ? 'Filtres de recherche' : appLocale === 'ar' ? 'فلاتر البحث' : 'Search Filters'}</span>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {dict.categoryLabel}
                        </span>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs font-medium">
                                <SelectValue placeholder={dict.allCategories} />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">{dict.allCategories}</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 sm:flex-initial">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {dict.accountLabel}
                        </span>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs font-medium">
                                <SelectValue placeholder={dict.allAccounts} />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">{dict.allAccounts}</SelectItem>
                                <SelectItem value="none">{dict.noAccount}</SelectItem>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
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

                    {(selectedCategory !== "all" || selectedAccount !== "all" || dateRange !== undefined) && (
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

            <DataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="description" columns={columns} data={filteredData} />
        </>
    )
}
