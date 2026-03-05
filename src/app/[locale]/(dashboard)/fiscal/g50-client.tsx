"use client"

import { useState } from "react"
import { getG50Data, G50Result } from "@/actions/g50"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Printer, Calculator, AlertTriangle } from "lucide-react"
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
                        Ce calcul est basé exclusivement sur les <strong>Factures (INVOICE)</strong> émises pendant la période sélectionnée.
                        Les ventes POS et les Bons de Livraison ne sont pas inclus. Vérifiez toujours avec votre comptable avant soumission.
                    </p>
                </div>

                {/* Result */}
                {result && (
                    <div className="g50-result space-y-6">
                        {/* Header */}
                        <div className="text-center border-b pb-6 border-gray-200 dark:border-gray-700">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                                    <FileText className="h-8 w-8 text-blue-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">APERÇU DÉCLARATION G50</h2>
                            <p className="text-muted-foreground mt-1 font-medium">L'impression générera le formulaire officiel DGI (Cerfa)</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Basé sur <span className="font-bold text-foreground">{result.totalInvoices}</span> facture(s)
                            </p>
                        </div>

                        {/* G50 Table */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-900 dark:bg-gray-800 text-white">
                                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Taux TVA</th>
                                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Base Imposable HT (DA)</th>
                                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Montant TVA (DA)</th>
                                        <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Total TTC (DA)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, i) => (
                                        <tr
                                            key={row.rate}
                                            className={`border-b border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-900/50"}`}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black ${row.rate === 19 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                        row.rate === 9 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        }`}>
                                                        TVA {row.rate}%
                                                    </span>
                                                    {row.rate === 0 && <span className="text-xs text-muted-foreground">(Exonéré)</span>}
                                                    {row.rate === 9 && <span className="text-xs text-muted-foreground">(Taux réduit)</span>}
                                                    {row.rate === 19 && <span className="text-xs text-muted-foreground">(Taux normal)</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-semibold">
                                                {fmt(row.baseHT)}
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                                                {fmt(row.tvaAmount)}
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-semibold">
                                                {fmt(row.totalTTC)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-900 dark:bg-gray-800 text-white">
                                        <td className="px-6 py-5 font-black uppercase tracking-wider text-sm">TOTAL</td>
                                        <td className="px-6 py-5 text-right font-black text-lg font-mono">
                                            {fmt(result.grandHT)}
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-lg font-mono text-blue-300">
                                            {fmt(result.grandTVA)}
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-lg font-mono">
                                            {fmt(result.grandTTC)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Chiffre d'affaires HT</p>
                                <p className="text-2xl font-black tabular-nums">{fmt(result.grandHT)}</p>
                                <p className="text-xs text-muted-foreground mt-1">DA</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">TVA Collectée à Verser</p>
                                <p className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-400">{fmt(result.grandTVA)}</p>
                                <p className="text-xs text-blue-500 mt-1">DA</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Total Facturé TTC</p>
                                <p className="text-2xl font-black tabular-nums">{fmt(result.grandTTC)}</p>
                                <p className="text-xs text-muted-foreground mt-1">DA</p>
                            </div>
                        </div>
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
