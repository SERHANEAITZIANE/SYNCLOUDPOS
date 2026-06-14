"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Percent,
    Package,
    Tag,
    Layers,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    X,
    Calendar,
    ChevronRight,
    Activity,
    LineChart as ChartIcon,
    PieChart as PieIcon,
    BarChart3 as BarIcon
} from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { DateRange } from "react-day-picker"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Recharts imports
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts"

interface GroupData {
    name: string
    revenue: number
    cost: number
    qtySold: number
    profit: number
    margin: number
}

interface SalesData {
    id: string
    type: "POS" | "BL" | "RETOUR"
    receiptNumber: string
    date: string
    customerName: string
    clientType: string
    revenue: number
    cost: number
    profit: number
    margin: number
    itemsSummary: string
}

interface PeriodData {
    products: (GroupData & { id: string; category: string; brand: string })[]
    byCategory: GroupData[]
    byBrand: GroupData[]
    sales: SalesData[]
    expensesByCategory: { name: string; amount: number }[]
    dailyProfit: { dateLabel: string; revenue: number; cost: number; grossProfit: number; expenses: number; netProfit: number }[]
    totals: {
        totalRevenue: number
        totalCost: number
        grossProfit: number
        overallMargin: number
        totalExpenses: number
        netProfit: number
    }
}

interface ProfitReportClientProps {
    data: {
        currentPeriod: PeriodData
        previousPeriod: PeriodData
        dateRange: {
            current: { from: string; to: string }
            previous: { from: string; to: string }
        }
    }
    categories: { id: string; name: string }[]
    brands: { id: string; name: string }[]
}

type ViewMode = "products" | "categories" | "brands" | "sales"
type TabMode = "rentability" | "comparison"

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e", "#14b8a6"]

const fmt = (n: number) => n.toLocaleString("fr-DZ") + " DA"

