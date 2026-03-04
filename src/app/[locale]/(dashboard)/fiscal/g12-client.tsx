"use client"

import { useState } from "react"
import { getG12Data, G12Result, IFURate } from "@/actions/g12"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calculator, Printer, TrendingUp, AlertTriangle, Info } from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

const IFU_RATES: { value: IFURate; label: string; description: string }[] = [
    { value: 5, label: "5%", description: "Production & vente de biens (industrie, commerce de marchandises)" },
    { value: 12, label: "12%", description: "Autres activités (services, commerce, professions)" },
    { value: 0.5, label: "0,5%", description: "Auto-entrepreneurs" },
]

function fmt(n: number) {
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function G12Client() {
    const [year, setYear] = useState(currentYear)
    const [ifuRate, setIfuRate] = useState<IFURate>(5)
    const [mode, setMode] = useState<"previsionnel" | "definitif">("previsionnel")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<G12Result | null>(null)

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const data = await getG12Data(year, ifuRate, mode)
            if ("error" in data) {
                toast.error(data.error)
            } else {
                setResult(data)
            }
        } catch {
            toast.error("Erreur lors du calcul G12")
        } finally {
            setLoading(false)
        }
    }

    const selectedRate = IFU_RATES.find(r => r.value === ifuRate)

    return (
        <div className="space-y-8">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit no-print">
                {(["previsionnel", "definitif"] as const).map(m => (
                    <button
                        key={m}
                        onClick={() => { setMode(m); setResult(null) }}
                        className={cn(
                            "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                            mode === m
                                ? "bg-white dark:bg-gray-800 shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {m === "previsionnel" ? "📋 G12 — Prévisionnel" : "✅ G12 Bis — Définitif"}
                    </button>
                ))}
            </div>

            {/* Explanation */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl no-print">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    {mode === "previsionnel" ? (
                        <>
                            <strong>G12 Prévisionnel</strong> — À déposer avant le <strong>30 juin</strong> de l'année en cours.
                            Déclarez votre chiffre d'affaires estimé et calculez l'IFU prévisionnel à verser par trimestre.
                        </>
                    ) : (
                        <>
                            <strong>G12 Bis Définitif</strong> — À déposer avant le <strong>20 janvier</strong> de l'année suivante.
                            Régularisez votre IFU sur la base du chiffre d'affaires réellement réalisé.
                        </>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-end p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm no-print">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Année fiscale</Label>
                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-32 h-10 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {YEARS.map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5 flex-1 min-w-64">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux IFU applicable</Label>
                    <Select value={String(ifuRate)} onValueChange={(v) => setIfuRate(Number(v) as IFURate)}>
                        <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {IFU_RATES.map(r => (
                                <SelectItem key={r.value} value={String(r.value)}>
                                    {r.label} — {r.description}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedRate && (
                        <p className="text-xs text-muted-foreground">{selectedRate.description}</p>
                    )}
                </div>

                <Button onClick={handleGenerate} disabled={loading} className="h-10 px-6 rounded-xl gap-2">
                    <Calculator size={16} />
                    {loading ? "Calcul..." : "Calculer IFU"}
                </Button>

                {result && (
                    <Button variant="outline" onClick={() => window.print()} className="h-10 px-6 rounded-xl gap-2">
                        <Printer size={16} />
                        Imprimer
                    </Button>
                )}
            </div>

            {/* Warning for non-TVA */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl no-print">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    Le régime IFU s'applique aux entreprises <strong>non assujetties à la TVA</strong> dont le CA annuel est
                    en dessous du seuil légal. Si votre entreprise est assujettie à la TVA, utilisez l'onglet <strong>G50</strong>.
                </p>
            </div>

            {/* Result */}
            {result && (
                <div className="g12-result space-y-6">
                    {/* Header */}
                    <div className="text-center border-b pb-6 border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-black tracking-tight">
                            {mode === "previsionnel" ? "FORMULAIRE G12 — IFU PRÉVISIONNEL" : "FORMULAIRE G12 Bis — IFU DÉFINITIF"}
                        </h2>
                        <p className="text-muted-foreground mt-1 font-medium">Exercice fiscal {result.year}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Taux IFU appliqué : <span className="font-bold text-foreground">{result.ifuRate}%</span>
                        </p>
                    </div>

                    {/* Quarterly Breakdown */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-900 dark:bg-gray-800 text-white">
                                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Trimestre</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">CA HT (DA)</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">IFU {result.ifuRate}% (DA)</th>
                                    <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-xs">Échéance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.quarters.map((q, i) => {
                                    const dueMonths: Record<number, string> = { 1: "20 Avril", 2: "20 Juillet", 3: "20 Octobre", 4: "20 Janvier" }
                                    const hasData = q.caHT > 0
                                    return (
                                        <tr
                                            key={q.quarter}
                                            className={`border-b border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-900/50"} ${!hasData ? "opacity-40" : ""}`}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black",
                                                        hasData ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                                                    )}>T{q.quarter}</span>
                                                    <span className="font-medium">{q.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-semibold">{fmt(q.caHT)}</td>
                                            <td className="px-6 py-5 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">{fmt(q.ifuAmount)}</td>
                                            <td className="px-6 py-5 text-center text-xs text-muted-foreground font-medium">{dueMonths[q.quarter]}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-900 dark:bg-gray-800 text-white">
                                    <td className="px-6 py-5 font-black uppercase tracking-wider text-sm">TOTAL ANNUEL</td>
                                    <td className="px-6 py-5 text-right font-black text-lg font-mono">{fmt(result.totalCA)}</td>
                                    <td className="px-6 py-5 text-right font-black text-lg font-mono text-indigo-300">{fmt(result.totalIFU)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Projection Card (previsionnel only) */}
                    {mode === "previsionnel" && result.projectedCA && (
                        <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                                <h3 className="font-bold text-indigo-800 dark:text-indigo-300">Projection Fin d'Année</h3>
                                <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                    (basé sur {result.monthsElapsed} mois de données)
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">CA Annuel Projeté</p>
                                    <p className="text-2xl font-black tabular-nums text-indigo-800 dark:text-indigo-300">{fmt(result.projectedCA)}</p>
                                    <p className="text-xs text-indigo-500 mt-1">DA</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">IFU Annuel Projeté</p>
                                    <p className="text-2xl font-black tabular-nums text-indigo-800 dark:text-indigo-300">{fmt(result.projectedIFU!)}</p>
                                    <p className="text-xs text-indigo-500 mt-1">DA</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Chiffre d'Affaires HT {result.year}</p>
                            <p className="text-2xl font-black tabular-nums">{fmt(result.totalCA)}</p>
                            <p className="text-xs text-muted-foreground mt-1">DA</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">IFU Total à Verser ({result.ifuRate}%)</p>
                            <p className="text-2xl font-black tabular-nums text-indigo-700 dark:text-indigo-400">{fmt(result.totalIFU)}</p>
                            <p className="text-xs text-indigo-500 mt-1">DA</p>
                        </div>
                    </div>

                    {/* Regime note */}
                    <div className="text-center text-xs text-muted-foreground pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <p>Régime IFU · Taux {result.ifuRate}% · {selectedRate?.description}</p>
                        <p className="mt-1 print-only hidden">Document généré par SYNCLOUDPOS — À vérifier avec votre comptable · {new Date().toLocaleDateString("fr-DZ", { dateStyle: "long" })}</p>
                    </div>
                </div>
            )}

            {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Calculator className="h-16 w-16 opacity-20 mb-4" />
                    <p className="text-lg font-medium">Sélectionnez l'année, le taux IFU, et cliquez sur Calculer</p>
                    <p className="text-sm mt-1 opacity-70">G12 = Prévisionnel (avant 30 juin) · G12 Bis = Définitif (avant 20 janvier)</p>
                </div>
            )}
        </div>
    )
}
