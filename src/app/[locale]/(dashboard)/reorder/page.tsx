import { getReorderSuggestions } from "@/actions/reorder"
import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, AlertTriangle, Package, ShoppingCart } from "lucide-react"
import { formatter } from "@/lib/utils"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
    title: "Réapprovisionnement | SynCloudPOS",
    description: "Suggestions intelligentes de réapprovisionnement basées sur les ventes"
}

const urgencyConfig = {
    critical: { label: "Critique", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800", icon: AlertTriangle, bar: "bg-rose-500" },
    warning: { label: "Urgent", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: TrendingDown, bar: "bg-amber-400" },
    low: { label: "À surveiller", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800", icon: Package, bar: "bg-blue-400" }
}

export default async function ReorderPage() {
    const session = await auth()
    // @ts-expect-error custom property
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER" && session?.user?.role !== "STOCK_MANAGER" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    const suggestions = await getReorderSuggestions(30)

    const criticalCount = suggestions.filter(s => s.urgency === "critical").length
    const warningCount = suggestions.filter(s => s.urgency === "warning").length

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-4 md:pt-6 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Réapprovisionnement Intelligent</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Basé sur la vélocité de vente des 30 derniers jours.</p>
                </div>
                <Link href="/purchases/new">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all">
                        <ShoppingCart className="w-4 h-4" />
                        Créer un Bon de Commande
                    </button>
                </Link>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Produits Critiques", value: criticalCount, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900" },
                    { label: "En Alerte", value: warningCount, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900" },
                    { label: "Total Suggestions", value: suggestions.length, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900" },
                ].map(k => (
                    <div key={k.label} className={`rounded-2xl border px-6 py-5 ${k.bg}`}>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{k.label}</p>
                        <p className={`text-4xl font-extrabold mt-1 tabular-nums ${k.color}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {suggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                        <Package className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Tous les stocks sont OK !</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">Aucun produit ne nécessite de réapprovisionnement dans les 14 prochains jours.</p>
                </div>
            )}

            {/* Suggestions List */}
            {suggestions.length > 0 && (
                <div className="space-y-3">
                    {suggestions.map(s => {
                        const config = urgencyConfig[s.urgency]
                        const Icon = config.icon
                        return (
                            <div key={s.productId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${config.color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-slate-900 dark:text-slate-100">{s.productName}</p>
                                                <Badge className={`text-xs border ${config.color} font-semibold`}>{config.label}</Badge>
                                                {s.categoryName && <span className="text-xs text-slate-400">{s.categoryName}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                                                <span>Stock: <strong className="text-slate-900 dark:text-slate-100">{s.currentStock}</strong></span>
                                                <span>·</span>
                                                <span>Min: {s.minStock}</span>
                                                <span>·</span>
                                                <span>Ventes/jour: <strong>{s.avgDailySales}</strong></span>
                                                {s.daysUntilStockout !== null && (
                                                    <>
                                                        <span>·</span>
                                                        <span className={s.urgency === "critical" ? "text-rose-600 font-bold" : ""}>
                                                            Rupture dans <strong>{s.daysUntilStockout}j</strong>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 ml-auto">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Qté suggérée</p>
                                            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">{s.suggestedQty}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Stock level bar */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                        <span>Niveau de stock</span>
                                        <span>{s.currentStock} / {Math.max(s.currentStock + s.suggestedQty, s.minStock + s.suggestedQty)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${config.bar}`}
                                            style={{ width: `${Math.min(100, (s.currentStock / Math.max(s.currentStock + s.suggestedQty, 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
