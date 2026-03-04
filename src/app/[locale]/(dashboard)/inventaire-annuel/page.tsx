"use client"

import { useState } from "react"
import { getInventoryAnnualReport } from "@/actions/inventory-annual"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BarChart3, Printer, Package, Download } from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

function fmt(n: number) { return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2 }).format(n) }

export default function InventaireAnnuelPage() {
    const [year, setYear] = useState(currentYear)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const load = async () => {
        setLoading(true)
        const data = await getInventoryAnnualReport(year)
        if ("error" in data) toast.error(data.error)
        else setResult(data)
        setLoading(false)
    }

    const toggleCat = (cat: string) => {
        setExpanded(prev => {
            const n = new Set(prev)
            n.has(cat) ? n.delete(cat) : n.add(cat)
            return n
        })
    }

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Inventaire Annuel</h1>
                    <p className="text-muted-foreground mt-1">Valorisation du stock par catégorie</p>
                </div>
                {result && (
                    <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-xl no-print">
                        <Printer size={16} /> Imprimer
                    </Button>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-4 items-end no-print">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exercice</Label>
                    <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                        <SelectTrigger className="w-32 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={load} disabled={loading} className="h-10 px-6 rounded-xl gap-2">
                    <BarChart3 size={16} />
                    {loading ? "Calcul..." : "Générer l'inventaire"}
                </Button>
            </div>

            {/* Summary Cards */}
            {result && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Références</p>
                            <p className="text-3xl font-black">{result.totalProducts.toLocaleString()}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Unités en stock</p>
                            <p className="text-3xl font-black">{result.totalUnits.toLocaleString()}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Valeur au Prix d'Achat</p>
                            <p className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-300">{fmt(result.totalCostValue)}</p>
                            <p className="text-xs text-blue-500 mt-1">DA</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Valeur au Prix de Vente</p>
                            <p className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">{fmt(result.totalRetailValue)}</p>
                            <p className="text-xs text-emerald-500 mt-1">DA</p>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                        {Object.entries(result.byCategory as Record<string, any[]>).map(([cat, items]) => {
                            const catCost = items.reduce((s, r) => s + r.costValue, 0)
                            const catRetail = items.reduce((s, r) => s + r.retailValue, 0)
                            const catStock = items.reduce((s, r) => s + r.stock, 0)
                            const isOpen = expanded.has(cat)
                            return (
                                <div key={cat} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => toggleCat(cat)}
                                        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={cn("w-2 h-2 rounded-full bg-blue-500")} />
                                            <span className="font-bold text-sm">{cat}</span>
                                            <span className="text-xs text-muted-foreground">{items.length} réf · {catStock} unités</span>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm">
                                            <span className="text-blue-600 font-mono font-bold">{fmt(catCost)} DA</span>
                                            <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-white dark:bg-gray-900">
                                                    <th className="px-6 py-2 text-left font-bold text-muted-foreground">Produit</th>
                                                    <th className="px-6 py-2 text-right font-bold text-muted-foreground">Stock</th>
                                                    <th className="px-6 py-2 text-right font-bold text-muted-foreground">P.U. Achat</th>
                                                    <th className="px-6 py-2 text-right font-bold text-muted-foreground">P.U. Vente</th>
                                                    <th className="px-6 py-2 text-right font-bold text-muted-foreground">Val. Achat</th>
                                                    <th className="px-6 py-2 text-right font-bold text-muted-foreground">Val. Vente</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((row, idx) => (
                                                    <tr key={row.id} className={`border-t border-gray-100 dark:border-gray-800 ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/40 dark:bg-gray-900/50"} ${row.stock === 0 ? "opacity-40" : ""}`}>
                                                        <td className="px-6 py-2.5 font-medium">{row.name}</td>
                                                        <td className="px-6 py-2.5 text-right font-mono">{row.stock}</td>
                                                        <td className="px-6 py-2.5 text-right font-mono text-muted-foreground">{row.costPrice ? fmt(row.costPrice) : "—"}</td>
                                                        <td className="px-6 py-2.5 text-right font-mono">{fmt(row.salePrice)}</td>
                                                        <td className="px-6 py-2.5 text-right font-mono text-blue-600 font-bold">{fmt(row.costValue)}</td>
                                                        <td className="px-6 py-2.5 text-right font-mono text-emerald-600 font-bold">{fmt(row.retailValue)}</td>
                                                    </tr>
                                                ))}
                                                {/* Category subtotal */}
                                                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-bold">
                                                    <td className="px-6 py-2.5 text-xs uppercase tracking-wider" colSpan={4}>Sous-total {cat}</td>
                                                    <td className="px-6 py-2.5 text-right text-blue-700">{fmt(catCost)}</td>
                                                    <td className="px-6 py-2.5 text-right text-emerald-700">{fmt(catRetail)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Grand Total */}
                    <div className="p-6 rounded-2xl bg-gray-900 dark:bg-gray-800 text-white text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">TOTAL GÉNÉRAL INVENTAIRE {result.year}</p>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Valeur au Prix d'Achat</p>
                                <p className="text-3xl font-black tabular-nums text-blue-300">{fmt(result.totalCostValue)}</p>
                                <p className="text-xs text-gray-500">DA</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Valeur au Prix de Vente</p>
                                <p className="text-3xl font-black tabular-nums text-emerald-300">{fmt(result.totalRetailValue)}</p>
                                <p className="text-xs text-gray-500">DA</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-4 print-only hidden">Document généré par SYNCLOUDPOS · Inventaire au {new Date().toLocaleDateString("fr-DZ")}</p>
                    </div>
                </>
            )}

            {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Package className="h-16 w-16 opacity-20 mb-4" />
                    <p className="text-lg font-medium">Sélectionnez l'exercice et générez l'inventaire</p>
                    <p className="text-sm mt-1 opacity-70">Valorisation du stock actuel par catégorie et totaux</p>
                </div>
            )}
        </div>
    )
}
