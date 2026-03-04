"use client"

import { useState, useEffect, useTransition } from "react"
import { getCommissionReport } from "@/actions/commissions"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Trophy, TrendingUp, Calculator, Printer } from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

const MONTHS = [
    { v: 0, l: "Toute l'année" },
    { v: 1, l: "Janvier" }, { v: 2, l: "Février" }, { v: 3, l: "Mars" },
    { v: 4, l: "Avril" }, { v: 5, l: "Mai" }, { v: 6, l: "Juin" },
    { v: 7, l: "Juillet" }, { v: 8, l: "Août" }, { v: 9, l: "Septembre" },
    { v: 10, l: "Octobre" }, { v: 11, l: "Novembre" }, { v: 12, l: "Décembre" },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i)

function fmt(n: number) { return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2 }).format(n) }

export default function CommissionsPage() {
    const [year, setYear] = useState(currentYear)
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [result, setResult] = useState<any>(null)
    const [isPending, startTransition] = useTransition()

    const load = () => {
        startTransition(async () => {
            const data = await getCommissionReport(year, month === 0 ? undefined : month)
            if ("error" in data) toast.error(data.error)
            else setResult(data)
        })
    }

    useEffect(() => { load() }, [year, month])

    const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"]

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Commissions Vendeurs</h1>
                    <p className="text-muted-foreground mt-1">CA et commissions par vendeur</p>
                </div>
                <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-xl no-print">
                    <Printer size={16} /> Imprimer
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end no-print">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mois</Label>
                    <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                        <SelectTrigger className="w-44 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTHS.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Année</Label>
                    <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                        <SelectTrigger className="w-32 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {result && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Taux Commission</p>
                            <p className="text-3xl font-black">{result.commissionRate}%</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">CA Total Équipe</p>
                            <p className="text-3xl font-black tabular-nums">{fmt(result.totalRevenue)}</p>
                            <p className="text-xs text-muted-foreground mt-1">DA</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Commissions à Verser</p>
                            <p className="text-3xl font-black tabular-nums text-amber-700 dark:text-amber-400">{fmt(result.totalCommission)}</p>
                            <p className="text-xs text-amber-500 mt-1">DA</p>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    {result.rows.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground">
                            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Aucune vente dans cette période</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900 dark:bg-gray-800 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Rang</th>
                                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Vendeur</th>
                                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Commandes</th>
                                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">CA (DA)</th>
                                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Commission (DA)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row: any, i: number) => (
                                        <tr key={row.userId} className={`border-t border-gray-100 dark:border-gray-800 ${i === 0 ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                                            <td className="px-6 py-4">
                                                <span className={cn("text-xl font-black", i < 3 ? medalColors[i] : "text-muted-foreground")}>
                                                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold">{row.userName}</p>
                                                <p className="text-xs text-muted-foreground">{row.role}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">{row.orderCount}</td>
                                            <td className="px-6 py-4 text-right font-mono font-semibold">{fmt(row.totalRevenue)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{fmt(row.commissionAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {isPending && !result && (
                <div className="py-20 text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20 animate-pulse" />
                    <p>Calcul en cours...</p>
                </div>
            )}
        </div>
    )
}
