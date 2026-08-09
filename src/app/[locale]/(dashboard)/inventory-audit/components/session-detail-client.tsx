"use client"

import { useState, useTransition, useMemo } from "react"
import toast from "react-hot-toast"
import { updateStockCountItem, approveStockCountSession, cancelStockCountSession } from "@/actions/inventory-audit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, AlertTriangle, Minus, Plus, Search, Filter, Folder, Tag, Barcode as BarcodeIcon, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Item {
    id: string
    productId: string
    productName: string
    expectedQty: number
    actualQty: number
    difference: number
    categoryId?: string | null
    categoryName?: string | null
    brandId?: string | null
    brandName?: string | null
    barcodes?: string[]
}

interface CategoryOption {
    id: string
    name: string
}

interface BrandOption {
    id: string
    name: string
}

interface SessionDetailClientProps {
    sessionId: string
    sessionName: string
    status: string
    items: Item[]
    categories?: CategoryOption[]
    brands?: BrandOption[]
}

export function SessionDetailClient({ 
    sessionId, 
    sessionName, 
    status, 
    items: initialItems,
    categories = [],
    brands = []
}: SessionDetailClientProps) {
    const [items, setItems] = useState<Item[]>(initialItems)
    const [isPending, startTransition] = useTransition()
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
    const [selectedBrand, setSelectedBrand] = useState<string>("ALL")
    const [filterType, setFilterType] = useState<"ALL" | "DISCREPANCY" | "SURPLUS" | "MISSING" | "MATCH">("ALL")

    const isOpen = status === "OPEN"

    const handleChange = (itemId: string, value: number) => {
        setItems(prev => prev.map(i =>
            i.id === itemId
                ? { ...i, actualQty: value, difference: value - i.expectedQty }
                : i
        ))
    }

    const handleBlur = (item: Item) => {
        if (!isOpen) return
        startTransition(async () => {
            await updateStockCountItem(item.id, item.actualQty)
        })
    }

    const handleApprove = () => {
        startTransition(async () => {
            const result = await approveStockCountSession(sessionId)
            if (result.error) toast.error(result.error)
            else toast.success(result.success || "Approuvé!")
        })
    }

    const handleCancel = () => {
        if (!confirm("Annuler cette session ? Les modifications ne seront pas appliquées.")) return
        startTransition(async () => {
            const result = await cancelStockCountSession(sessionId)
            if (result.error) toast.error(result.error)
            else toast.success("Session annulée.")
        })
    }

    // Filter items based on search, category, brand, and discrepancy type
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Search (Name or Barcode)
            const q = search.trim().toLowerCase()
            if (q) {
                const nameMatch = item.productName.toLowerCase().includes(q)
                const barcodeMatch = item.barcodes?.some(b => b.toLowerCase().includes(q))
                if (!nameMatch && !barcodeMatch) return false
            }

            // Category Filter
            if (selectedCategory !== "ALL") {
                if (item.categoryId !== selectedCategory) return false
            }

            // Brand Filter
            if (selectedBrand !== "ALL") {
                if (item.brandId !== selectedBrand) return false
            }

            // Filter Type (Discrepancy)
            if (filterType === "DISCREPANCY" && item.difference === 0) return false
            if (filterType === "SURPLUS" && item.difference <= 0) return false
            if (filterType === "MISSING" && item.difference >= 0) return false
            if (filterType === "MATCH" && item.difference !== 0) return false

            return true
        })
    }, [items, search, selectedCategory, selectedBrand, filterType])

    // Discrepancies count across all items
    const discrepancies = useMemo(() => items.filter(i => i.difference !== 0), [items])
    const surplusCount = useMemo(() => items.filter(i => i.difference > 0).length, [items])
    const missingCount = useMemo(() => items.filter(i => i.difference < 0).length, [items])
    const matchCount = useMemo(() => items.filter(i => i.difference === 0).length, [items])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sessionName}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        <Badge className={cn("border-0 font-semibold",
                            status === "OPEN" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                                status === "APPROVED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" :
                                    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                        )}>
                            {status === "OPEN" ? "En cours" : status === "APPROVED" ? "Approuvé" : "Annulé"}
                        </Badge>
                        <span className="text-sm text-slate-500 font-medium">
                            {items.length} produits au total · <strong className="text-rose-600 dark:text-rose-400">{discrepancies.length} écart(s)</strong>
                        </span>
                    </div>
                </div>
                {isOpen && (
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleCancel} disabled={isPending} className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl">
                            <XCircle className="w-4 h-4" /> Annuler
                        </Button>
                        <Button onClick={handleApprove} disabled={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                            <CheckCircle className="w-4 h-4" /> Approuver & Ajuster Stock
                        </Button>
                    </div>
                )}
            </div>

            {/* Top Quick Status Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setFilterType("ALL")}
                    className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        filterType === "ALL" 
                            ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 ring-2 ring-indigo-500/20" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    )}
                >
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Produits</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{items.length}</p>
                </button>
                <button
                    onClick={() => setFilterType("DISCREPANCY")}
                    className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        filterType === "DISCREPANCY" 
                            ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 ring-2 ring-amber-500/20" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    )}
                >
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Tous les écarts</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{discrepancies.length}</p>
                </button>
                <button
                    onClick={() => setFilterType("SURPLUS")}
                    className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        filterType === "SURPLUS" 
                            ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 ring-2 ring-emerald-500/20" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    )}
                >
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Surplus (+)</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{surplusCount}</p>
                </button>
                <button
                    onClick={() => setFilterType("MISSING")}
                    className={cn(
                        "p-3 rounded-2xl border text-left transition-all",
                        filterType === "MISSING" 
                            ? "bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 ring-2 ring-rose-500/20" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    )}
                >
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Manquants (-)</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">{missingCount}</p>
                </button>
            </div>

            {/* Filters Bar: Search + Category + Brand */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Search */}
                    <div className="sm:col-span-6 relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Rechercher par produit ou code-barres..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 rounded-xl"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="sm:col-span-3">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="rounded-xl">
                                <div className="flex items-center gap-2 truncate">
                                    <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <SelectValue placeholder="Catégorie" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes les catégories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Brand Filter */}
                    <div className="sm:col-span-3">
                        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger className="rounded-xl">
                                <div className="flex items-center gap-2 truncate">
                                    <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <SelectValue placeholder="Marque" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes les marques</SelectItem>
                                {brands.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Filter Active Pills */}
                {(selectedCategory !== "ALL" || selectedBrand !== "ALL" || search || filterType !== "ALL") && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-slate-500 font-semibold">Filtres actifs:</span>
                        {selectedCategory !== "ALL" && (
                            <Badge variant="secondary" className="gap-1 rounded-lg">
                                Catégorie: {categories.find(c => c.id === selectedCategory)?.name}
                                <button onClick={() => setSelectedCategory("ALL")} className="ml-1 hover:text-rose-500">×</button>
                            </Badge>
                        )}
                        {selectedBrand !== "ALL" && (
                            <Badge variant="secondary" className="gap-1 rounded-lg">
                                Marque: {brands.find(b => b.id === selectedBrand)?.name}
                                <button onClick={() => setSelectedBrand("ALL")} className="ml-1 hover:text-rose-500">×</button>
                            </Badge>
                        )}
                        {filterType !== "ALL" && (
                            <Badge variant="secondary" className="gap-1 rounded-lg">
                                Écart: {filterType}
                                <button onClick={() => setFilterType("ALL")} className="ml-1 hover:text-rose-500">×</button>
                            </Badge>
                        )}
                        {search && (
                            <Badge variant="secondary" className="gap-1 rounded-lg">
                                Recherche: &quot;{search}&quot;
                                <button onClick={() => setSearch("")} className="ml-1 hover:text-rose-500">×</button>
                            </Badge>
                        )}
                        <button
                            onClick={() => { setSelectedCategory("ALL"); setSelectedBrand("ALL"); setSearch(""); setFilterType("ALL") }}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-auto"
                        >
                            Réinitialiser tout
                        </button>
                    </div>
                )}
            </div>

            {/* Results count banner */}
            <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                <span>Affichage de <strong className="text-slate-900 dark:text-slate-100">{filteredItems.length}</strong> sur {items.length} produits</span>
            </div>

            {/* Items Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="text-left px-4 py-3 font.semibold text-slate-600 dark:text-slate-400">Produit</th>
                            <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Catégorie / Marque</th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Stock Attendu</th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Stock Réel</th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Écart</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                    Aucun produit ne correspond aux filtres.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map(item => {
                                const current = items.find(i => i.id === item.id)!
                                const hasDisc = current.difference !== 0
                                return (
                                    <tr key={item.id} className={cn("transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40", hasDisc && "bg-amber-50/40 dark:bg-amber-900/10")}>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{item.productName}</div>
                                            {item.barcodes && item.barcodes.length > 0 && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-mono">
                                                    <BarcodeIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span>{item.barcodes.join(", ")}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {item.categoryName ? (
                                                    <Badge variant="outline" className="text-[11px] font-medium border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                                        {item.categoryName}
                                                    </Badge>
                                                ) : null}
                                                {item.brandName ? (
                                                    <Badge variant="outline" className="text-[11px] font-medium border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
                                                        {item.brandName}
                                                    </Badge>
                                                ) : null}
                                                {!item.categoryName && !item.brandName && (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center tabular-nums font-medium text-slate-600 dark:text-slate-400">{item.expectedQty}</td>
                                        <td className="px-3 py-3 text-center">
                                            {isOpen ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => { const v = Math.max(0, current.actualQty - 1); handleChange(item.id, v); handleBlur({ ...current, actualQty: v, difference: v - current.expectedQty }) }}
                                                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                                        disabled={isPending}
                                                    >
                                                        <Minus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                                    </button>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={current.actualQty}
                                                        onChange={e => handleChange(item.id, parseInt(e.target.value) || 0)}
                                                        onBlur={() => handleBlur(current)}
                                                        className="w-20 text-center rounded-xl h-8 tabular-nums font-bold text-sm"
                                                        disabled={isPending}
                                                    />
                                                    <button
                                                        onClick={() => { const v = current.actualQty + 1; handleChange(item.id, v); handleBlur({ ...current, actualQty: v, difference: v - current.expectedQty }) }}
                                                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                                        disabled={isPending}
                                                    >
                                                        <Plus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{current.actualQty}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={cn("font-bold tabular-nums text-base",
                                                current.difference > 0 ? "text-emerald-600 dark:text-emerald-400" :
                                                    current.difference < 0 ? "text-rose-600 dark:text-rose-400" :
                                                        "text-slate-400"
                                            )}>
                                                {current.difference > 0 ? "+" : ""}{current.difference}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
