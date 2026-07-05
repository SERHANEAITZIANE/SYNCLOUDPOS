"use client"

import React, { useEffect, useState } from "react"
import { DashboardData } from "@/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { 
    TrendingUp, DollarSign, Package, 
    CreditCard, AlertTriangle, ArrowUpRight, ArrowDownRight, 
    ShoppingCart, ReceiptText, Users, Activity
} from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { useRouter, usePathname } from "@/i18n/routing"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/routing"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from "recharts"
import { useTranslations } from "next-intl"

interface DashboardClientProps {
    data: DashboardData
    initialDateRange?: {
        from: Date
        to: Date
    }
}

export function DashboardClientV2({ data, initialDateRange }: DashboardClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const t = useTranslations("Dashboard")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleDateChange = (newDateRange: DateRange | undefined) => {
        setDateRange(newDateRange)

        if (newDateRange?.from && newDateRange?.to) {
            const params = new URLSearchParams()
            params.set('from', newDateRange.from.toISOString())
            params.set('to', newDateRange.to.toISOString())
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        } else if (!newDateRange) {
            router.push(pathname, { scroll: false })
        }
    }

    const getLocalizedDescription = (desc: string, type: string) => {
        if (type === 'sale') {
            if (desc.startsWith('Vente POS')) {
                const customer = desc.split(' — ')[1] || t('activity.walkInCustomer')
                return `${t('activity.posSale')} — ${customer}`
            }
            if (desc.startsWith('BL ')) {
                const parts = desc.split(' — ')
                const blNum = parts[0].replace('BL ', '')
                const customer = parts[1] || t('activity.customer')
                return `${t('activity.deliveryNote')} ${blNum} — ${customer}`
            }
        }
        if (type === 'purchase') {
            const parts = desc.split(' — ')
            const purchaseNum = parts[0].replace('Achat ', '')
            const supplier = parts[1] || t('activity.supplier')
            return `${t('activity.purchase')} ${purchaseNum} — ${supplier}`
        }
        if (type === 'payment') {
            if (desc === 'Paiement reçu') {
                return t('activity.paymentReceived')
            }
            return desc
        }
        return desc
    }

    if (!isMounted) return null

    // Helper for % change
    const calculatePercentChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }

    const revChange = calculatePercentChange(data.totalRevenue, data.prevRevenue)
    const profitChange = calculatePercentChange(data.netProfit, data.prevProfit)
    const purchaseChange = calculatePercentChange(data.totalPurchases, data.prevPurchases)
    const margin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0
    const recoveryRate = data.totalRevenue > 0 ? (data.cashCollected / data.totalRevenue) * 100 : 0

    return (
        <div className="space-y-6 pb-8 animate-in fade-in duration-700">
            {/* 🟦 Section 1: Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {t('welcome')}, {data.userName.split(' ')[0]} <span className="animate-wave inline-block origin-bottom-right">👋</span>
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">
                        {data.companyName} {data.storeName ? `• ${data.storeName}` : ''}
                    </p>
                </div>
                <div className="bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                    <DatePickerWithRange date={dateRange} setDate={handleDateChange} />
                </div>
            </div>

            {/* 🟦 Section 2: Hero KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Revenue */}
                <Card className="border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-400">{t('revenue')}</CardTitle>
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-md text-blue-600 dark:text-blue-400">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {formatCurrency(data.totalRevenue)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 border-0 ${revChange >= 0 ? 'text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30' : 'text-rose-600 bg-rose-100/50 dark:bg-rose-900/30'}`}>
                                {revChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {Math.abs(revChange).toFixed(1)}%
                            </Badge>
                            <span className="text-xs text-slate-500">{t('vsPrevPeriod')}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Profit */}
                <Card className="border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t('netProfit')}</CardTitle>
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-md text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {formatCurrency(data.netProfit)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-0 text-emerald-700 bg-emerald-100/50 dark:text-emerald-400 dark:bg-emerald-900/30">
                                {t('margin')} {margin.toFixed(1)}%
                            </Badge>
                            <span className={`text-xs ${profitChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {profitChange >= 0 ? '↑' : '↓'} {Math.abs(profitChange).toFixed(0)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Cash Collected */}
                <Card className="border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-400">{t('cashCollected')}</CardTitle>
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-md text-purple-600 dark:text-purple-400">
                            <Activity className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {formatCurrency(data.cashCollected)}
                        </div>
                        <div className="w-full bg-purple-200/50 dark:bg-purple-900/30 rounded-full h-1.5 mt-3">
                            <div className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full" style={{ width: `${Math.min(recoveryRate, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium text-right">{recoveryRate.toFixed(1)}% {t('collected')}</p>
                    </CardContent>
                </Card>

                {/* Purchases */}
                <Card className="border-orange-500/20 bg-orange-50/30 dark:bg-orange-950/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-400">{t('purchases')}</CardTitle>
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-md text-orange-600 dark:text-orange-400">
                            <ShoppingCart className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {formatCurrency(data.totalPurchases)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 border-0 ${purchaseChange >= 0 ? 'text-orange-600 bg-orange-100/50 dark:bg-orange-900/30' : 'text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30'}`}>
                                {purchaseChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {Math.abs(purchaseChange).toFixed(1)}%
                            </Badge>
                            <span className="text-xs text-slate-500">{t('vsPrevPeriod')}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Debts */}
                <Card className="border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">{t('outstandingDebt')}</CardTitle>
                        <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 rounded-md text-rose-600 dark:text-rose-400">
                            <Users className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-500">
                            {formatCurrency(data.outstandingDebt)}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">{t('debtorsSplit', { count: data.debtors.length })}</p>
                    </CardContent>
                </Card>
            </div>

            {/* 🟦 Section 3: Revenue Chart */}
            <Card className="shadow-md border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" /> {t('revenueExpensesEvolution')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full mt-2">
                        {data.revenueOverTime.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.revenueOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={(val) => `${val / 1000}k`} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Area type="monotone" dataKey="revenue" name={t('revenue')} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area type="monotone" dataKey="expenses" name={t('expenses')} stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
                                {t('noDataForPeriod')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 🟦 Section 4: Insight Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories */}
                <Card className="shadow-md border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-500" /> {t('topCategories')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="h-[280px] w-full">
                            {data.categoryRevenue.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.categoryRevenue} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000)}k`} />
                                        <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Bar dataKey="revenue" name={t('revenue')} radius={[0, 4, 4, 0]} barSize={24}>
                                            {data.categoryRevenue.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'][index % 6]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
                                    {t('noSalesByCategory')}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="shadow-md border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
                    <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50">
                        <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" /> {t('recentActivity')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <div className="h-[280px] overflow-y-auto custom-scrollbar p-2">
                            <div className="space-y-1">
                                {data.activityFeed.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-slate-400">{t('noRecentActivity')}</div>
                                ) : (
                                    data.activityFeed.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                                item.color === 'emerald' ? 'bg-emerald-500' :
                                                item.color === 'blue' ? 'bg-blue-500' :
                                                item.color === 'purple' ? 'bg-purple-500' :
                                                item.color === 'green' ? 'bg-green-500' : 'bg-slate-500'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                    {getLocalizedDescription(item.description, item.type)}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                                            </div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {formatCurrency(item.amount)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🟦 Section 5: Bottom Row (Treasury, Alerts, Clients) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Treasury */}
                <Card className="shadow-md border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-500" /> {t('treasury')}</div>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{t('total')} {formatCurrency(data.treasuryTotal)}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.treasuryAccounts.length === 0 ? (
                                <p className="p-4 text-sm text-center text-slate-400">{t('noAccount')}</p>
                            ) : (
                                data.treasuryAccounts.map(acc => (
                                    <div key={acc.id} className="flex justify-between items-center p-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts */}
                <Card className="shadow-md border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
                    <CardHeader className="bg-amber-100/50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-500">
                            <AlertTriangle className="w-4 h-4" /> {t('requiredActions')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-100/50 dark:divide-amber-900/20">
                            {data.outOfStockCount > 0 && (
                                <Link href="/products/inventory" className="flex justify-between items-center p-3 px-4 hover:bg-amber-100/30 dark:hover:bg-amber-900/30 transition-colors">
                                    <span className="text-sm font-medium text-rose-700 dark:text-rose-400">🔴 {t('outOfStockProducts', { count: data.outOfStockCount })}</span>
                                    <ArrowUpRight className="w-3 h-3 text-rose-500" />
                                </Link>
                            )}
                            {data.lowStockCount > 0 && (
                                <Link href="/products/inventory" className="flex justify-between items-center p-3 px-4 hover:bg-amber-100/30 dark:hover:bg-amber-900/30 transition-colors">
                                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">🟡 {t('lowStockProducts', { count: data.lowStockCount })}</span>
                                    <ArrowUpRight className="w-3 h-3 text-amber-500" />
                                </Link>
                            )}
                            {data.pendingChequesCount > 0 && (
                                <Link href="/treasury/cheques" className="flex justify-between items-center p-3 px-4 hover:bg-amber-100/30 dark:hover:bg-amber-900/30 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">🟡 {t('pendingCheques', { count: data.pendingChequesCount })}</span>
                                        <span className="text-[10px] text-amber-600/70">{formatCurrency(data.pendingChequesAmount)}</span>
                                    </div>
                                    <ArrowUpRight className="w-3 h-3 text-amber-500" />
                                </Link>
                            )}
                            {data.overdueInvoicesCount > 0 && (
                                <Link href="/sales/invoices?status=PENDING" className="flex justify-between items-center p-3 px-4 hover:bg-amber-100/30 dark:hover:bg-amber-900/30 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-rose-700 dark:text-rose-400">🔴 {t('overdueInvoices', { count: data.overdueInvoicesCount })}</span>
                                        <span className="text-[10px] text-rose-600/70">{formatCurrency(data.overdueInvoicesAmount)}</span>
                                    </div>
                                    <ArrowUpRight className="w-3 h-3 text-rose-500" />
                                </Link>
                            )}
                            {!data.dailyCloseYesterday && (
                                <Link href="/daily-closes" className="flex justify-between items-center p-3 px-4 hover:bg-amber-100/30 dark:hover:bg-amber-900/30 transition-colors">
                                    <span className="text-sm font-medium text-rose-700 dark:text-rose-400">🔴 {t('missingDailyClose')}</span>
                                    <ArrowUpRight className="w-3 h-3 text-rose-500" />
                                </Link>
                            )}
                            {(data.outOfStockCount === 0 && data.lowStockCount === 0 && data.pendingChequesCount === 0 && data.overdueInvoicesCount === 0 && data.dailyCloseYesterday) && (
                                <div className="p-6 text-center">
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">✅ {t('allUpToDate')}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Products Table */}
                <Card className="shadow-md border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b pb-3 pt-4 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <ReceiptText className="w-4 h-4 text-slate-500" /> {t('topProducts')}
                        </CardTitle>
                        <Link href="/reports/sales" className="text-xs font-medium text-blue-600 hover:text-blue-700">{t('details')}</Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.topProducts.slice(0, 5).map((product, i) => (
                                <div key={i} className="flex justify-between items-center p-3 px-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                                            <p className="text-[10px] text-slate-500">{t('units', { count: product.quantity })}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded ml-2">
                                        {formatCurrency(product.revenue)}
                                    </span>
                                </div>
                            ))}
                            {data.topProducts.length === 0 && (
                                <p className="p-4 text-sm text-center text-slate-400">{t('noProductsSold')}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
