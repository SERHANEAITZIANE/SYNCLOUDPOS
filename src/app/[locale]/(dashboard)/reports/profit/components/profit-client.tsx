"use client"

import { useState } from "react"
import { format } from "date-fns"
import { TrendingUp, TrendingDown, DollarSign, Percent, Package, Tag, Layers } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"

interface ProfitProduct {
    id: string
    name: string
    category: string
    brand: string
    qtySold: number
    revenue: number
    cost: number
    profit: number
    margin: number
}

interface GroupData {
    name: string
    revenue: number
    cost: number
    qtySold: number
    profit: number
    margin: number
}

interface ProfitReportClientProps {
    data: {
        products: ProfitProduct[]
        byCategory: GroupData[]
        byBrand: GroupData[]
        totals: {
            totalRevenue: number
            totalCost: number
            totalProfit: number
            overallMargin: number
        }
    }
}

type ViewMode = "products" | "categories" | "brands"

const fmt = (n: number) => n.toLocaleString("fr-DZ") + " DA"

export const ProfitReportClient: React.FC<ProfitReportClientProps> = ({ data }) => {
    const [viewMode, setViewMode] = useState<ViewMode>("products")
    const { totals } = data

    const kpis = [
        { label: "Chiffre d'Affaires", value: fmt(totals.totalRevenue), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
        { label: "Coût des Marchandises", value: fmt(totals.totalCost), icon: Package, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        { label: "Bénéfice Net", value: fmt(totals.totalProfit), icon: totals.totalProfit >= 0 ? TrendingUp : TrendingDown, color: totals.totalProfit >= 0 ? "text-emerald-600" : "text-red-600", bg: totals.totalProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30" },
        { label: "Marge Globale", value: `${totals.overallMargin.toFixed(1)}%`, icon: Percent, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    ]

    const tabs = [
        { key: "products" as ViewMode, label: "Par Produit", icon: Package },
        { key: "categories" as ViewMode, label: "Par Catégorie", icon: Layers },
        { key: "brands" as ViewMode, label: "Par Marque", icon: Tag },
    ]

    const getTableData = (): { name: string; qtySold: number; revenue: number; cost: number; profit: number; margin: number }[] => {
        if (viewMode === "categories") return data.byCategory
        if (viewMode === "brands") return data.byBrand
        return data.products.map(p => ({ name: p.name, qtySold: p.qtySold, revenue: p.revenue, cost: p.cost, profit: p.profit, margin: p.margin }))
    }

    const tableData = getTableData()

    return (
        <div className="space-y-6">
            <Heading
                title="Rapport de Rentabilité"
                description="Analyse des marges bénéficiaires par produit, catégorie et marque"
            />
            <Separator />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => {
                    const IconComponent = kpi.icon
                    return (
                        <Card key={kpi.label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                                    <IconComponent className={`h-4 w-4 ${kpi.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl w-fit">
                {tabs.map((tab) => {
                    const TabIcon = tab.icon
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setViewMode(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                viewMode === tab.key
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <TabIcon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Data Table */}
            {tableData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mb-3 opacity-40" />
                    <p className="font-medium">Aucune donnée pour cette période</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold">
                                        {viewMode === "products" ? "Produit" : viewMode === "categories" ? "Catégorie" : "Marque"}
                                    </th>
                                    <th className="text-right px-4 py-3 font-semibold">Qté Vendue</th>
                                    <th className="text-right px-4 py-3 font-semibold">CA</th>
                                    <th className="text-right px-4 py-3 font-semibold">Coût</th>
                                    <th className="text-right px-4 py-3 font-semibold">Bénéfice</th>
                                    <th className="text-right px-4 py-3 font-semibold">Marge</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">{row.name}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{row.qtySold}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{fmt(row.revenue)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(row.cost)}</td>
                                        <td className={`px-4 py-3 text-right tabular-nums font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {fmt(row.profit)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Badge
                                                variant="outline"
                                                className={`tabular-nums ${
                                                    row.margin >= 30 ? 'text-emerald-600 border-emerald-200 dark:border-emerald-800' :
                                                    row.margin >= 15 ? 'text-amber-600 border-amber-200 dark:border-amber-800' :
                                                    'text-red-600 border-red-200 dark:border-red-800'
                                                }`}
                                            >
                                                {row.margin.toFixed(1)}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
