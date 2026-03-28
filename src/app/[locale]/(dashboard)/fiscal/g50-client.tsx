"use client"

import { useState } from "react"
import { getG50Data, G50Result } from "@/actions/g50"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Printer, Calculator, AlertTriangle, TrendingDown, TrendingUp, Receipt, Banknote } from "lucide-react"
import { toast } from "react-hot-toast"
import { G50PrintTemplate } from "./components/g50-print-template"

const MONTHS = [
    { value: 1, label: "Janvier" },
    { value: 2, label: "Février" },
    { value: 3, label: "Mars" },
    { value: 4, label: "Avril" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juin" },
    { value: 7, label: "Juillet" },
    { value: 8, label: "Août" },
    { value: 9, label: "Septembre" },
    { value: 10, label: "Octobre" },
    { value: 11, label: "Novembre" },
    { value: 12, label: "Décembre" },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

function fmt(n: number) {
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function G50Client() {
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear] = useState(currentYear)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<G50Result | null>(null)

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const data = await getG50Data(year, month)
            if ("error" in data) {
                toast.error(data.error)
            } else {
                setResult(data)
            }
        } catch {
            toast.error("Erreur lors du calcul G50")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <>
            <div className="space-y-8 print:hidden">
                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-end p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm no-print">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mois</Label>
                        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                            <SelectTrigger className="w-44 h-10 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map(m => (
                                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Année</Label>
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

                    <Button onClick={handleGenerate} disabled={loading} className="h-10 px-6 rounded-xl gap-2">
                        <Calculator size={16} />
                        {loading ? "Calcul..." : "Calculer G50"}
                    </Button>

                    {result && (
                        <Button variant="outline" onClick={handlePrint} className="h-10 px-6 rounded-xl gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900 dark:hover:bg-indigo-950/30">
                            <Printer size={16} />
                            Imprimer le formulaire officiel
                        </Button>
                    )}
                </div>

                {/* Notice */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl no-print">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        Ce calcul est basé sur les <strong>Factures (INVOICE)</strong> et <strong>Avoirs (CREDIT_NOTE)</strong> émis pendant la période sélectionnée.
                        La TVA déductible est calculée à partir des <strong>Bons d'achat (FACTURE/COMPLETED)</strong>. Vérifiez toujours avec votre comptable.
                    </p>
                </div>

                {/* Result */}
                {result && (
                    <div className="g50-result space-y-8">
                        {/* Header */}
                        <div className="text-center border-b pb-6 border-gray-200 dark:border-gray-700">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                                    <FileText className="h-8 w-8 text-blue-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">APERÇU DÉCLARATION G50</h2>
                            <p className="text-muted-foreground mt-1 font-medium">Période : {result.period}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Basé sur <span className="font-bold text-foreground">{result.totalInvoices}</span> facture(s)
                            </p>
                        </div>

                        {/* ═══════ SECTION I: TVA Collectée ═══════ */}
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 flex items-center gap-2 mb-3">
                                <TrendingUp size={16} />
                                I — TVA Collectée (Ventes)
                            </h3>
                            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-900 dark:bg-gray-800 text-white">
                                            <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Taux TVA</th>
                                            <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Base HT (DA)</th>
                                            <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">TVA (DA)</th>
                                            <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Total TTC (DA)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.rows.map((row, i) => (
                                            <tr key={row.rate} className={`border-b border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-900/50"}`}>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${row.rate === 19 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                        row.rate === 9 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        }`}>
                                                        TVA {row.rate}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-semibold">{fmt(row.baseHT)}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-blue-700 dark:text-blue-400">{fmt(row.tvaAmount)}</td>
                                                <td className="px-6 py-4 text-right font-mono font-semibold">{fmt(row.totalTTC)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-900 dark:bg-gray-800 text-white">
                                            <td className="px-6 py-4 font-black uppercase text-sm">Total Collectée</td>
                                            <td className="px-6 py-4 text-right font-black font-mono">{fmt(result.grandHT)}</td>
                                            <td className="px-6 py-4 text-right font-black font-mono text-blue-300">{fmt(result.grandTVA)}</td>
                                            <td className="px-6 py-4 text-right font-black font-mono">{fmt(result.grandTTC)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* ═══════ SECTION III: TVA Déductible ═══════ */}
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-600 flex items-center gap-2 mb-3">
                                <TrendingDown size={16} />
                                III — TVA Déductible (Achats)
                            </h3>
                            <div className="overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-700/30">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-emerald-700 text-white">
                                            <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-xs">Taux TVA</th>
                                            <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">Base HT Achat (DA)</th>
                                            <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">TVA Déductible (DA)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.deductibleRows.map((row, i) => (
                                            <tr key={row.rate} className={`border-b border-emerald-100 dark:border-emerald-800/30 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-emerald-50/30 dark:bg-emerald-950/10"}`}>
                                                <td className="px-6 py-3">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        TVA {row.rate}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono font-semibold">{fmt(row.baseHT)}</td>
                                                <td className="px-6 py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{fmt(row.tvaAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-emerald-700 text-white">
                                            <td className="px-6 py-3 font-black uppercase text-sm">Total Déductible</td>
                                            <td className="px-6 py-3 text-right"></td>
                                            <td className="px-6 py-3 text-right font-black font-mono">{fmt(result.totalDeductibleTVA)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* ═══════ Summary Cards — The Important Numbers ═══════ */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* TVA Nette */}
                            <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-center">
                                <div className="flex justify-center mb-2"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">TVA Nette à Payer</p>
                                <p className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-400">{fmt(result.netTVA)}</p>
                                <p className="text-[10px] text-blue-500 mt-0.5">({fmt(result.grandTVA)} - {fmt(result.totalDeductibleTVA)})</p>
                            </div>

                            {/* TAP */}
                            <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 text-center">
                                <div className="flex justify-center mb-2"><Banknote className="h-5 w-5 text-purple-500" /></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-1">TAP ({result.tapRate}%)</p>
                                <p className="text-2xl font-black tabular-nums text-purple-700 dark:text-purple-400">{fmt(result.tapAmount)}</p>
                                <p className="text-[10px] text-purple-500 mt-0.5">sur CA HT: {fmt(result.grandHT)}</p>
                            </div>

                            {/* Timbre Collecté */}
                            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-center">
                                <div className="flex justify-center mb-2"><Receipt className="h-5 w-5 text-amber-500" /></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Timbre Collecté</p>
                                <p className="text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400">{fmt(result.totalTimbre)}</p>
                                <p className="text-[10px] text-amber-500 mt-0.5">Droit de timbre</p>
                            </div>

                            {/* TOTAL À VERSER */}
                            <div className="p-5 rounded-2xl bg-gray-900 dark:bg-gray-100 text-center">
                                <div className="flex justify-center mb-2"><FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" /></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Total à Verser</p>
                                <p className="text-2xl font-black tabular-nums text-white dark:text-gray-900">{fmt(result.totalTaxDue)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">TVA + TAP + Timbre</p>
                            </div>
                        </div>

                        {/* Retenue à la source summary */}
                        {result.totalWithholding > 0 && (
                            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Retenue à la Source Effectuée</p>
                                    <p className="text-[10px] text-rose-500 mt-0.5">Montant retenu sur les achats fournisseurs ce mois</p>
                                </div>
                                <p className="text-xl font-black text-rose-700 dark:text-rose-400">{fmt(result.totalWithholding)} DA</p>
                            </div>
                        )}
                    </div>
                )}

                {!result && !loading && (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <Calculator className="h-16 w-16 opacity-20 mb-4" />
                        <p className="text-lg font-medium">Sélectionnez une période et cliquez sur Calculer G50</p>
                        <p className="text-sm mt-1 opacity-70">Les données seront basées sur vos factures de type INVOICE</p>
                    </div>
                )}
            </div>

            {/* The Print Layout - Only Visible When Printing */}
            <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black min-h-screen z-[9999]">
                {result && <G50PrintTemplate data={result} />}
            </div>
        </>
    )
}
