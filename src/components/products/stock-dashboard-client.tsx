"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
    Search, 
    Filter, 
    TrendingUp, 
    TrendingDown, 
    ArrowUpRight, 
    ArrowDownRight, 
    History, 
    AlertTriangle, 
    Layers, 
    Bookmark, 
    Percent,
    Eye,
    Calculator,
    Package,
    RefreshCw,
    SlidersHorizontal,
    FileSpreadsheet,
    Calendar,
    User,
    CheckCircle2,
    DollarSign
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from "@/components/ui/tabs"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getStockMovements } from "@/actions/stock-movements"

interface StockItem {
    id: string
    name: string
    barcodes: string[]
    categoryName: string
    brandName: string
    stock: number
    minStock: number
    entries: number
    exits: number
    returns: number
    supplierReturns: number
    reservations: number
    avaries: number
    cost: number
    price: number
    montantAchat: number
    montantVente: number
}

interface KPI {
    totalStockCount: number
    totalCostValuation: number
    totalSalesValuation: number
    totalReservations: number
    totalAvaries: number
}

interface MovementLog {
    id: string
    productId: string
    productName: string
    type: string
    quantity: number
    stockBefore: number
    stockAfter: number
    reason: string
    userName: string
    createdAt: string
}

interface StockDashboardClientProps {
    initialItems: StockItem[]
    initialKpi: KPI
    initialEntries: MovementLog[]
    initialExits: MovementLog[]
    categories: { id: string; name: string }[]
    brands: { id: string; name: string }[]
}

