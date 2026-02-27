"use client"

import {
    Bar, BarChart, CartesianGrid, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell
} from "recharts"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatter } from "@/lib/utils"
import {
    TrendingUp, TrendingDown, ShoppingCart, Users,
    AlertTriangle, Package, ReceiptText, DollarSign, CreditCard
} from "lucide-react"
import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

interface AnalyticsData {
    totalRevenue: number
    posRevenue: number
    invoiceRevenue: number
    totalExpenses: number
    totalPurchases: number
    cashCollected: number
    totalCOGS: number
    netProfit: number
    ordersCount: number
    salesCount: number
    outstandingDebt: number
    revenueOverTime: { date: string; revenue: number; expenses: number }[]
    topProducts: { name: string; quantity: number; revenue: number }[]
    categoryPerformance: { name: string; value: number }[]
    recentOrders: { id: string; customerName: string; total: number; paidAmount: number; date: string }[]
    topCustomers: { name: string; spent: number }[]
    lowStock: { id: string; name: string; stock: number; minStock: number }[]
    debtors: { id: string; name: string; balance: number }[]
}

interface AnalyticsClientProps {
    data: AnalyticsData
}

function KpiCard({
    title, value, icon: Icon, sub, color = "default"
}: {
    title: string
    value: string
    icon: React.ElementType
    sub?: React.ReactNode
    color?: "default" | "green" | "red" | "orange" | "blue" | "purple"
}) {
    const colorStyles = {
        default: "text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
        green: "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50",
        red: "text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/50",
        orange: "text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50",
        blue: "text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50",
        purple: "text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/50"
    }[color]

    const iconColor = {
        default: "text-slate-500",
        green: "text-emerald-500",
        red: "text-rose-500",
        orange: "text-amber-500",
        blue: "text-blue-500",
        purple: "text-purple-500"
    }[color]

    return (
        <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${colorStyles} shadow-sm backdrop-blur-xl border`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
                <div className={`rounded-xl p-2 bg-white/50 dark:bg-black/20 shadow-sm backdrop-blur-md`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {sub && <div className="text-xs flex-col mt-2 font-medium opacity-80">{sub}</div>}
            </CardContent>
        </Card>
    )
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl text-sm space-y-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <p className="text-slate-600 dark:text-slate-300">
                        {p.name}: <span className="font-medium text-slate-900 dark:text-slate-100">{formatter.format(p.value)}</span>
                    </p>
                </div>
            ))}
        </div>
    )
}

export const AnalyticsClient: React.FC<AnalyticsClientProps> = ({ data }) => {
    const [isMounted, setIsMounted] = React.useState(false)
    React.useEffect(() => { setIsMounted(true) }, [])
    if (!isMounted) return null
    if (!data) return <div className="p-8 text-center text-rose-500 font-medium bg-rose-50 rounded-xl">Aucune donnée analytique disponible.</div>

    const profitColor = data.netProfit >= 0 ? "green" : "red"
    const topCategoryTotal = data.categoryPerformance.reduce((a, c) => a + c.value, 0) || 1

    return (
        <div className="space-y-8 pb-8">
            <div className="flex flex-col gap-2">
                <Heading
                    title="Tableau de Bord Analytique"
                    description="Vue d'ensemble premium des performances et de la trésorerie de votre commerce."
                />
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-800" />

            {/* ── Section: Performances Générales ────────────────────────────────── */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" /> Performances Pures (Théorique)
                </h3>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        title="Chiffre d'affaires"
                        value={formatter.format(data.totalRevenue)}
                        icon={DollarSign}
                        color="blue"
                        sub={
                            <div className="flex flex-col gap-1">
                                <span>Total des ventes facturées/POS</span>
                                <span className="text-blue-600/70 dark:text-blue-400/70">{data.ordersCount + data.salesCount} transactions</span>
                            </div>
                        }
                    />
                    <KpiCard
                        title="Coût des Ventes (COGS)"
                        value={formatter.format(data.totalCOGS)}
                        icon={Package}
                        color="orange"
                        sub="Coût d'achat de la marchandise vendue"
                    />
                    <KpiCard
                        title="Charges & Dépenses"
                        value={formatter.format(data.totalExpenses)}
                        icon={TrendingDown}
                        color="red"
                        sub="Frais généraux enregistrés (loyer, salaires...)"
                    />
                    <KpiCard
                        title="Bénéfice Net"
                        value={formatter.format(data.netProfit)}
                        icon={TrendingUp}
                        color={profitColor}
                        sub={`Marge nette: ${data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : 0}%`}
                    />
                </div>
            </div>

            {/* ── Section: Trésorerie & Achats (Cash Flow) ────────────────────────────────── */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-500" /> Trésorerie & Opérations (Cash Flow)
                </h3>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <KpiCard
                        title="Encaissements Réels"
                        value={formatter.format(data.cashCollected)}
                        icon={DollarSign}
                        color="green"
                        sub={
                            <div className="flex flex-col gap-1 mt-1">
                                <span>Argent physiquement reçu</span>
                                {data.totalRevenue > data.cashCollected && (
                                    <span className="text-rose-600 dark:text-rose-400 font-bold tracking-tight">
                                        Reste à recouvrer: {formatter.format(data.totalRevenue - data.cashCollected)}
                                    </span>
                                )}
                            </div>
                        }
                    />
                    <KpiCard
                        title="Achats Fournisseurs"
                        value={formatter.format(data.totalPurchases)}
                        icon={ShoppingCart}
                        color="purple"
                        sub="Valeur totale du stock acheté (Bons de réception)"
                    />
                    <KpiCard
                        title="Créances Clients"
                        value={formatter.format(data.outstandingDebt)}
                        icon={AlertTriangle}
                        color={data.outstandingDebt > 0 ? "red" : "default"}
                        sub={`${data.debtors.length} client(s) ont des dettes impayées`}
                    />
                </div>
            </div>

            {/* ── Charts Row ─────────────────────────────── */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card className="shadow-md border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-base text-slate-800 dark:text-slate-200">Revenus vs Charges (30 derniers jours)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={data.revenueOverTime} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" dy={10} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000)}k`} dx={-10} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }} />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                                <Line type="monotone" dataKey="revenue" name="Revenus" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="expenses" name="Charges" stroke="#ef4444" strokeWidth={3} dot={false} strokeDasharray="5 5" activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Category Bar Chart */}
                <Card className="shadow-md border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-base text-slate-800 dark:text-slate-200">Chiffre d'affaires par catégorie</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.categoryPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={data.categoryPerformance} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000)}k`} />
                                    <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                                    <Bar dataKey="value" name="Ventes" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                                        {data.categoryPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée de catégorie.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Products & Customers ──────────────────────────────────── */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {/* Top Products */}
                <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b">
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-200"><Package className="h-4 w-4 text-indigo-500" /> Top 10 Produits (Revenus)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.topProducts.length === 0 && (
                                <p className="p-6 text-sm text-center text-muted-foreground">Aucune vente enregistrée.</p>
                            )}
                            {data.topProducts.map((product, i) => (
                                <div key={product.name} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                                        <p className="text-xs font-medium text-slate-500">{product.quantity} unités vendues</p>
                                    </div>
                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                                        {formatter.format(product.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Customers */}
                <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b">
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-200"><Users className="h-4 w-4 text-orange-500" /> Meilleurs Clients</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.topCustomers.length === 0 && <p className="p-6 text-sm text-center text-muted-foreground">Aucun client.</p>}
                            {data.topCustomers.map((c, i) => (
                                <div key={c.name} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-bold text-orange-600">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                                    </div>
                                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                        {formatter.format(c.spent)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Bottom Row: Recent Orders, Alerts ─────── */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Recent POS Orders */}
                <Card className="lg:col-span-2 border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b">
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-slate-200"><ReceiptText className="h-4 w-4 text-blue-500" /> Flux de Ventes Récents</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.recentOrders.length === 0 && <p className="p-6 text-sm text-center text-muted-foreground">Aucune vente récente.</p>}
                            {data.recentOrders.map(order => {
                                const isPartial = order.paidAmount < order.total
                                return (
                                    <div key={order.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{order.customerName}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-0.5">{order.date}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatter.format(order.total)}</p>
                                            {isPartial ? (
                                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 uppercase tracking-tighter">
                                                    Partiel: {formatter.format(order.paidAmount)}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 uppercase tracking-tighter">
                                                    Payé Complet
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts Stack */}
                <div className="space-y-6">
                    {/* Low Stock */}
                    <Card className="border-amber-200/60 dark:border-amber-900/40 shadow-sm bg-amber-50/30 dark:bg-amber-950/10">
                        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between border-b border-amber-100 dark:border-amber-900/50">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-500">
                                <AlertTriangle className="h-4 w-4" /> Stock faible
                            </CardTitle>
                            <Link href="/products/inventory">
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50">Gérer</Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-amber-100/50 dark:divide-amber-900/20">
                                {data.lowStock.length === 0 && <p className="p-4 text-xs font-medium text-amber-600/70 text-center">Aucun alerte stock.</p>}
                                {data.lowStock.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 px-4">
                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-200 truncate pr-2">{p.name}</p>
                                        <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="text-[10px] font-bold shrink-0">
                                            {p.stock} / {p.minStock}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Debtors */}
                    <Card className="border-rose-200/60 dark:border-rose-900/40 shadow-sm bg-rose-50/30 dark:bg-rose-950/10">
                        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between border-b border-rose-100 dark:border-rose-900/50">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-500">
                                <CreditCard className="h-4 w-4" /> Créances Impayées
                            </CardTitle>
                            <Link href="/customers/unpaid">
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/50">Gérer</Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-rose-100/50 dark:divide-rose-900/20">
                                {data.debtors.length === 0 && <p className="p-4 text-xs font-bold text-emerald-600 text-center flex items-center justify-center gap-1">Aucune créance en cours <TrendingUp className="h-3 w-3" /></p>}
                                {data.debtors.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-3 px-4">
                                        <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 truncate pr-2">{d.name}</p>
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md shrink-0">{formatter.format(d.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
