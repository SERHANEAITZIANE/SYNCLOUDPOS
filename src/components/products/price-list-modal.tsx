"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Download, FileText, Settings2, Image as ImageIcon, Loader2, Copy, Check, Filter, ListChecks, Tag, Search, LayoutGrid, List, Share2, Sparkles } from "lucide-react"
import { toast } from "react-hot-toast"
import { useReactToPrint } from "react-to-print"
import { format } from "date-fns"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { getAllProductsForCatalogue } from "@/actions/products"
import { getCategories } from "@/actions/categories"
import { getBrands } from "@/actions/brands"
import { cn } from "@/lib/utils"

interface PriceListModalProps {
    isOpen: boolean
    onClose: () => void
}

export const PriceListModal: React.FC<PriceListModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [brands, setBrands] = useState<any[]>([])
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
    const [brandFilter, setBrandFilter] = useState<string>("ALL")
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [priceTier, setPriceTier] = useState<"RETAIL" | "WHOLESALE" | "RESELLER">("RETAIL")
    const [includeImages, setIncludeImages] = useState(true)
    const [onlyFeatured, setOnlyFeatured] = useState(false)
    const [onlyInStock, setOnlyInStock] = useState(false)
    const [textPreview, setTextPreview] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [catalogLayout, setCatalogLayout] = useState<"grid" | "table">("grid")

    const componentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoading(true)
                try {
                    const [prodData, catData, brandData] = await Promise.all([
                        getAllProductsForCatalogue(),
                        getCategories(),
                        getBrands()
                    ])
                    setProducts(prodData || [])
                    setCategories(catData || [])
                    setBrands(brandData || [])
                } catch {
                    toast.error("Erreur lors du chargement du catalogue")
                } finally {
                    setLoading(false)
                }
            }
            fetchData()
        }
    }, [isOpen])

    // Compute count of products per category
    const categoryProductCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        products.forEach(p => {
            if (p.categoryId) {
                counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
            }
        })
        return counts
    }, [products])

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (categoryFilter !== "ALL" && p.categoryId !== categoryFilter) return false
            if (brandFilter !== "ALL" && p.brandId !== brandFilter) return false
            if (onlyInStock && (p.stock == null || p.stock <= 0)) return false
            if (onlyFeatured && !p.isFeatured) return false
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchName = p.name?.toLowerCase().includes(q)
                const matchCat = p.category?.name?.toLowerCase().includes(q)
                const matchBrand = p.brand?.name?.toLowerCase().includes(q)
                if (!matchName && !matchCat && !matchBrand) return false
            }
            return true
        })
    }, [products, categoryFilter, brandFilter, onlyInStock, onlyFeatured, searchQuery])

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Catalogue_Vente_${format(new Date(), "yyyy-MM-dd")}`,
    })

    const generateText = () => {
        const tierName = priceTier === "WHOLESALE" ? "GROS" : priceTier === "RESELLER" ? "REVENDEUR" : "DÉTAIL"
        let text = `*CATALOGUE DE VENTE (${tierName}) - ${format(new Date(), "dd/MM/yyyy")}*\n\n`
        
        const grouped = filteredProducts.reduce((acc, product) => {
            const catName = product.category?.name || "Autres"
            if (!acc[catName]) acc[catName] = []
            acc[catName].push(product)
            return acc
        }, {} as Record<string, any[]>)

        Object.keys(grouped).sort().forEach(cat => {
            text += `*--- ${cat.toUpperCase()} (${grouped[cat].length}) ---*\n`
            grouped[cat].forEach((p: any) => {
                let priceToDisplay = p.price
                if (priceTier === "WHOLESALE" && p.wholesalePrice != null) priceToDisplay = p.wholesalePrice
                if (priceTier === "RESELLER" && p.dealerPrice != null) priceToDisplay = p.dealerPrice
                text += `• ${p.name}: ${Number(priceToDisplay).toLocaleString("fr-DZ")} DA\n`
            })
            text += `\n`
        })
        setTextPreview(text)
    }

    useEffect(() => {
        if (textPreview !== null) generateText()
    }, [priceTier, categoryFilter, brandFilter, searchQuery])

    const handleCopyText = () => {
        if (!textPreview) return
        navigator.clipboard.writeText(textPreview)
        setCopied(true)
        toast.success("Catalogue copié dans le presse-papiers")
        setTimeout(() => setCopied(false), 2000)
    }

    const getPriceLabel = () => {
        if (priceTier === "WHOLESALE") return "Tarif Grossiste (Prix Gros)"
        if (priceTier === "RESELLER") return "Tarif Revendeur"
        return "Tarif Détail (Prix Vente)"
    }

    // ONLY get the chosen price for the product based on selected priceTier
    const getChosenPrice = (product: any) => {
        if (priceTier === "WHOLESALE" && product.wholesalePrice != null) return product.wholesalePrice
        if (priceTier === "RESELLER" && product.dealerPrice != null) return product.dealerPrice
        return product.price
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="!max-w-[98vw] sm:!max-w-[95vw] w-[98vw] sm:w-[95vw] p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
                <DialogTitle className="sr-only">Catalogue de Vente Interactif</DialogTitle>
                <DialogDescription className="sr-only">Consultez, filtrez et exportez le catalogue de vente sur mobile et PC</DialogDescription>

                <div className="flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden h-[94vh]">

                    {/* ── Sidebar Controls (Responsive Left on PC, Top Collapsible on Mobile) ── */}
                    <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                <h2 className="text-base font-black text-slate-900 dark:text-white">Configuration du Catalogue</h2>
                            </div>
                            <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                                {filteredProducts.length} Articles
                            </Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {/* Target Price Tier Selection */}
                            <div className="space-y-1.5 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                                <Label className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-indigo-600" />
                                    Tarif à Afficher (Unique)
                                </Label>
                                <Select value={priceTier} onValueChange={(v: any) => setPriceTier(v)}>
                                    <SelectTrigger className="h-10 text-xs font-bold bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="RETAIL" className="font-bold text-xs">Prix Détail (Prix Vente)</SelectItem>
                                        <SelectItem value="RESELLER" className="font-bold text-xs">Prix Revendeur</SelectItem>
                                        <SelectItem value="WHOLESALE" className="font-bold text-xs">Prix Gros (Grossiste)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Brand Filter */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Filter className="h-3.5 w-3.5 text-purple-500" />
                                    Filtrer par Marque
                                </Label>
                                <Select value={brandFilter} onValueChange={setBrandFilter}>
                                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                        <SelectValue placeholder="Toutes les marques" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="ALL">Toutes les marques ({brands.length})</SelectItem>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Options & Filters */}
                            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <ListChecks className="h-3.5 w-3.5 text-emerald-500" />
                                    Options d'Affichage
                                </Label>
                                {[
                                    { id: "featured", label: "Produits en Vedette (★)", checked: onlyFeatured, onChange: setOnlyFeatured },
                                    { id: "stock", label: "Masquer les produits épuisés", checked: onlyInStock, onChange: setOnlyInStock },
                                ].map(({ id, label, checked, onChange }) => (
                                    <label key={id} htmlFor={id} className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs font-medium">
                                        <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                                <label htmlFor="images" className="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs font-medium">
                                    <span className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-slate-400" />
                                        Afficher les photos
                                    </span>
                                    <Switch id="images" checked={includeImages} onCheckedChange={setIncludeImages} />
                                </label>
                            </div>
                        </div>

                        {/* Sidebar Footer Actions */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 shadow-md gap-2"
                                onClick={() => {
                                    if (textPreview !== null) {
                                        setTextPreview(null);
                                        setTimeout(() => handlePrint(), 100);
                                    } else {
                                        handlePrint();
                                    }
                                }}
                                disabled={loading || filteredProducts.length === 0}
                            >
                                <Download className="h-4 w-4" />
                                Exporter / Imprimer PDF
                            </Button>
                            <Button
                                variant={textPreview ? "secondary" : "outline"}
                                className="w-full h-9 text-xs font-bold gap-2"
                                onClick={() => textPreview ? setTextPreview(null) : generateText()}
                                disabled={loading || filteredProducts.length === 0}
                            >
                                <FileText className="h-4 w-4 text-emerald-500" />
                                {textPreview ? "← Retour Catalogue Visuel" : "Formater Texte WhatsApp"}
                            </Button>
                        </div>
                    </div>

                    {/* ── Main Catalog Preview Area ── */}
                    <div className="flex-1 min-w-0 overflow-hidden flex flex-col bg-white dark:bg-slate-950">

                        {/* Top Category / Family Switcher Pills Bar (Interactive 1-click switching) */}
                        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 flex-1">
                                <Button
                                    variant={categoryFilter === "ALL" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCategoryFilter("ALL")}
                                    className={cn(
                                        "h-7 px-3 text-xs font-black rounded-full shrink-0 transition-all",
                                        categoryFilter === "ALL" ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    )}
                                >
                                    Toutes les Familles ({products.length})
                                </Button>
                                {categories.map(cat => {
                                    const isActive = categoryFilter === cat.id
                                    const count = categoryProductCounts[cat.id] || 0
                                    return (
                                        <Button
                                            key={cat.id}
                                            variant={isActive ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCategoryFilter(cat.id)}
                                            className={cn(
                                                "h-7 px-3 text-xs font-bold rounded-full shrink-0 transition-all gap-1.5",
                                                isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            )}
                                        >
                                            <span>{cat.name}</span>
                                            <span className={cn("text-[9px] px-1.5 py-0.2 rounded-full font-black", isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500")}>
                                                {count}
                                            </span>
                                        </Button>
                                    )
                                })}
                            </div>

                            {/* Layout Mode Toggles */}
                            <div className="hidden sm:flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCatalogLayout("grid")}
                                    className={cn("h-7 w-7 p-0 rounded-md", catalogLayout === "grid" ? "bg-white dark:bg-slate-900 shadow-xs" : "text-slate-500")}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCatalogLayout("table")}
                                    className={cn("h-7 w-7 p-0 rounded-md", catalogLayout === "table" ? "bg-white dark:bg-slate-900 shadow-xs" : "text-slate-500")}
                                >
                                    <List className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Search & Active Tier Indicator Bar */}
                        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Chercher un article dans ce catalogue..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs px-3 py-1 border border-emerald-300 dark:border-emerald-800">
                                    {getPriceLabel()}
                                </Badge>
                                {textPreview && (
                                    <Button onClick={handleCopyText} size="sm" variant={copied ? "default" : "outline"} className={cn("h-8 text-xs font-bold gap-1.5", copied && "bg-emerald-600 text-white")}>
                                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copied ? "Copié !" : "Copier Texte"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Catalogue Main Scrollable View */}
                        {textPreview !== null ? (
                            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-900 text-slate-100 font-mono text-xs">
                                <Textarea
                                    readOnly
                                    className="flex-1 font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800"
                                    value={textPreview}
                                />
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 p-6">
                                {loading ? (
                                    <div className="h-64 flex items-center justify-center gap-3 text-slate-400">
                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                        <span className="text-xs font-bold">Chargement du catalogue...</span>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-white text-slate-900 rounded-2xl border shadow-sm" ref={componentRef}>
                                        {/* Catalogue Header Print Title */}
                                        <div className="text-center mb-6 pb-4 border-b-2 border-slate-200">
                                            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                                                Catalogue de Vente
                                            </h1>
                                            <div className="flex items-center justify-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">{getPriceLabel()}</span>
                                                <span>•</span>
                                                <span>Édité le {format(new Date(), "dd/MM/yyyy")}</span>
                                                <span>•</span>
                                                <span className="font-bold text-slate-700">{filteredProducts.length} articles</span>
                                            </div>
                                        </div>

                                        {filteredProducts.length === 0 ? (
                                            <div className="text-center text-slate-400 py-16">
                                                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                                <p className="text-xs font-bold">Aucun produit ne correspond à vos filtres.</p>
                                            </div>
                                        ) : catalogLayout === "grid" && includeImages ? (
                                            /* Clean Visual Grid Layout */
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                                {filteredProducts.map(product => {
                                                    const price = getChosenPrice(product)
                                                    return (
                                                        <div key={product.id} className="border border-slate-200 rounded-2xl p-3 flex flex-col justify-between shadow-sm bg-white hover:shadow-md transition-all group">
                                                            <div className="relative h-32 w-full bg-slate-50 rounded-xl mb-2.5 overflow-hidden border border-slate-100 flex items-center justify-center">
                                                                {product.images?.[0] ? (
                                                                    <img src={product.images[0].url} alt={product.name} className="object-contain h-full w-full p-1 transition-transform group-hover:scale-105" />
                                                                ) : (
                                                                    <ImageIcon className="h-8 w-8 text-slate-300" />
                                                                )}
                                                                <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                                                                    {product.category?.name || "Autres"}
                                                                </span>
                                                            </div>

                                                            <h3 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{product.name}</h3>

                                                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Tarif</span>
                                                                <span className="font-black text-slate-900 text-base tabular-nums">
                                                                    {Number(price).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400 font-semibold">DA</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            /* Clean Table List Layout */
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-600">
                                                        <th className="py-3 px-3 font-bold uppercase tracking-wider">#</th>
                                                        <th className="py-3 px-3 font-bold uppercase tracking-wider">Désignation</th>
                                                        <th className="py-3 px-3 font-bold uppercase tracking-wider">Famille / Catégorie</th>
                                                        <th className="py-3 px-3 font-bold uppercase tracking-wider text-right">Prix Unique ({priceTier})</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredProducts.map((product, idx) => {
                                                        const price = getChosenPrice(product)
                                                        return (
                                                            <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                                                                <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">{product.name}</td>
                                                                <td className="py-2.5 px-3">
                                                                    <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-slate-50">
                                                                        {product.category?.name || "Autres"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right font-black text-sm tabular-nums text-slate-900">
                                                                    {Number(price).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">DA</span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        )}

                                        <style dangerouslySetInnerHTML={{
                                            __html: `
                                            @media print {
                                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                            }
                                        ` }} />
                                    </div>
                                )}
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
