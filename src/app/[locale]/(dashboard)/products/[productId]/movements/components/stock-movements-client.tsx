"use client"

import React, { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
    ArrowLeft, ArrowDown, ArrowUp, Package, RotateCcw, Trash2, 
    ArrowRightLeft, AlertTriangle, ShoppingCart, Download, Search, 
    Calendar, TrendingUp, User, FileSpreadsheet, BarChart3, 
    TrendingDown, Info, DollarSign, HelpCircle
} from "lucide-react"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import {
    AreaChart, Area, BarChart, Bar, CartesianGrid, 
    ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Legend, Cell
} from "recharts"

interface Movement {
    id: string
    type: string
    quantity: number
    stockBefore: number
    stockAfter: number
    reason?: string
    referenceId?: string
    createdAt: string
    user?: { name?: string; email?: string }
}

interface StockMovementsClientProps {
    productName: string
    productId: string
    currentStock: number
    price: number
    cost: number
    movements: Movement[]
}

const typeConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    SALE: { label: "Vente", icon: ShoppingCart, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
    PURCHASE: { label: "Achat", icon: ArrowDown, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
    ADJUSTMENT: { label: "Ajustement", icon: RotateCcw, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
    SPOILAGE: { label: "Avarie", icon: Trash2, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
    TRANSFER_IN: { label: "Transfert Entrant", icon: ArrowDown, color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
    TRANSFER_OUT: { label: "Transfert Sortant", icon: ArrowUp, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
    RETURN: { label: "Retour Client", icon: ArrowRightLeft, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
    SUPPLIER_RETURN: { label: "Retour Fournisseur", icon: ArrowRightLeft, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" },
    INITIAL: { label: "Stock Initial", icon: Package, color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
    MANUAL: { label: "Manuel", icon: Package, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-950/30" },
    MANUAL_ADJUSTMENT: { label: "Ajustement Manuel", icon: RotateCcw, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
}

export const StockMovementsClient: React.FC<StockMovementsClientProps> = ({
    productName, productId, currentStock, price, cost, movements
}) => {
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState("global")
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Categorization logic
    const categorizedMovements = useMemo(() => {
        const entries: Movement[] = []
        const exits: Movement[] = []
        const customerReturns: Movement[] = []
        const supplierReturns: Movement[] = []
        const spoilages: Movement[] = []

        movements.forEach(m => {
            // Check specific types
            if (m.type === "RETURN") {
                customerReturns.push(m)
            } else if (m.type === "SUPPLIER_RETURN") {
                supplierReturns.push(m)
            } else if (m.type === "SPOILAGE") {
                spoilages.push(m)
            } else if (m.type === "PURCHASE" || m.type === "TRANSFER_IN" || m.type === "INITIAL") {
                entries.push(m)
            } else if (m.type === "SALE" || m.type === "TRANSFER_OUT") {
                exits.push(m)
            } else if (m.type === "ADJUSTMENT" || m.type === "MANUAL_ADJUSTMENT" || m.type === "MANUAL") {
                // If manual adjustments, categorize by sign
                if (m.quantity > 0) {
                    entries.push(m)
                } else {
                    exits.push(m)
                }
            } else {
                // Fallback by quantity sign
                if (m.quantity > 0) {
                    entries.push(m)
                } else {
                    exits.push(m)
                }
            }
        })

        return { entries, exits, customerReturns, supplierReturns, spoilages }
    }, [movements])

    // Filtered lists based on search term (searches in reason or user name/email)
    const filteredMovements = useMemo(() => {
        const search = searchTerm.toLowerCase().trim()
        if (!search) return categorizedMovements

        const filterFn = (m: Movement) => {
            return (m.reason && m.reason.toLowerCase().includes(search)) ||
                   (m.referenceId && m.referenceId.toLowerCase().includes(search)) ||
                   (m.user?.name && m.user.name.toLowerCase().includes(search)) ||
                   (m.user?.email && m.user.email.toLowerCase().includes(search)) ||
                   m.type.toLowerCase().includes(search)
        }

        return {
            entries: categorizedMovements.entries.filter(filterFn),
            exits: categorizedMovements.exits.filter(filterFn),
            customerReturns: categorizedMovements.customerReturns.filter(filterFn),
            supplierReturns: categorizedMovements.supplierReturns.filter(filterFn),
            spoilages: categorizedMovements.spoilages.filter(filterFn)
        }
    }, [categorizedMovements, searchTerm])

    // Calculations for totals
    const stats = useMemo(() => {
        const totalEntriesQty = categorizedMovements.entries.reduce((sum, m) => sum + m.quantity, 0)
        const totalExitsQty = Math.abs(categorizedMovements.exits.reduce((sum, m) => sum + m.quantity, 0))
        const totalCustRetQty = categorizedMovements.customerReturns.reduce((sum, m) => sum + m.quantity, 0)
        const totalSuppRetQty = Math.abs(categorizedMovements.supplierReturns.reduce((sum, m) => sum + m.quantity, 0))
        const totalSpoilQty = Math.abs(categorizedMovements.spoilages.reduce((sum, m) => sum + m.quantity, 0))

        return {
            entries: { qty: totalEntriesQty, valCost: totalEntriesQty * cost, valPrice: totalEntriesQty * price, count: categorizedMovements.entries.length },
            exits: { qty: totalExitsQty, valCost: totalExitsQty * cost, valPrice: totalExitsQty * price, count: categorizedMovements.exits.length },
            customerReturns: { qty: totalCustRetQty, valCost: totalCustRetQty * cost, valPrice: totalCustRetQty * price, count: categorizedMovements.customerReturns.length },
            supplierReturns: { qty: totalSuppRetQty, valCost: totalSuppRetQty * cost, valPrice: totalSuppRetQty * price, count: categorizedMovements.supplierReturns.length },
            spoilages: { qty: totalSpoilQty, valCost: totalSpoilQty * cost, valPrice: totalSpoilQty * price, count: categorizedMovements.spoilages.length }
        }
    }, [categorizedMovements, cost, price])

    // Format currency (DA)
    const formatDA = (val: number) => {
        return new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" })
            .format(val)
            .replace("DZD", "DA")
    }

    // Chart Data: running stock level over time (chronological)
    const runningStockChartData = useMemo(() => {
        if (movements.length === 0) return []
        
        // Sort chronologically (oldest first) to display the timeline correctly
        const sortedMovements = [...movements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        
        return sortedMovements.map(m => ({
            date: format(new Date(m.createdAt), "dd/MM HH:mm", { locale: fr }),
            stock: m.stockAfter,
            quantite: m.quantity,
            type: typeConfig[m.type]?.label || m.type
        }))
    }, [movements])

    // Category distribution for bar chart
    const distributionChartData = useMemo(() => {
        return [
            { name: "Entrées", quantite: stats.entries.qty, color: "#10b981" },
            { name: "Sorties", quantite: stats.exits.qty, color: "#3b82f6" },
            { name: "Retours Clt", quantite: stats.customerReturns.qty, color: "#8b5cf6" },
            { name: "Retours Fnr", quantite: stats.supplierReturns.qty, color: "#ef4444" },
            { name: "Avaries", quantite: stats.spoilages.qty, color: "#f43f5e" }
        ]
    }, [stats])

    const getMovementTypeDetails = (m: Movement) => {
        // Handle initial stock display explicitly
        if (m.type === "MANUAL_ADJUSTMENT" && m.reason && m.reason.toLowerCase().includes("initial")) {
            return typeConfig.INITIAL
        }
        return typeConfig[m.type] || typeConfig.MANUAL
    }

    // Export to Excel (CSV using semi-colon)
    const handleExport = (tabName: string) => {
        let listToExport: Movement[] = []
        let name = "historique_global"

        if (tabName === "entries") {
            listToExport = filteredMovements.entries
            name = "entrees_stock"
        } else if (tabName === "exits") {
            listToExport = filteredMovements.exits
            name = "sorties_stock"
        } else if (tabName === "customerReturns") {
            listToExport = filteredMovements.customerReturns
            name = "retours_clients"
        } else if (tabName === "supplierReturns") {
            listToExport = filteredMovements.supplierReturns
            name = "retours_fournisseurs"
        } else if (tabName === "spoilages") {
            listToExport = filteredMovements.spoilages
            name = "avaries_stock"
        } else {
            listToExport = movements
            name = "historique_stock_complet"
        }

        const headers = ["Date", "Type Opération", "Quantité", "Stock Avant", "Stock Après", "Motif / Raison", "Référence", "Opérateur"]
        const rows = listToExport.map(m => {
            const config = getMovementTypeDetails(m)
            return [
                format(new Date(m.createdAt), "yyyy-MM-dd HH:mm:ss"),
                config.label,
                m.quantity > 0 ? `+${m.quantity}` : m.quantity,
                m.stockBefore,
                m.stockAfter,
                m.reason || "",
                m.referenceId || "",
                m.user?.name || m.user?.email || "Système"
            ]
        })

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + [headers.join(";"), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))].join("\n");
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `${name}_${productId}_${format(new Date(), "yyyy-MM-dd")}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (!isMounted) return null

    return (
        <div className="space-y-6 pb-10">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/products")} className="rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Package className="h-6 w-6 text-indigo-500" />
                            Historique Produit
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Flux de stock de : <span className="text-indigo-600 dark:text-indigo-400 font-bold">{productName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => handleExport(activeTab)} 
                        className="rounded-xl border-indigo-200/80 hover:bg-indigo-50 dark:border-indigo-950 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2"
                        disabled={movements.length === 0}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Exporter (.csv)
                    </Button>
                </div>
            </div>

            <Separator className="bg-slate-200/80 dark:bg-slate-800/80" />

            {/* General Stock Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Actuel</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{currentStock}</p>
                        <div className="text-[10px] text-muted-foreground font-semibold mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3 text-indigo-500" />
                            Valeur Vente : {formatDA(currentStock * price)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Entrées</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">+{stats.entries.qty}</p>
                        <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold mt-1">
                            {stats.entries.count} opérations
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-blue-100 dark:border-blue-950 bg-blue-50/20 dark:bg-blue-950/10">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Sorties</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">-{stats.exits.qty}</p>
                        <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-semibold mt-1">
                            {stats.exits.count} opérations
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Pertes Avaries</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">-{stats.spoilages.qty}</p>
                        <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-semibold mt-1 flex items-center gap-1">
                            Coût Perdu : {formatDA(stats.spoilages.qty * cost)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search/Filter Bar */}
            <div className="flex items-center gap-2 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 shadow-sm">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <Input 
                    type="text" 
                    placeholder="Rechercher par motif, référence, opérateur..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 h-8 text-sm"
                />
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="global" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100/80 dark:bg-slate-950 border p-1 rounded-xl flex flex-wrap gap-1 w-fit mb-4">
                    <TabsTrigger value="global" className="rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                        <BarChart3 className="h-4 w-4" />
                        Global
                    </TabsTrigger>
                    <TabsTrigger value="entries" className="rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                        <ArrowDown className="h-4 w-4" />
                        Entrées Stock
                    </TabsTrigger>
                    <TabsTrigger value="exits" className="rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        <ArrowUp className="h-4 w-4" />
                        Sorties Stock
                    </TabsTrigger>
                    <TabsTrigger value="customerReturns" className="rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                        <ArrowRightLeft className="h-4 w-4" />
                        Retours Clients
                    </TabsTrigger>
                    <TabsTrigger value="supplierReturns" className="rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-red-500 data-[state=active]:text-white">
                        <ArrowRightLeft className="h-4 w-4" />
                        Retours Fournisseurs
                    </TabsTrigger>
                    <TabsTrigger value="spoilages" className="rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        <Trash2 className="h-4 w-4" />
                        Avaries
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB: GLOBAL OVERVIEW & CHARTS ── */}
                <TabsContent value="global" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Running Stock Area Chart */}
                        <Card className="lg:col-span-2 shadow-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                                    Évolution du Niveau de Stock
                                </CardTitle>
                                <CardDescription>Tracé chronologique du stock après chaque opération</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {runningStockChartData.length === 0 ? (
                                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                                        Pas assez de mouvements pour afficher le graphique.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={runningStockChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" dy={5} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" dx={-5} />
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: "12px" }}
                                                labelClassName="font-bold text-slate-800"
                                            />
                                            <Area type="monotone" dataKey="stock" name="Stock" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStock)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Totals Summary & Financial Estimation */}
                        <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex flex-col justify-between">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-indigo-500" />
                                    Estimation Financière
                                </CardTitle>
                                <CardDescription>Estimation basée sur le coût d'achat et le prix de vente</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-slate-500">Coût d'achat U. :</span>
                                        <span className="text-slate-950 dark:text-slate-50">{formatDA(cost)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-slate-500">Prix de vente U. :</span>
                                        <span className="text-slate-950 dark:text-slate-50">{formatDA(price)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/40">
                                        <span>Marge Unitaire :</span>
                                        <span>{formatDA(price - cost)} ({price > 0 ? (( (price - cost) / price ) * 100).toFixed(1) : 0}%)</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
                                            Valeur Entrées (Coût) :
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDA(stats.entries.valCost)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" />
                                            Valeur Sorties (Vente) :
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDA(stats.exits.valPrice)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full inline-block" />
                                            Valeur Retours Clt (Vente) :
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDA(stats.customerReturns.valPrice)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" />
                                            Valeur Retours Fnr (Coût) :
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDA(stats.supplierReturns.valCost)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800/40">
                                        <span className="text-rose-600 font-bold flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" />
                                            Pertes Avaries (Coût) :
                                        </span>
                                        <span className="font-black text-rose-600">{formatDA(stats.spoilages.valCost)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quantity Distribution Bar Chart */}
                    <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-indigo-500" />
                                Distribution des Volumes par Catégorie (Quantité)
                            </CardTitle>
                            <CardDescription>Comparaison du volume total de stock manipulé</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={distributionChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" dy={5} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" dx={-5} />
                                    <RechartsTooltip 
                                        cursor={{ fill: "rgba(100, 116, 139, 0.05)" }}
                                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: "12px" }}
                                    />
                                    <Bar dataKey="quantite" name="Quantité cumulée" radius={[6, 6, 0, 0]}>
                                        {distributionChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Timeline of last 5 operations */}
                    <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-800 dark:text-slate-200 font-bold">Dernières opérations de stock</CardTitle>
                            <CardDescription>Les 5 plus récents flux enregistrés pour ce produit</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {movements.length === 0 ? (
                                <div className="p-6 text-center text-sm text-slate-500">Aucune opération enregistrée.</div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {movements.slice(0, 5).map((m) => {
                                        const config = getMovementTypeDetails(m)
                                        const Icon = config.icon
                                        const isPositive = m.quantity > 0

                                        return (
                                            <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl shrink-0 ${config.bgColor}`}>
                                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{config.label}</span>
                                                            {m.reason && (
                                                                <span className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-md">({m.reason})</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-semibold">{format(new Date(m.createdAt), "dd/MM/yyyy à HH:mm", { locale: fr })}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-sm font-black ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                        {isPositive ? "+" : ""}{m.quantity}
                                                    </span>
                                                    <p className="text-[9px] text-slate-400 font-bold">{m.stockBefore} → {m.stockAfter}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── TAB: STOCK ENTRIES (ENTREESTOCK) ── */}
                <TabsContent value="entries">
                    {renderTable(filteredMovements.entries, "Aucune entrée de stock enregistrée")}
                </TabsContent>

                {/* ── TAB: STOCK EXITS (SORTIES) ── */}
                <TabsContent value="exits">
                    {renderTable(filteredMovements.exits, "Aucune sortie de stock enregistrée")}
                </TabsContent>

                {/* ── TAB: CLIENT RETURNS (RETOURS CLIENTS) ── */}
                <TabsContent value="customerReturns">
                    {renderTable(filteredMovements.customerReturns, "Aucun retour client enregistré")}
                </TabsContent>

                {/* ── TAB: SUPPLIER RETURNS (RETOURS FOURNISSEURS) ── */}
                <TabsContent value="supplierReturns">
                    {renderTable(filteredMovements.supplierReturns, "Aucun retour fournisseur enregistré")}
                </TabsContent>

                {/* ── TAB: SPOILAGES (AVARIES) ── */}
                <TabsContent value="spoilages">
                    {renderTable(filteredMovements.spoilages, "Aucune avarie enregistrée")}
                </TabsContent>
            </Tabs>

            {/* Movement Details Dialog */}
            <Dialog open={!!selectedMovement} onOpenChange={(open) => !open && setSelectedMovement(null)}>
                <DialogContent className="max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Info className="h-5 w-5 text-indigo-500" />
                            Détails du Mouvement de Stock
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium">
                            Fiche d'information complète de l'opération
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMovement && (() => {
                        const config = getMovementTypeDetails(selectedMovement)
                        const Icon = config.icon
                        const isPositive = selectedMovement.quantity > 0
                        
                        return (
                            <div className="space-y-4 mt-2">
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-2 rounded-xl ${config.bgColor}`}>
                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{config.label}</span>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                {format(new Date(selectedMovement.createdAt), "dd MMMM yyyy 'à' HH:mm:ss", { locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-base font-black ${isPositive ? "text-emerald-600 dark:text-emerald-455" : "text-rose-600 dark:text-rose-455"}`}>
                                            {isPositive ? `+${selectedMovement.quantity}` : selectedMovement.quantity}
                                        </span>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                            {selectedMovement.stockBefore} → {selectedMovement.stockAfter}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Reason */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">Motif / Raison</span>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                                            {selectedMovement.reason || "Opération de stock"}
                                        </div>
                                    </div>

                                    {/* Reference */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">ID Référence</span>
                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                                {selectedMovement.referenceId || "—"}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">Identifiant</span>
                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 truncate">
                                                {selectedMovement.id}
                                            </div>
                                        </div>
                                    </div>

                                    {/* User / Operator */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">Opérateur</span>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm uppercase">
                                                {(selectedMovement.user?.name || "S")[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {selectedMovement.user?.name || "Système"}
                                                </div>
                                                {selectedMovement.user?.email && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        {selectedMovement.user.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    )

    function renderTable(movementsList: Movement[], emptyMessage: string) {
        if (movementsList.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 border rounded-2xl bg-white dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800">
                    <AlertTriangle className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm text-slate-500 font-bold">{emptyMessage}</p>
                    <p className="text-xs text-slate-400 mt-1">Les mouvements correspondants s'afficheront dans ce tableau.</p>
                </div>
            )
        }

        return (
            <TooltipProvider delayDuration={150}>
                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800/80">
                                <th className="p-4 py-3 text-xs uppercase tracking-wider font-extrabold">Date & Heure</th>
                                <th className="p-4 py-3 text-xs uppercase tracking-wider font-extrabold">Opération</th>
                                <th className="p-4 py-3 text-xs uppercase tracking-wider font-extrabold text-right">Quantité</th>
                                <th className="p-4 py-3 text-xs uppercase tracking-wider font-extrabold text-center">Variation</th>
                                <th className="p-4 py-3 text-xs uppercase tracking-wider font-extrabold">Motif / Raison</th>
                                <th className="p-4 py-3 text-xs uppercase tracking-wider font-extrabold">Opérateur</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {movementsList.map((m) => {
                                const config = getMovementTypeDetails(m)
                                const Icon = config.icon
                                const isPositive = m.quantity > 0

                                return (
                                    <tr 
                                        key={m.id} 
                                        className="hover:bg-slate-100/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedMovement(m)}
                                    >
                                        {/* Date */}
                                        <td className="p-4 py-3.5 font-medium whitespace-nowrap text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{format(new Date(m.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                                            </div>
                                        </td>
                                        
                                        {/* Opération badge */}
                                        <td className="p-4 py-3.5 whitespace-nowrap">
                                            <Badge variant="outline" className={`${config.color} border-current/25 bg-current/5 font-semibold text-xs py-0.5 rounded-lg inline-flex items-center gap-1`}>
                                                <Icon className="h-3 w-3" />
                                                {config.label}
                                            </Badge>
                                        </td>

                                        {/* Quantité */}
                                        <td className="p-4 py-3.5 text-right whitespace-nowrap">
                                            <span className={`text-sm font-black ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                {isPositive ? `+${m.quantity}` : m.quantity}
                                            </span>
                                        </td>

                                        {/* Variation */}
                                        <td className="p-4 py-3.5 text-center whitespace-nowrap">
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                {m.stockBefore} → {m.stockAfter}
                                            </span>
                                        </td>

                                        {/* Motif / Raison */}
                                        <td className="p-4 py-3.5 max-w-xs sm:max-w-md">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex flex-col cursor-help">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{m.reason || "Opération de stock"}</span>
                                                        {m.referenceId && (
                                                            <span className="text-[10px] text-indigo-500 font-bold tracking-tight mt-0.5 truncate">Réf: {m.referenceId}</span>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="p-3 bg-zinc-950 text-zinc-100 border-zinc-800 rounded-lg shadow-xl max-w-xs sm:max-w-sm">
                                                    <div className="space-y-1 text-xs">
                                                        <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Description complète</p>
                                                        <p className="font-medium text-zinc-200 whitespace-pre-wrap break-words">{m.reason || "Opération de stock"}</p>
                                                        {m.referenceId && (
                                                            <p className="text-[10px] text-indigo-400 font-mono mt-1 border-t border-zinc-800 pt-1">Référence: {m.referenceId}</p>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </td>

                                        {/* Opérateur */}
                                        <td className="p-4 py-3.5 whitespace-nowrap">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-help">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        <span>{m.user?.name || "Système"}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="p-3 bg-zinc-950 text-zinc-100 border-zinc-800 rounded-lg shadow-xl">
                                                    <div className="space-y-1 text-xs">
                                                        <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Opérateur</p>
                                                        <p className="font-medium text-zinc-200">{m.user?.name || "Système"}</p>
                                                        {m.user?.email && (
                                                            <p className="text-[10px] text-zinc-400 font-mono">{m.user.email}</p>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </TooltipProvider>
        )
    }
}