export const StockDashboardClient: React.FC<StockDashboardClientProps> = ({
    initialItems,
    initialKpi,
    initialEntries,
    initialExits,
    categories,
    brands
}) => {
    // Tab states
    const [activeTab, setActiveTab] = useState("stock_actuel")

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [brandFilter, setBrandFilter] = useState("all")
    const [alertFilter, setAlertFilter] = useState("all")

    // Detailed Drawer states
    const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [drawerMovements, setDrawerMovements] = useState<any[]>([])
    const [drawerLoading, setDrawerLoading] = useState(false)

    // Client-side pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    const [entriesPage, setEntriesPage] = useState(1)
    const [exitsPage, setExitsPage] = useState(1)

    // Synchronize selected product stock movements when open
    useEffect(() => {
        if (selectedProduct && isDrawerOpen) {
            fetchProductMovements(selectedProduct.id)
        }
    }, [selectedProduct, isDrawerOpen])

    const fetchProductMovements = async (productId: string) => {
        setDrawerLoading(true)
        try {
            const res = await getStockMovements(productId)
            if (res?.movements) {
                setDrawerMovements(res.movements)
            } else {
                setDrawerMovements([])
            }
        } catch (err) {
            console.error("Failed to load product movements:", err)
        } finally {
            setDrawerLoading(false)
        }
    }

    // Helper for formatting currency (Dinar Algérien)
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-DZ", {
            style: "currency",
            currency: "DZD",
            minimumFractionDigits: 2
        }).format(amount).replace("DZD", "DA")
    }

    // --- Tab 1: Filter Logic ---
    const filteredStockItems = initialItems.filter(item => {
        const matchesSearch = 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.barcodes.some(b => b.toLowerCase().includes(searchQuery.toLowerCase())) ||
            item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.brandName.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCategory = categoryFilter === "all" || item.categoryName === categoryFilter
        const matchesBrand = brandFilter === "all" || item.brandName === brandFilter

        let matchesAlert = true
        if (alertFilter === "out_of_stock") {
            matchesAlert = item.stock <= 0
        } else if (alertFilter === "low_stock") {
            matchesAlert = item.stock > 0 && item.stock <= item.minStock
        } else if (alertFilter === "in_stock") {
            matchesAlert = item.stock > item.minStock
        }

        return matchesSearch && matchesCategory && matchesBrand && matchesAlert
    })

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, categoryFilter, brandFilter, alertFilter])

    // --- Tab 2: Entries Filter Logic ---
    const filteredEntries = initialEntries.filter(entry => 
        entry.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.reason.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // --- Tab 3: Exits Filter Logic ---
    const filteredExits = initialExits.filter(exit => 
        exit.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exit.reason.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Paginated Slices
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentStockItems = filteredStockItems.slice(indexOfFirstItem, indexOfLastItem)
    const totalStockPages = Math.ceil(filteredStockItems.length / itemsPerPage)

    const currentEntries = filteredEntries.slice((entriesPage - 1) * itemsPerPage, entriesPage * itemsPerPage)
    const totalEntriesPages = Math.ceil(filteredEntries.length / itemsPerPage)

    const currentExits = filteredExits.slice((exitsPage - 1) * itemsPerPage, exitsPage * itemsPerPage)
    const totalExitsPages = Math.ceil(filteredExits.length / itemsPerPage)

    // Dynamic stock status badges
    const getStockStatusBadge = (stock: number, minStock: number) => {
        if (stock <= 0) {
            return (
                <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-500/20 font-semibold px-2 py-0.5 animate-pulse">
                    Rupture ({stock})
                </Badge>
            )
        } else if (stock <= minStock) {
            return (
                <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-500/20 font-semibold px-2 py-0.5">
                    Alerte ({stock})
                </Badge>
            )
        } else {
            return (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/20 font-semibold px-2 py-0.5">
                    Correct ({stock})
                </Badge>
            )
        }
    }

    // Get movement category tags
    const getMovementTypeBadge = (type: string) => {
        switch (type) {
            case "PURCHASE":
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Achat</Badge>
            case "INITIAL":
                return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20">Init</Badge>
            case "CUSTOMER_RETURN":
                return <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20">Retour Clt</Badge>
            case "SALE":
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Vente</Badge>
            case "SPOILAGE":
                return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Avarie</Badge>
            case "SUPPLIER_RETURN":
                return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Retour Frs</Badge>
            case "MANUAL_ADJUSTMENT":
                return <Badge className="bg-zinc-500/10 text-zinc-600 border-zinc-500/20">Ajustement</Badge>
            default:
                return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">{type}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                    <div className="absolute right-3 top-3 opacity-15">
                        <Package className="h-20 w-20 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Quantité en Stock</p>
                        <h3 className="text-3xl font-black mt-2">{initialKpi.totalStockCount}</h3>
                        <p className="text-xs opacity-75 mt-2 flex items-center gap-1">
                            <Layers className="h-3 w-3" /> Unités globales actives
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                    <div className="absolute right-3 top-3 opacity-15">
                        <Calculator className="h-20 w-20 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Valeur d'Achat globale</p>
                        <h3 className="text-3xl font-black mt-2">{formatCurrency(initialKpi.totalCostValuation)}</h3>
                        <p className="text-xs opacity-75 mt-2 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Investissement total
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                    <div className="absolute right-3 top-3 opacity-15">
                        <DollarSign className="h-20 w-20 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Valeur Vente Approximative</p>
                        <h3 className="text-3xl font-black mt-2">{formatCurrency(initialKpi.totalSalesValuation)}</h3>
                        <p className="text-xs opacity-75 mt-2 flex items-center gap-1">
                            <Percent className="h-3 w-3" /> Marge potentielle : {initialKpi.totalCostValuation > 0 ? ((initialKpi.totalSalesValuation - initialKpi.totalCostValuation) / initialKpi.totalCostValuation * 100).toFixed(1) : 0}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg border-0 transition-transform duration-300 hover:scale-[1.02]">
                    <div className="absolute right-3 top-3 opacity-15">
                        <AlertTriangle className="h-20 w-20 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Réservations & Avaries</p>
                        <h3 className="text-3xl font-black mt-2">{initialKpi.totalReservations} / {initialKpi.totalAvaries}</h3>
                        <p className="text-xs opacity-75 mt-2 flex items-center gap-1">
                            <Bookmark className="h-3 w-3" /> {initialKpi.totalReservations} Réservés | {initialKpi.totalAvaries} Avariés
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Section */}
            <Card className="shadow-md border border-border/60 bg-white/80 dark:bg-zinc-950/40 backdrop-blur-md rounded-2xl">
                <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom de produit, barcode, catégorie, marque..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-border/80 focus:ring-emerald-500/20"
                            />
                        </div>

                        {activeTab === "stock_actuel" && (
                            <div className="flex flex-wrap gap-3 items-center">
                                {/* Category select */}
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[160px] bg-zinc-50 dark:bg-zinc-900">
                                        <Layers className="h-4 w-4 mr-2 opacity-60 text-emerald-600" />
                                        <SelectValue placeholder="Catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes Catégories</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Brand select */}
                                <Select value={brandFilter} onValueChange={setBrandFilter}>
                                    <SelectTrigger className="w-[150px] bg-zinc-50 dark:bg-zinc-900">
                                        <SlidersHorizontal className="h-4 w-4 mr-2 opacity-60 text-indigo-600" />
                                        <SelectValue placeholder="Marque" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes Marques</SelectItem>
                                        {brands.map(b => (
                                            <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Alert status select */}
                                <Select value={alertFilter} onValueChange={setAlertFilter}>
                                    <SelectTrigger className="w-[160px] bg-zinc-50 dark:bg-zinc-900">
                                        <AlertTriangle className="h-4 w-4 mr-2 opacity-60 text-amber-500" />
                                        <SelectValue placeholder="Alerte" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous Niveaux Stock</SelectItem>
                                        <SelectItem value="out_of_stock">Rupture de Stock</SelectItem>
                                        <SelectItem value="low_stock">Stock Critique (Alerte)</SelectItem>
                                        <SelectItem value="in_stock">Stock Correct</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Dashboard Tabs & Tables */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 border rounded-xl gap-2 w-full sm:w-auto">
                    <TabsTrigger value="stock_actuel" className="px-5 py-2 font-semibold">
                        <Package className="h-4 w-4 mr-1 text-emerald-500" />
                        Stock Actuel ({filteredStockItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="entries" className="px-5 py-2 font-semibold">
                        <TrendingUp className="h-4 w-4 mr-1 text-teal-500" />
                        Entrées de Stock ({filteredEntries.length})
                    </TabsTrigger>
                    <TabsTrigger value="exits" className="px-5 py-2 font-semibold">
                        <TrendingDown className="h-4 w-4 mr-1 text-rose-500" />
                        Sorties de Stock ({filteredExits.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Current Stock Grid Table */}
                <TabsContent value="stock_actuel" className="space-y-4 outline-none">
                    <div className="overflow-hidden bg-white dark:bg-zinc-950/20 border border-border/70 rounded-2xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-border/80 text-xs font-semibold uppercase text-slate-500">
                                        <th className="p-4 pl-6">Produit / Caractéristiques</th>
                                        <th className="p-4 text-center">Niveau de Stock</th>
                                        <th className="p-4 text-center">Entrées</th>
                                        <th className="p-4 text-center">Sorties</th>
                                        <th className="p-4 text-center">Retour Client</th>
                                        <th className="p-4 text-center">Retour Fournisseur</th>
                                        <th className="p-4 text-center">Réservé</th>
                                        <th className="p-4 text-center">Avarié</th>
                                        <th className="p-4 text-right">Montant Achat</th>
                                        <th className="p-4 text-right">Montant Approx Vente</th>
                                        <th className="p-4 pr-6 text-center">Détail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-sm">
                                    {currentStockItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="p-8 text-center text-muted-foreground font-medium">
                                                Aucun produit ne correspond à ces critères.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentStockItems.map(item => (
                                            <tr 
                                                key={item.id} 
                                                className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/20 transition-colors group cursor-pointer"
                                                onClick={() => {
                                                    setSelectedProduct(item)
                                                    setIsDrawerOpen(true)
                                                }}
                                            >
                                                <td className="p-4 pl-6">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {item.name}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-slate-400">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/80 bg-zinc-50 dark:bg-zinc-900">
                                                            {item.categoryName}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/80 bg-zinc-50 dark:bg-zinc-900">
                                                            {item.brandName}
                                                        </Badge>
                                                        {item.barcodes.slice(0, 1).map(b => (
                                                            <span key={b} className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0 rounded">
                                                                {b}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {getStockStatusBadge(item.stock, item.minStock)}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                                                    {item.entries}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                                                    {item.exits}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-teal-600 dark:text-teal-400">
                                                    {item.returns}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-orange-600 dark:text-orange-400">
                                                    {item.supplierReturns}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-amber-600 dark:text-amber-400">
                                                    {item.reservations > 0 ? (
                                                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200">
                                                            {item.reservations}
                                                        </Badge>
                                                    ) : "0"}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-red-600 dark:text-red-400">
                                                    {item.avaries > 0 ? (
                                                        <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200">
                                                            {item.avaries}
                                                        </Badge>
                                                    ) : "0"}
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(item.montantAchat)}
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(item.montantVente)}
                                                </td>
                                                <td className="p-4 pr-6 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedProduct(item)
                                                            setIsDrawerOpen(true)
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalStockPages > 1 && (
                            <div className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-border/80">
                                <div className="text-xs text-muted-foreground font-medium">
                                    Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredStockItems.length)} sur {filteredStockItems.length} produits
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 font-semibold"
                                    >
                                        Précédent
                                    </Button>
                                    <span className="text-xs font-semibold px-2">Page {currentPage} sur {totalStockPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalStockPages, prev + 1))}
                                        disabled={currentPage === totalStockPages}
                                        className="h-8 font-semibold"
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Tab 2: Stock Entries */}
                <TabsContent value="entries" className="space-y-4 outline-none">
                    <div className="overflow-hidden bg-white dark:bg-zinc-950/20 border border-border/70 rounded-2xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-border/80 text-xs font-semibold uppercase text-slate-500">
                                        <th className="p-4 pl-6">Date</th>
                                        <th className="p-4">Produit</th>
                                        <th className="p-4 text-center">Type d'Entrée</th>
                                        <th className="p-4 text-center">Quantité</th>
                                        <th className="p-4 text-center">Stock Avant</th>
                                        <th className="p-4 text-center">Stock Après</th>
                                        <th className="p-4">Motif / Réf</th>
                                        <th className="p-4 pr-6">Opérateur</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-sm">
                                    {currentEntries.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                                                Aucune entrée enregistrée.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentEntries.map(entry => (
                                            <tr key={entry.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/20 transition-colors">
                                                <td className="p-4 pl-6 font-medium text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {format(new Date(entry.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                                                    {entry.productName}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {getMovementTypeBadge(entry.type)}
                                                </td>
                                                <td className="p-4 text-center font-black text-emerald-600 dark:text-emerald-400 text-base">
                                                    +{entry.quantity}
                                                </td>
                                                <td className="p-4 text-center text-slate-500">
                                                    {entry.stockBefore}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-slate-900 dark:text-slate-100">
                                                    {entry.stockAfter}
                                                </td>
                                                <td className="p-4 text-slate-600 dark:text-slate-400 italic">
                                                    {entry.reason}
                                                </td>
                                                <td className="p-4 pr-6 font-medium text-slate-700 dark:text-slate-300">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        {entry.userName}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalEntriesPages > 1 && (
                            <div className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-border/80">
                                <div className="text-xs text-muted-foreground font-medium">
                                    Affichage de {((entriesPage - 1) * itemsPerPage) + 1} à {Math.min(entriesPage * itemsPerPage, filteredEntries.length)} sur {filteredEntries.length} entrées
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEntriesPage(prev => Math.max(1, prev - 1))}
                                        disabled={entriesPage === 1}
                                        className="h-8 font-semibold"
                                    >
                                        Précédent
                                    </Button>
                                    <span className="text-xs font-semibold px-2">Page {entriesPage} sur {totalEntriesPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEntriesPage(prev => Math.min(totalEntriesPages, prev + 1))}
                                        disabled={entriesPage === totalEntriesPages}
                                        className="h-8 font-semibold"
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Tab 3: Stock Exits */}
                <TabsContent value="exits" className="space-y-4 outline-none">
                    <div className="overflow-hidden bg-white dark:bg-zinc-950/20 border border-border/70 rounded-2xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-border/80 text-xs font-semibold uppercase text-slate-500">
                                        <th className="p-4 pl-6">Date</th>
                                        <th className="p-4">Produit</th>
                                        <th className="p-4 text-center">Type de Sortie</th>
                                        <th className="p-4 text-center">Quantité</th>
                                        <th className="p-4 text-center">Stock Avant</th>
                                        <th className="p-4 text-center">Stock Après</th>
                                        <th className="p-4">Motif / Réf</th>
                                        <th className="p-4 pr-6">Opérateur</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-sm">
                                    {currentExits.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                                                Aucune sortie enregistrée.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentExits.map(exit => (
                                            <tr key={exit.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/20 transition-colors">
                                                <td className="p-4 pl-6 font-medium text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {format(new Date(exit.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                                                    {exit.productName}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {getMovementTypeBadge(exit.type)}
                                                </td>
                                                <td className="p-4 text-center font-black text-rose-600 dark:text-rose-400 text-base">
                                                    -{exit.quantity}
                                                </td>
                                                <td className="p-4 text-center text-slate-500">
                                                    {exit.stockBefore}
                                                </td>
                                                <td className="p-4 text-center font-semibold text-slate-900 dark:text-slate-100">
                                                    {exit.stockAfter}
                                                </td>
                                                <td className="p-4 text-slate-600 dark:text-slate-400 italic">
                                                    {exit.reason}
                                                </td>
                                                <td className="p-4 pr-6 font-medium text-slate-700 dark:text-slate-300">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        {exit.userName}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalExitsPages > 1 && (
                            <div className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-border/80">
                                <div className="text-xs text-muted-foreground font-medium">
                                    Affichage de {((exitsPage - 1) * itemsPerPage) + 1} à {Math.min(exitsPage * itemsPerPage, filteredExits.length)} sur {filteredExits.length} sorties
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setExitsPage(prev => Math.max(1, prev - 1))}
                                        disabled={exitsPage === 1}
                                        className="h-8 font-semibold"
                                    >
                                        Précédent
                                    </Button>
                                    <span className="text-xs font-semibold px-2">Page {exitsPage} sur {totalExitsPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setExitsPage(prev => Math.min(totalExitsPages, prev + 1))}
                                        disabled={exitsPage === totalExitsPages}
                                        className="h-8 font-semibold"
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Premium Sliding Side Drawer for Product Detailed Analytics */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent className="sm:max-w-md w-full md:max-w-lg h-full flex flex-col p-0 bg-white dark:bg-zinc-950 border-l border-border/80">
                    <SheetHeader className="p-6 border-b shrink-0 bg-zinc-50/80 dark:bg-zinc-900/20">
                        <SheetTitle className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Package className="h-5 w-5 text-emerald-500" />
                            Détails Fiche Stock
                        </SheetTitle>
                        <SheetDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                            Analyse complète et historique des mouvements
                        </SheetDescription>
                    </SheetHeader>

                    {selectedProduct && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                    {/* Section 1: Main Title */}
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100">{selectedProduct.name}</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{selectedProduct.categoryName}</Badge>
                                            <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{selectedProduct.brandName}</Badge>
                                            {selectedProduct.barcodes.map(b => (
                                                <Badge key={b} variant="secondary" className="font-mono text-[10px]">{b}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Section 2: Stock Indicators */}
                                    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-border/60 rounded-2xl p-5 space-y-4">
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5" />
                                            Indicateurs de Stock
                                        </h5>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Stock Actuel</p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{selectedProduct.stock}</span>
                                                    {getStockStatusBadge(selectedProduct.stock, selectedProduct.minStock)}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Seuil d'Alerte</p>
                                                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{selectedProduct.minStock} <span className="text-xs font-medium text-slate-400">unités</span></p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Entrées</p>
                                                <p className="text-base font-black text-emerald-600 mt-0.5">{selectedProduct.entries}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Sorties</p>
                                                <p className="text-base font-black text-rose-600 mt-0.5">{selectedProduct.exits}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Retour Clt</p>
                                                <p className="text-base font-black text-teal-600 mt-0.5">{selectedProduct.returns}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Financial Indicators */}
                                    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-border/60 rounded-2xl p-5 space-y-4">
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <Calculator className="h-3.5 w-3.5" />
                                            Valorisation Financière
                                        </h5>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Prix d'Achat (PMP/Cost)</p>
                                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(selectedProduct.cost)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Prix de Vente (Retail)</p>
                                                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(selectedProduct.price)}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Montant d'Achat Stock</p>
                                                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(selectedProduct.montantAchat)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Montant de Vente Stock</p>
                                                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(selectedProduct.montantVente)}</p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                                            <span className="text-slate-500">Marge Brute Estimée</span>
                                            <span className="text-emerald-600 font-bold bg-emerald-100/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                                                {selectedProduct.cost > 0 ? (((selectedProduct.price - selectedProduct.cost) / selectedProduct.cost) * 100).toFixed(1) : "0"} %
                                            </span>
                                        </div>
                                    </div>

                                    {/* Section 4: Movement Timeline */}
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <History className="h-3.5 w-3.5" />
                                            Derniers Mouvements de Stock
                                        </h5>

                                        {drawerLoading ? (
                                            <div className="flex justify-center items-center py-8">
                                                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></span>
                                            </div>
                                        ) : drawerMovements.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-6">Aucun mouvement enregistré pour ce produit.</p>
                                        ) : (
                                            <div className="relative pl-6 border-l-2 border-border/80 space-y-5">
                                                {drawerMovements.slice(0, 10).map((m: any, idx: number) => {
                                                    const isPositive = m.quantity > 0
                                                    return (
                                                        <div key={m.id} className="relative">
                                                            {/* Dot */}
                                                            <div className={`absolute -left-[31px] top-1 p-1 rounded-full ${isPositive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                                                                {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                                                        {m.type === "SALE" ? "Vente" : m.type === "PURCHASE" ? "Achat" : m.type === "RETURN" ? "Retour client" : "Ajustement"}
                                                                    </span>
                                                                    <span className="text-slate-400 font-medium">
                                                                        {format(new Date(m.createdAt), "dd MMM à HH:mm", { locale: fr })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 italic mt-0.5">{m.reason || "Mouvement système"}</p>
                                                                <div className="flex justify-between items-center mt-1.5 text-[11px] font-semibold text-slate-400">
                                                                    <span>Par: {m.user?.name || "Système"}</span>
                                                                    <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                                                                        {isPositive ? "+" : ""}{m.quantity} (Stock: {m.stockBefore} → {m.stockAfter})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
