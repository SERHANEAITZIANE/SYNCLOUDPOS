"use client"

import { Plus, Filter, X, Tag, Wallet, Calendar as CalendarIcon, RefreshCw } from "lucide-react"
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
            
            {/* Premium Filter Area */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 my-6 relative overflow-hidden group animate-in fade-in slide-in-from-top-2">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <Filter className="w-4 h-4 text-rose-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">
                            {appLocale === 'fr' ? 'Filtres de recherche avancés' : appLocale === 'ar' ? 'فلاتر البحث المتقدمة' : 'Advanced Search Filters'}
                        </h3>
                    </div>
                    {(selectedCategory !== "all" || selectedAccount !== "all" || dateRange !== undefined) && (
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
                            <Tag className="w-3 h-3" /> {dict.categoryLabel}
                        </label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-rose-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder={dict.allCategories} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                                <SelectItem value="all">{dict.allCategories}</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> {dict.accountLabel}
                        </label>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="w-full bg-slate-950/50 border-slate-800 focus:border-rose-500/50 rounded-xl shadow-inner">
                                <SelectValue placeholder={dict.allAccounts} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
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

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> {dict.dateLabel}
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-rose-500/50 transition-all shadow-inner w-full">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>
            </div>

            <DataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="description" columns={columns} data={filteredData} />
        </>
    )
}
