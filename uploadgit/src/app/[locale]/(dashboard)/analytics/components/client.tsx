"use client"

import {
    Bar, BarChart, CartesianGrid, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
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
    totalPurchaseCost: number
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
    sub?: string
    color?: "default" | "green" | "red" | "orange"
}) {
    const valueColor = {
        default: "text-foreground",
        green: "text-emerald-600",
        red: "text-red-500",
        orange: "text-amber-500"
    }[color]

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className="rounded-full bg-muted p-1.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
        </Card>
    )
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
            <p className="font-semibold">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {formatter.format(p.value)}
                </p>
            ))}
        </div>
    )
}

export const AnalyticsClient: React.FC<AnalyticsClientProps> = ({ data }) => {
    const [isMounted, setIsMounted] = React.useState(false)
    React.useEffect(() => { setIsMounted(true) }, [])
    if (!isMounted) return null
    if (!data) return <div className="p-4 text-red-500">Aucune donnée analytique disponible.</div>

    const profitColor = data.netProfit >= 0 ? "green" : "red"
    const topCategoryTotal = data.categoryPerformance.reduce((a, c) => a + c.value, 0) || 1

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading title="Analytiques" description="Vue d'ensemble des performances de votre commerce" />
            </div>
            <Separator />

            {/* ── KPI Row ─────────────────────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <KpiCard
                    title="Chiffre d'affaires"
                    value={formatter.format(data.totalRevenue)}
                    icon={DollarSign}
                    sub={`POS: ${formatter.format(data.posRevenue)} · Fact: ${formatter.format(data.invoiceRevenue)}`}
                />
                <KpiCard
                    title="Charges totales"
                    value={formatter.format(data.totalExpenses + data.totalPurchaseCost)}
                    icon={TrendingDown}
                    sub={`Dépenses: ${formatter.format(data.totalExpenses)} · Achats: ${formatter.format(data.totalPurchaseCost)}`}
                    color="red"
                />
                <KpiCard
                    title="Bénéfice net"
                    value={formatter.format(data.netProfit)}
                    icon={TrendingUp}
                    color={profitColor}
                    sub={`Marge: ${data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : 0}%`}
                />
                <KpiCard
                    title="Transactions"
                    value={`${data.ordersCount + data.salesCount}`}
                    icon={ShoppingCart}
                    sub={`POS: ${data.ordersCount} · Factures: ${data.salesCount}`}
                />
                <KpiCard
                    title="Créances clients"
                    value={formatter.format(data.outstandingDebt)}
                    icon={CreditCard}
                    color="orange"
                    sub={`${data.debtors.length} client(s) débiteur(s)`}
                />
            </div>

            {/* ── Revenue vs Expenses Chart ─────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenus vs Charges (30 derniers jours)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.revenueOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v.toLocaleString()} DA`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" name="Revenus" stroke="#6366f1" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="expenses" name="Charges" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* ── Products + Category ──────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" /> Top 10 Produits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.topProducts.length === 0 && (
                                <p className="text-sm text-muted-foreground">Aucune vente enregistrée.</p>
                            )}
                            {data.topProducts.map((product, i) => (
                                <div key={product.name} className="flex items-center gap-3">
                                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.quantity} unités vendues</p>
                                    </div>
                                    <span className="text-sm font-semibold text-emerald-600 shrink-0">
                                        {formatter.format(product.revenue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ventes par Catégorie</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.categoryPerformance.length === 0 && (
                                <p className="text-sm text-muted-foreground">Aucune donnée de catégorie.</p>
                            )}
                            {data.categoryPerformance.map((cat, i) => {
                                const pct = ((cat.value / topCategoryTotal) * 100).toFixed(1)
                                return (
                                    <div key={cat.name} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{cat.name}</span>
                                            <span className="text-muted-foreground">{pct}% · {formatter.format(cat.value)}</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-secondary">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Category Bar Chart ───────────────────────────────────── */}
            {data.categoryPerformance.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Chiffre d'affaires par catégorie</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.categoryPerformance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v.toLocaleString()}`} />
                                <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Ventes" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* ── Bottom Row: Recent, Customers, Low Stock, Debtors ─────── */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {/* Recent POS Orders */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Dernières ventes POS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.recentOrders.length === 0 && <p className="text-sm text-muted-foreground">Aucune vente récente.</p>}
                            {data.recentOrders.map(order => {
                                const isPartial = order.paidAmount < order.total
                                return (
                                    <div key={order.id} className="flex items-center justify-between py-1 border-b last:border-0">
                                        <div>
                                            <p className="text-sm font-medium">{order.customerName}</p>
                                            <p className="text-xs text-muted-foreground">{order.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">{formatter.format(order.total)}</p>
                                            {isPartial && (
                                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                                    Payé: {formatter.format(order.paidAmount)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Customers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Top Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.topCustomers.length === 0 && <p className="text-sm text-muted-foreground">Aucun client.</p>}
                            {data.topCustomers.map((c, i) => (
                                <div key={c.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                                        <p className="text-sm font-medium truncate max-w-[100px]">{c.name}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-indigo-600">{formatter.format(c.spent)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Low Stock + Debtors stacked */}
                <div className="space-y-4">
                    {/* Low Stock */}
                    <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" /> Stock faible</CardTitle>
                            <Link href="/products/inventory">
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-amber-600">Gérer</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.lowStock.length === 0 && <p className="text-xs text-muted-foreground">Aucun alerte stock.</p>}
                                {data.lowStock.map(p => (
                                    <div key={p.id} className="flex items-center justify-between">
                                        <p className="text-xs font-medium truncate max-w-[120px]">{p.name}</p>
                                        <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="text-xs">
                                            {p.stock} / {p.minStock}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Debtors */}
                    <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-red-500" /> Clients débiteurs</CardTitle>
                            <Link href="/customers/unpaid">
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-red-600">Gérer</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.debtors.length === 0 && <p className="text-xs text-muted-foreground text-emerald-600">Aucune créance en cours ✓</p>}
                                {data.debtors.map(d => (
                                    <div key={d.id} className="flex items-center justify-between">
                                        <p className="text-xs font-medium truncate max-w-[120px]">{d.name}</p>
                                        <span className="text-xs font-semibold text-red-500">{formatter.format(d.balance)}</span>
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
