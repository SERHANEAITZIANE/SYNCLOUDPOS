"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import type { DailyCloseData } from "@/types/daily-close"
import { formatter } from "@/lib/utils"
import toast from "react-hot-toast"
import {
    DollarSign, CreditCard, FileText, TrendingDown, TrendingUp, CheckCircle,
    Printer, RotateCcw, Archive, XCircle, Banknote, ArrowLeftRight, Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ClotureClientProps {
    history: any[]
    computeAction: () => Promise<{ data?: DailyCloseData; error?: string }>
    saveAction: (data: DailyCloseData, notes?: string) => Promise<{ success?: string; error?: string; id?: string }>
}

const MetricRow = ({ label, value, icon: Icon, colorClass = "text-slate-700 dark:text-slate-200" }: {
    label: string; value: string; icon: any; colorClass?: string
}) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 group">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className={cn("w-5 h-5", colorClass)} />
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        </div>
        <span className={cn("text-base font-bold tabular-nums", colorClass)}>{value}</span>
    </div>
)

export const ClotureClient = ({ history, computeAction, saveAction }: ClotureClientProps) => {
    const [data, setData] = useState<DailyCloseData | null>(null)
    const [notes, setNotes] = useState("")
    const [saved, setSaved] = useState(false)
    const [isPending, startTransition] = useTransition()
    const t = useTranslations("DailyClose")

    const handleCompute = () => {
        startTransition(async () => {
            const result = await computeAction()
            if (result.error) {
                toast.error(result.error)
            } else {
                setData(result.data!)
                setSaved(false)
            }
        })
    }

    const handleSave = () => {
        if (!data) return
        startTransition(async () => {
            const result = await saveAction(data, notes)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(t("saved"))
                setSaved(true)
            }
        })
    }

    const handlePrint = () => window.print()

    const handleReset = () => {
        setData(null)
        setNotes("")
        setSaved(false)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("title")}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {data && (
                        <>
                            <Button variant="outline" onClick={handleReset} disabled={isPending} className="gap-2">
                                <RotateCcw className="w-4 h-4" /> {t("reset")}
                            </Button>
                            <Button variant="outline" onClick={handlePrint} className="gap-2 print:hidden">
                                <Printer className="w-4 h-4" /> {t("print")}
                            </Button>
                            {!saved && (
                                <Button onClick={handleSave} disabled={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Archive className="w-4 h-4" /> {t("save")}
                                </Button>
                            )}
                        </>
                    )}
                    {!data && (
                        <Button
                            onClick={handleCompute}
                            disabled={isPending}
                            className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20"
                        >
                            <CheckCircle className="w-4 h-4" />
                            {isPending ? t("computing") : t("computeToday")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {!data && !isPending && (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-inner">
                        <FileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{t("emptyTitle")}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">{t("emptyDesc")}</p>
                    <Button
                        onClick={handleCompute}
                        disabled={isPending}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 px-8"
                    >
                        <CheckCircle className="w-5 h-5" />
                        {t("computeToday")}
                    </Button>
                </div>
            )}

            {/* Loading state */}
            {isPending && !data && (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-500">{t("computing")}</p>
                </div>
            )}

            {/* Report */}
            {data && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Left / Main - Breakdown */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Period Info */}
                        <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div className="text-sm">
                                <span className="text-blue-700 dark:text-blue-300 font-semibold">{t("period")}: </span>
                                <span className="text-blue-600 dark:text-blue-400">
                                    {new Date(data.periodStart).toLocaleDateString()} {new Date(data.periodStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    &nbsp;→&nbsp;
                                    {new Date(data.periodEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                            {saved && <Badge className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">{t("saved")}</Badge>}
                        </div>

                        {/* Revenue by Method */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                    <DollarSign className="w-5 h-5 text-emerald-500" /> {t("revenueBreakdown")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MetricRow label={t("cash")} value={formatter.format(data.cashRevenue)} icon={Banknote} colorClass="text-emerald-600 dark:text-emerald-400" />
                                <MetricRow label={t("transfer")} value={formatter.format(data.transferRevenue)} icon={ArrowLeftRight} colorClass="text-blue-600 dark:text-blue-400" />
                                <MetricRow label={t("check")} value={formatter.format(data.checkRevenue)} icon={FileText} colorClass="text-indigo-600 dark:text-indigo-400" />
                                <MetricRow label={t("term")} value={formatter.format(data.termRevenue)} icon={CreditCard} colorClass="text-violet-600 dark:text-violet-400" />
                                <div className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                                    <span className="font-bold text-emerald-900 dark:text-emerald-300">{t("totalRevenue")}</span>
                                    <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatter.format(data.totalRevenue)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expenses & Net */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                    <TrendingDown className="w-5 h-5 text-rose-500" /> {t("expensesAndNet")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MetricRow label={t("cashIn")} value={formatter.format(data.cashRevenue)} icon={Banknote} colorClass="text-emerald-600 dark:text-emerald-400" />
                                <MetricRow label={t("expenses")} value={`- ${formatter.format(data.totalExpenses)}`} icon={TrendingDown} colorClass="text-rose-600 dark:text-rose-400" />
                                <Separator className="my-3" />
                                <div className={cn(
                                    "flex items-center justify-between rounded-2xl px-4 py-3 border",
                                    data.netCash >= 0
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40"
                                        : "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {data.netCash >= 0
                                            ? <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            : <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                        }
                                        <span className={cn("font-bold", data.netCash >= 0 ? "text-emerald-900 dark:text-emerald-300" : "text-rose-900 dark:text-rose-300")}>{t("netCash")}</span>
                                    </div>
                                    <span className={cn("text-xl font-extrabold tabular-nums", data.netCash >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                                        {formatter.format(data.netCash)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("notes")}</label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t("notesPlaceholder")}
                                rows={3}
                                className="rounded-2xl border-slate-200 dark:border-slate-700"
                                disabled={saved}
                            />
                        </div>
                    </div>

                    {/* Right - Summary KPIs */}
                    <div className="space-y-4">
                        {[
                            { label: t("totalRevenue"), value: formatter.format(data.totalRevenue), icon: DollarSign, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" },
                            { label: t("totalExpenses"), value: formatter.format(data.totalExpenses), icon: TrendingDown, color: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400" },
                            { label: t("netCash"), value: formatter.format(data.netCash), icon: data.netCash >= 0 ? TrendingUp : XCircle, color: data.netCash >= 0 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400" },
                        ].map(k => (
                            <Card key={k.label} className={cn("border-0 shadow-sm", k.color)}>
                                <CardContent className="pt-6 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                                        <k.icon className="w-4 h-4" />{k.label}
                                    </div>
                                    <div className="text-2xl font-extrabold tabular-nums">{k.value}</div>
                                </CardContent>
                            </Card>
                        ))}

                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardContent className="pt-6 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">{t("posOrders")}</span>
                                    <Badge variant="outline" className="font-bold">{data.ordersCount}</Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">{t("blOrders")}</span>
                                    <Badge variant="outline" className="font-bold">{data.salesCount}</Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">{t("total")}</span>
                                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0 font-bold">{data.ordersCount + data.salesCount} {t("transactions")}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">{t("history")}</h2>
                    <div className="space-y-3">
                        {history.map((h) => (
                            <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-shadow gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <Archive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{new Date(h.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                                        <p className="text-xs text-slate-500">{h.ordersCount + h.salesCount} {t("transactions")}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 justify-end">
                                    <Badge variant="outline" className="font-medium text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                        CA {formatter.format(Number(h.totalRevenue))}
                                    </Badge>
                                    <Badge variant="outline" className="font-medium text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                                        Dep. {formatter.format(Number(h.totalExpenses))}
                                    </Badge>
                                    <Badge className={cn("font-bold border-0", Number(h.netCash) >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300")}>
                                        Net {formatter.format(Number(h.netCash))}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
