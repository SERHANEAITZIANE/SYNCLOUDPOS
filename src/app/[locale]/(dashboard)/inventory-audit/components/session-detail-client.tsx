"use client"

import { useState, useTransition } from "react"
import toast from "react-hot-toast"
import { updateStockCountItem, approveStockCountSession, cancelStockCountSession } from "@/actions/inventory-audit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, AlertTriangle, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface Item {
    id: string
    productName: string
    expectedQty: number
    actualQty: number
    difference: number
}

interface SessionDetailClientProps {
    sessionId: string
    sessionName: string
    status: string
    items: Item[]
}

export function SessionDetailClient({ sessionId, sessionName, status, items: initialItems }: SessionDetailClientProps) {
    const [items, setItems] = useState<Item[]>(initialItems)
    const [isPending, startTransition] = useTransition()
    const [search, setSearch] = useState("")

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

    const discrepancies = items.filter(i => i.difference !== 0)
    const filtered = items.filter(i => i.productName.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sessionName}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <Badge className={cn("border-0 font-semibold",
                            status === "OPEN" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                                status === "APPROVED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" :
                                    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                        )}>
                            {status === "OPEN" ? "En cours" : status === "APPROVED" ? "Approuvé" : "Annulé"}
                        </Badge>
                        <span className="text-sm text-slate-500">{discrepancies.length} écart(s) détecté(s)</span>
                    </div>
                </div>
                {isOpen && (
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleCancel} disabled={isPending} className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50">
                            <XCircle className="w-4 h-4" /> Annuler
                        </Button>
                        <Button onClick={handleApprove} disabled={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle className="w-4 h-4" /> Approuver & Ajuster Stock
                        </Button>
                    </div>
                )}
            </div>

            {/* Discrepancy Summary */}
            {discrepancies.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-amber-900 dark:text-amber-200 text-sm">{discrepancies.length} produit(s) avec écart</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {discrepancies.map(i => (
                            <div key={i.id} className="flex items-center justify-between text-sm px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-amber-900/40">
                                <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]">{i.productName}</span>
                                <span className={cn("font-bold tabular-nums ml-2", i.difference > 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {i.difference > 0 ? "+" : ""}{i.difference}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <Input
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm rounded-xl"
            />

            {/* Items Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Produit</th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Stock Attendu</th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Stock Réel</th>
                            <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">Écart</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map(item => {
                            const current = items.find(i => i.id === item.id)!
                            const hasDisc = current.difference !== 0
                            return (
                                <tr key={item.id} className={cn("transition-colors", hasDisc && "bg-amber-50/50 dark:bg-amber-900/5")}>
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.productName}</td>
                                    <td className="px-3 py-3 text-center tabular-nums text-slate-600 dark:text-slate-400">{item.expectedQty}</td>
                                    <td className="px-3 py-3 text-center">
                                        {isOpen ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { const v = Math.max(0, current.actualQty - 1); handleChange(item.id, v); handleBlur({ ...current, actualQty: v, difference: v - current.expectedQty }) }}
                                                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    disabled={isPending}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={current.actualQty}
                                                    onChange={e => handleChange(item.id, parseInt(e.target.value) || 0)}
                                                    onBlur={() => handleBlur(current)}
                                                    className="w-20 text-center rounded-xl h-8 tabular-nums font-bold"
                                                    disabled={isPending}
                                                />
                                                <button
                                                    onClick={() => { const v = current.actualQty + 1; handleChange(item.id, v); handleBlur({ ...current, actualQty: v, difference: v - current.expectedQty }) }}
                                                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    disabled={isPending}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="font-bold tabular-nums">{current.actualQty}</span>
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
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