export const ProfitReportClient: React.FC<ProfitReportClientProps> = ({ data, categories, brands }) => {
    const [activeTab, setActiveTab] = useState<TabMode>("rentability")
    const [viewMode, setViewMode] = useState<ViewMode>("products")
    
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")
    const clientTypeFilter = searchParams.get("clientType") || "ALL"
    const categoryFilter = searchParams.get("categoryId") || "ALL"
    const brandFilter = searchParams.get("brandId") || "ALL"
    const saleNumberFilter = searchParams.get("saleNumber") || ""

    // Search input state
    const [saleNoInput, setSaleNoInput] = useState(saleNumberFilter)

    const dateRange = useMemo(() => {
        const defaultFrom = new Date()
        defaultFrom.setDate(1) // First day of current month
        defaultFrom.setHours(0, 0, 0, 0)

        const defaultTo = new Date()
        defaultTo.setHours(23, 59, 59, 999)

        return {
            from: fromStr ? new Date(fromStr) : defaultFrom,
            to: toStr ? new Date(toStr) : defaultTo
        }
    }, [fromStr, toStr])

    const updateFilter = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set(key, value)
        } else {
            params.delete(key)
        }
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
        router.push(pathname + "?" + params.toString())
    }

    const clearFilters = () => {
        setSaleNoInput("")
        router.push(pathname)
    }

    const current = data.currentPeriod
    const previous = data.previousPeriod
    const { totals } = current

    // KPIs computation
    const kpis = [
        {
            label: "Chiffre d'Affaires",
            value: fmt(totals.totalRevenue),
            desc: "Total des ventes sur la période",
            icon: DollarSign,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50"
        },
        {
            label: "Coût des Marchandises",
            value: fmt(totals.totalCost),
            desc: "Coût total d'achat des produits vendus",
            icon: Package,
            color: "text-orange-600 dark:text-orange-400",
            bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/50"
        },
        {
            label: "Bénéfice Brut",
            value: fmt(totals.grossProfit),
            desc: `Marge brute de ${totals.overallMargin.toFixed(1)}%`,
            icon: Percent,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50"
        },
        {
            label: "Frais Généraux",
            value: fmt(totals.totalExpenses),
            desc: "Charges d'exploitation cumulées",
            icon: Tag,
            color: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50"
        },
        {
            label: "Bénéfice Net",
            value: fmt(totals.netProfit),
            desc: "Bénéfice après déduction des charges",
            icon: totals.netProfit >= 0 ? TrendingUp : TrendingDown,
            color: totals.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-red-650 dark:text-red-400",
            bg: totals.netProfit >= 0
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50"
                : "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50"
        }
    ]

    // Helpers for delta calculations
    const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0
        return ((curr - prev) / prev) * 100
    }

    const renderDelta = (curr: number, prev: number, invert = false) => {
        const pct = calculateChange(curr, prev)
        const isPositive = pct >= 0
        const isGood = invert ? !isPositive : isPositive

        if (pct === 0) return <Badge variant="secondary">0.0%</Badge>

        return (
            <Badge
                variant="outline"
                className={cn(
                    "flex items-center gap-0.5 tabular-nums font-semibold",
                    isGood
                        ? "text-emerald-600 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                        : "text-red-600 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800"
                )}
            >
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(pct).toFixed(1)}%
            </Badge>
        )
    }

    const getTableData = () => {
        switch (viewMode) {
            case "categories": return current.byCategory
            case "brands": return current.byBrand
            case "sales": return current.sales
            default: return current.products
        }
    }

    const tableData = getTableData()

    // Chart customization
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border shadow-xl p-3 rounded-lg text-xs space-y-1 dark:bg-zinc-950">
                    <p className="font-bold border-b pb-1 mb-1">{label}</p>
                    {payload.map((p: any) => (
                        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-6 tabular-nums font-medium">
                            <span className="opacity-80">{p.name}:</span>
                            <span>{fmt(p.value)}</span>
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    // Tab items
    const breakdownTabs = [
        { key: "products" as ViewMode, label: "Par Produit", icon: Package },
        { key: "categories" as ViewMode, label: "Par Catégorie", icon: Layers },
        { key: "brands" as ViewMode, label: "Par Marque", icon: Tag },
        { key: "sales" as ViewMode, label: "Par Vente", icon: DollarSign }
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Heading
                    title="Analyse Financière & Bénéfices"
                    description="Suivi en temps réel de la rentabilité brute, des charges d'exploitation et des bénéfices nets."
                />
                
                <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border w-fit">
                    <button
                        onClick={() => setActiveTab("rentability")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === "rentability"
                                ? "bg-background shadow-md text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity className="h-4 w-4" />
                        Rentabilité
                    </button>
                    <button
                        onClick={() => setActiveTab("comparison")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === "comparison"
                                ? "bg-background shadow-md text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <ChartIcon className="h-4 w-4" />
                        Comparaison Période
                    </button>
                </div>
            </div>
            
            <Separator />

            {/* Filter Bar */}
            <Card className="shadow-sm border border-muted/50 dark:bg-zinc-900/30">
                <CardContent className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-full sm:w-auto">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>

                        <Select
                            value={clientTypeFilter}
                            onValueChange={(val) => updateFilter("clientType", val)}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] h-9">
                                <SelectValue placeholder="Catégorie Client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les clients</SelectItem>
                                <SelectItem value="RETAIL">Client de Détail</SelectItem>
                                <SelectItem value="WHOLESALE">Grossiste</SelectItem>
                                <SelectItem value="RESELLER">Revendeur</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={categoryFilter}
                            onValueChange={(val) => updateFilter("categoryId", val)}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] h-9">
                                <SelectValue placeholder="Catégorie Produit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes catégories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={brandFilter}
                            onValueChange={(val) => updateFilter("brandId", val)}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] h-9">
                                <SelectValue placeholder="Marque" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes les marques</SelectItem>
                                {brands.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        <div className="flex items-center gap-2 w-full xl:w-[260px] bg-background border rounded-lg px-3 py-1.5 focus-within:ring-2 ring-primary/20 dark:bg-zinc-950">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                value={saleNoInput}
                                onChange={(e) => setSaleNoInput(e.target.value)}
                                placeholder="N° de vente (ex: POS-12A5)"
                                className="w-full bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        updateFilter("saleNumber", saleNoInput)
                                    }
                                }}
                            />
                            {saleNoInput && (
                                <button onClick={() => { setSaleNoInput(""); updateFilter("saleNumber", null) }}>
                                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </div>
                        <Button onClick={() => updateFilter("saleNumber", saleNoInput)} variant="secondary" size="sm" className="h-9">
                            Filtrer
                        </Button>
                        {(fromStr || toStr || clientTypeFilter !== "ALL" || categoryFilter !== "ALL" || brandFilter !== "ALL" || saleNumberFilter) && (
                            <Button onClick={clearFilters} variant="ghost" size="sm" className="h-9 gap-1.5 px-3">
                                Réinitialiser
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {activeTab === "rentability" && (
                <>
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {kpis.map((kpi, idx) => {
                            const Icon = kpi.icon
                            return (
                                <Card key={idx} className={cn("border bg-card shadow-sm transition-all", kpi.bg)}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                                        <div className={cn("p-1.5 rounded-lg bg-background/50 border shadow-xs")}>
                                            <Icon className={cn("h-4 w-4", kpi.color)} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-1">
                                        <div className={cn("text-xl font-bold tracking-tight tabular-nums", kpi.color)}>{kpi.value}</div>
                                        <p className="text-[11px] text-muted-foreground">{kpi.desc}</p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* GRAPHICS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Daily Profit Evolution Chart */}
                        <Card className="lg:col-span-2 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <ChartIcon className="h-4 w-4 text-blue-500" />
                                        Évolution Temporelle
                                    </CardTitle>
                                    <CardDescription>CA, charges et bénéfices nets cumulés jour par jour</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={current.dailyProfit} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} />
                                            <YAxis fontSize={11} tickLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                            <Line name="Chiffre d'Affaires" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                            <Line name="Bénéfice Brut" type="monotone" dataKey="grossProfit" stroke="#10b981" strokeWidth={2} dot={false} />
                                            <Line name="Charges" type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                                            <Line name="Bénéfice Net" type="monotone" dataKey="netProfit" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expense Breakdown */}
                        <Card className="shadow-sm">
                            <CardHeader className="space-y-0.5 pb-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <PieIcon className="h-4 w-4 text-rose-500" />
                                    Répartition des Frais
                                </CardTitle>
                                <CardDescription>Catégories de charges d'exploitation</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col justify-between h-72">
                                {current.expensesByCategory.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center p-6 border-2 border-dashed rounded-xl my-4">
                                        <Tag className="h-8 w-8 mb-2 opacity-30" />
                                        <p className="text-xs font-medium">Aucune charge enregistrée</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-44 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={current.expensesByCategory}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={4}
                                                        dataKey="amount"
                                                    >
                                                        {current.expensesByCategory.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => fmt(Number(value))} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs overflow-y-auto max-h-20">
                                            {current.expensesByCategory.map((item, idx) => (
                                                <div key={item.name} className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                                    <span className="truncate max-w-[100px]" title={item.name}>{item.name}</span>
                                                    <span className="font-semibold tabular-nums ml-auto">{((item.amount / current.totals.totalExpenses) * 100).toFixed(0)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Category performance */}
                        <Card className="shadow-sm">
                            <CardHeader className="space-y-0.5">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <BarIcon className="h-4 w-4 text-emerald-500" />
                                    Performances par Catégorie de Produit
                                </CardTitle>
                                <CardDescription>Chiffre d'affaires comparé au bénéfice par catégorie</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {current.byCategory.length === 0 ? (
                                    <div className="py-8 text-center text-muted-foreground">Aucune donnée de catégorie</div>
                                ) : (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={current.byCategory.slice(0, 15)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                                                <YAxis fontSize={10} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar name="Chiffre d'Affaires" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Bar name="Bénéfice Brut" dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* DETAILS BREAKDOWN DATA TABLE */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
                            <div>
                                <CardTitle className="text-base font-semibold">Rapports Détails</CardTitle>
                                <CardDescription>Tableaux analytiques détaillés de vos performances.</CardDescription>
                            </div>
                            
                            <div className="flex items-center gap-1.5 bg-muted p-0.5 rounded-lg border w-fit shrink-0">
                                {breakdownTabs.map((tab) => {
                                    const TabIcon = tab.icon
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setViewMode(tab.key)}
                                            className={cn(
                                                "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                                viewMode === tab.key
                                                    ? "bg-background shadow-xs text-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <TabIcon className="h-3 w-3" />
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {tableData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Package className="h-10 w-10 mb-2 opacity-30" />
                                    <p className="text-sm font-semibold">Aucune donnée pour les filtres sélectionnés</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 border-b">
                                                {viewMode === "sales" ? (
                                                    <tr>
                                                        <th className="text-left px-4 py-3 font-bold">N° Vente</th>
                                                        <th className="text-left px-4 py-3 font-bold">Date</th>
                                                        <th className="text-left px-4 py-3 font-bold">Client</th>
                                                        <th className="text-left px-4 py-3 font-bold">Articles</th>
                                                        <th className="text-right px-4 py-3 font-bold">CA</th>
                                                        <th className="text-right px-4 py-3 font-bold">Coût</th>
                                                        <th className="text-right px-4 py-3 font-bold">Bénéfice</th>
                                                        <th className="text-right px-4 py-3 font-bold">Marge</th>
                                                    </tr>
                                                ) : (
                                                    <tr>
                                                        <th className="text-left px-4 py-3 font-bold">
                                                            {viewMode === "products" ? "Produit" : viewMode === "categories" ? "Catégorie" : "Marque"}
                                                        </th>
                                                        {viewMode === "products" && (
                                                            <>
                                                                <th className="text-left px-4 py-3 font-bold">Catégorie</th>
                                                                <th className="text-left px-4 py-3 font-bold">Marque</th>
                                                            </>
                                                        )}
                                                        <th className="text-right px-4 py-3 font-bold">Qté Vendue</th>
                                                        <th className="text-right px-4 py-3 font-bold">CA</th>
                                                        <th className="text-right px-4 py-3 font-bold">Coût d'Achat</th>
                                                        <th className="text-right px-4 py-3 font-bold">Bénéfice Brut</th>
                                                        <th className="text-right px-4 py-3 font-bold">Marge %</th>
                                                    </tr>
                                                )}
                                            </thead>
                                            <tbody>
                                                {viewMode === "sales" ? (
                                                    (tableData as SalesData[]).map((row) => (
                                                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                            <td className="px-4 py-3 font-semibold text-primary flex items-center gap-1.5">
                                                                <Badge variant="outline" className={row.type === "POS" ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 border-blue-200" : "bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 border-purple-200"}>
                                                                    {row.type}
                                                                </Badge>
                                                                {row.receiptNumber}
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {format(new Date(row.date), "dd/MM/yyyy HH:mm")}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold">{row.customerName}</span>
                                                                    <span className="text-[10px] text-muted-foreground uppercase">{row.clientType}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground" title={row.itemsSummary}>
                                                                {row.itemsSummary}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-medium tabular-nums">{fmt(row.revenue)}</td>
                                                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmt(row.cost)}</td>
                                                            <td className={cn("px-4 py-3 text-right font-bold tabular-nums", row.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                                                {fmt(row.profit)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "tabular-nums font-semibold",
                                                                        row.margin >= 25 ? "text-emerald-600 border-emerald-200 bg-emerald-50/20 dark:border-emerald-800" :
                                                                        row.margin >= 12 ? "text-amber-600 border-amber-200 bg-amber-50/20 dark:border-amber-800" :
                                                                        "text-red-600 border-red-200 bg-red-50/20 dark:border-red-800"
                                                                    )}
                                                                >
                                                                    {row.margin.toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    (tableData as (GroupData & { id?: string; category?: string; brand?: string })[]).map((row, i) => (
                                                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                            <td className="px-4 py-3 font-semibold">{row.name}</td>
                                                            {viewMode === "products" && (
                                                                <>
                                                                    <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                                                                    <td className="px-4 py-3 text-muted-foreground">{row.brand}</td>
                                                                </>
                                                            )}
                                                            <td className="px-4 py-3 text-right tabular-nums font-medium">{row.qtySold}</td>
                                                            <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(row.revenue)}</td>
                                                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmt(row.cost)}</td>
                                                            <td className={cn("px-4 py-3 text-right font-bold tabular-nums", row.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                                                {fmt(row.profit)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "tabular-nums font-semibold",
                                                                        row.margin >= 25 ? "text-emerald-600 border-emerald-200 bg-emerald-50/20 dark:border-emerald-800" :
                                                                        row.margin >= 12 ? "text-amber-600 border-amber-200 bg-amber-50/20 dark:border-amber-800" :
                                                                        "text-red-600 border-red-200 bg-red-50/20 dark:border-red-800"
                                                                    )}
                                                                >
                                                                    {row.margin.toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {activeTab === "comparison" && (
                <div className="space-y-6">
                    {/* PERIOD RANGES INFO CARD */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border border-blue-100 bg-blue-50/20 dark:border-blue-900/40 dark:bg-zinc-950">
                            <CardHeader className="py-3.5 flex flex-row items-center gap-2 space-y-0">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Période Actuelle</span>
                            </CardHeader>
                            <CardContent className="py-2">
                                <p className="text-sm font-semibold">
                                    Du {format(new Date(data.dateRange.current.from), "dd MMMM yyyy", { locale: fr })} au {format(new Date(data.dateRange.current.to), "dd MMMM yyyy", { locale: fr })}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border border-muted bg-muted/20 dark:bg-zinc-955">
                            <CardHeader className="py-3.5 flex flex-row items-center gap-2 space-y-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Période Précédente (Comparaison)</span>
                            </CardHeader>
                            <CardContent className="py-2">
                                <p className="text-sm font-semibold text-muted-foreground">
                                    Du {format(new Date(data.dateRange.previous.from), "dd MMMM yyyy", { locale: fr })} au {format(new Date(data.dateRange.previous.to), "dd MMMM yyyy", { locale: fr })}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* COMPARATIVE METRICS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Comparison KPI Table */}
                        <Card className="lg:col-span-2 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Indicateurs de Performance Financière</CardTitle>
                                <CardDescription>Comparatif détaillé entre la période sélectionnée et la période précédente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-bold">Indicateur</th>
                                                <th className="px-4 py-3 text-right font-bold">Actuelle</th>
                                                <th className="px-4 py-3 text-right font-bold">Précédente</th>
                                                <th className="px-4 py-3 text-right font-bold">Écart</th>
                                                <th className="px-4 py-3 text-right font-bold">Évolution</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3.5 font-semibold">Chiffre d'Affaires</td>
                                                <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{fmt(current.totals.totalRevenue)}</td>
                                                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(previous.totals.totalRevenue)}</td>
                                                <td className={cn("px-4 py-3.5 text-right font-bold tabular-nums", current.totals.totalRevenue >= previous.totals.totalRevenue ? "text-emerald-600" : "text-red-500")}>
                                                    {fmt(current.totals.totalRevenue - previous.totals.totalRevenue)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right flex justify-end">
                                                    {renderDelta(current.totals.totalRevenue, previous.totals.totalRevenue)}
                                                </td>
                                            </tr>
                                            <tr className="border-b hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3.5 font-semibold">Coût d'Achat (COGS)</td>
                                                <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{fmt(current.totals.totalCost)}</td>
                                                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(previous.totals.totalCost)}</td>
                                                <td className={cn("px-4 py-3.5 text-right font-bold tabular-nums", current.totals.totalCost <= previous.totals.totalCost ? "text-emerald-600" : "text-red-500")}>
                                                    {fmt(current.totals.totalCost - previous.totals.totalCost)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right flex justify-end">
                                                    {renderDelta(current.totals.totalCost, previous.totals.totalCost, true)}
                                                </td>
                                            </tr>
                                            <tr className="border-b hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3.5 font-bold">Bénéfice Brut</td>
                                                <td className="px-4 py-3.5 text-right font-bold tabular-nums text-blue-600 dark:text-blue-400">{fmt(current.totals.grossProfit)}</td>
                                                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(previous.totals.grossProfit)}</td>
                                                <td className={cn("px-4 py-3.5 text-right font-bold tabular-nums", current.totals.grossProfit >= previous.totals.grossProfit ? "text-emerald-600" : "text-red-500")}>
                                                    {fmt(current.totals.grossProfit - previous.totals.grossProfit)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right flex justify-end">
                                                    {renderDelta(current.totals.grossProfit, previous.totals.grossProfit)}
                                                </td>
                                            </tr>
                                            <tr className="border-b hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3.5 font-semibold">Frais Généraux</td>
                                                <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{fmt(current.totals.totalExpenses)}</td>
                                                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(previous.totals.totalExpenses)}</td>
                                                <td className={cn("px-4 py-3.5 text-right font-bold tabular-nums", current.totals.totalExpenses <= previous.totals.totalExpenses ? "text-emerald-600" : "text-red-500")}>
                                                    {fmt(current.totals.totalExpenses - previous.totals.totalExpenses)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right flex justify-end">
                                                    {renderDelta(current.totals.totalExpenses, previous.totals.totalExpenses, true)}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3.5 font-extrabold text-sm">Bénéfice Net Net</td>
                                                <td className={cn("px-4 py-3.5 text-right font-extrabold text-sm tabular-nums", current.totals.netProfit >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(current.totals.netProfit)}</td>
                                                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground font-semibold">{fmt(previous.totals.netProfit)}</td>
                                                <td className={cn("px-4 py-3.5 text-right font-extrabold tabular-nums", current.totals.netProfit >= previous.totals.netProfit ? "text-emerald-600" : "text-red-500")}>
                                                    {fmt(current.totals.netProfit - previous.totals.netProfit)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right flex justify-end">
                                                    {renderDelta(current.totals.netProfit, previous.totals.netProfit)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Comparative Visual Graph */}
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Rentabilité Comparée</CardTitle>
                                <CardDescription>Graphique comparatif CA vs Bénéfice Net</CardDescription>
                            </CardHeader>
                            <CardContent className="h-64 flex flex-col justify-between">
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                { name: "CA Actuel", CA: current.totals.totalRevenue, type: "CA" },
                                                { name: "CA Précédent", CA: previous.totals.totalRevenue, type: "CA" },
                                                { name: "Net Actuel", Net: current.totals.netProfit, type: "Net" },
                                                { name: "Net Précédent", Net: previous.totals.netProfit, type: "Net" }
                                            ]}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="name" fontSize={9} tickLine={false} />
                                            <YAxis fontSize={9} tickLine={false} />
                                            <Tooltip formatter={(value) => fmt(Number(value))} />
                                            <Bar dataKey="CA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Net" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
