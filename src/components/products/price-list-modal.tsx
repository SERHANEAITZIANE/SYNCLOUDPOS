"use client"

import { useState, useRef, useEffect } from "react"
import { Download, FileText, Settings2, Image as ImageIcon, Loader2, Copy, Check, Filter, ListChecks, Tag } from "lucide-react"
import { toast } from "react-hot-toast"
import { useReactToPrint } from "react-to-print"
import { format } from "date-fns"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAllProductsForCatalogue } from "@/actions/products"
import { getCategories } from "@/actions/categories"
import { getBrands } from "@/actions/brands"

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
    const [priceTier, setPriceTier] = useState<"RETAIL" | "WHOLESALE" | "RESELLER">("RETAIL")
    const [includeImages, setIncludeImages] = useState(true)
    const [onlyFeatured, setOnlyFeatured] = useState(false)
    const [onlyInStock, setOnlyInStock] = useState(false)
    const [textPreview, setTextPreview] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

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
                    setProducts(prodData)
                    setCategories(catData)
                    setBrands(brandData)
                } catch {
                    toast.error("Erreur lors du chargement des données")
                } finally {
                    setLoading(false)
                }
            }
            fetchData()
        }
    }, [isOpen])

    const filteredProducts = products.filter(p => {
        if (categoryFilter !== "ALL" && p.categoryId !== categoryFilter) return false
        if (brandFilter !== "ALL" && p.brandId !== brandFilter) return false
        if (onlyInStock && (p.stock == null || p.stock <= 0)) return false
        if (onlyFeatured && !p.isFeatured) return false
        return true
    })

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Catalogue_Prix_${format(new Date(), "yyyy-MM-dd")}`,
    })

    const generateText = () => {
        let text = `*CATALOGUE DE PRIX (${format(new Date(), "dd/MM/yyyy")})*\n\n`
        const grouped = filteredProducts.reduce((acc, product) => {
            const catName = product.category?.name || "Autres"
            if (!acc[catName]) acc[catName] = []
            acc[catName].push(product)
            return acc
        }, {} as Record<string, any[]>)
        Object.keys(grouped).sort().forEach(cat => {
            text += `*--- ${cat.toUpperCase()} ---*\n`
            grouped[cat].forEach((p: any) => {
                let priceToDisplay = p.price
                if (priceTier === "WHOLESALE" && p.wholesalePrice != null) priceToDisplay = p.wholesalePrice
                if (priceTier === "RESELLER" && p.dealerPrice != null) priceToDisplay = p.dealerPrice
                text += `- ${p.name}: ${Number(priceToDisplay).toLocaleString("fr-DZ")} DA\n`
            })
            text += `\n`
        })
        setTextPreview(text)
    }

    useEffect(() => {
        if (textPreview !== null) generateText()
    }, [priceTier, categoryFilter, brandFilter])

    const handleCopyText = () => {
        if (!textPreview) return
        navigator.clipboard.writeText(textPreview)
        setCopied(true)
        toast.success("Catalogue copié dans le presse-papiers")
        setTimeout(() => setCopied(false), 2000)
    }

    const getPriceLabel = () => {
        if (priceTier === "WHOLESALE") return "Prix Gros"
        if (priceTier === "RESELLER") return "Prix Revendeur"
        return "Prix Vente"
    }

    const getPrice = (product: any) => {
        if (priceTier === "WHOLESALE" && product.wholesalePrice != null) return product.wholesalePrice
        if (priceTier === "RESELLER" && product.dealerPrice != null) return product.dealerPrice
        return product.price
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="!max-w-[96vw] w-[96vw] p-0 overflow-hidden border-border">
                <DialogTitle className="sr-only">Générer Catalogue Externe</DialogTitle>
                <DialogDescription className="sr-only">Créez un catalogue PDF ou texte pour vos clients</DialogDescription>

                <div className="flex bg-background overflow-hidden h-[92vh]">

                    {/* ── Left Sidebar ── */}
                    <div className="w-72 shrink-0 bg-card border-r border-border flex flex-col">
                        <div className="px-5 pt-5 pb-4 border-b border-border">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-blue-500" />
                                Configuration
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {/* Category Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Filter className="h-3.5 w-3.5 text-blue-500" />
                                    Catégorie
                                </Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-9 text-sm bg-background">
                                        <SelectValue placeholder="Toutes les catégories" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="ALL">Toutes les catégories</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Brand Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Filter className="h-3.5 w-3.5 text-purple-500" />
                                    Marque
                                </Label>
                                <Select value={brandFilter} onValueChange={setBrandFilter}>
                                    <SelectTrigger className="h-9 text-sm bg-background">
                                        <SelectValue placeholder="Toutes les marques" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="ALL">Toutes les marques</SelectItem>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Price Tier */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-orange-500" />
                                    Tarification
                                </Label>
                                <Select value={priceTier} onValueChange={(v: any) => setPriceTier(v)}>
                                    <SelectTrigger className="h-9 text-sm bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="RETAIL">Détaillant (Prix Vente)</SelectItem>
                                        <SelectItem value="WHOLESALE">Grossiste (Prix Gros)</SelectItem>
                                        <SelectItem value="RESELLER">Revendeur (Prix Revendeur)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filters */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <ListChecks className="h-3.5 w-3.5 text-emerald-500" />
                                    Filtres
                                </Label>
                                {[
                                    { id: "featured", label: "Uniquement En Vedette (★)", checked: onlyFeatured, onChange: setOnlyFeatured },
                                    { id: "stock", label: "Masquer Rupture de Stock", checked: onlyInStock, onChange: setOnlyInStock },
                                ].map(({ id, label, checked, onChange }) => (
                                    <label key={id} htmlFor={id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                                        <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
                                        <span className="text-sm">{label}</span>
                                    </label>
                                ))}
                                <label htmlFor="images" className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                                    <span className="flex items-center gap-2 text-sm">
                                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                        Afficher les photos
                                    </span>
                                    <Switch id="images" checked={includeImages} onCheckedChange={setIncludeImages} />
                                </label>
                            </div>

                            {/* Count badge */}
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-3 text-center">
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{filteredProducts.length}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">produit{filteredProducts.length !== 1 ? "s" : ""} affiché{filteredProducts.length !== 1 ? "s" : ""}</p>
                            </div>
                        </div>

                        {/* Sidebar footer */}
                        <div className="px-5 pb-5 pt-3 border-t border-border space-y-2 shrink-0">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
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
                                <Download className="h-4 w-4 mr-2" />
                                Exporter en PDF
                            </Button>
                            <Button
                                variant={textPreview ? "secondary" : "outline"}
                                className="w-full h-9"
                                onClick={() => textPreview ? setTextPreview(null) : generateText()}
                                disabled={loading || filteredProducts.length === 0}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                {textPreview ? "← Voir le Catalogue" : "Texte WhatsApp / SMS"}
                            </Button>
                        </div>
                    </div>

                    {/* ── Preview Area ── */}
                    <div className="flex-1 min-w-0 overflow-hidden flex flex-col bg-muted/30">
                        {/* Preview header bar */}
                        <div className="px-6 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Aperçu du catalogue</span>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{filteredProducts.length} article{filteredProducts.length !== 1 ? "s" : ""}</span>
                            </div>
                            {textPreview && (
                                <Button onClick={handleCopyText} size="sm" variant={copied ? "default" : "outline"} className={copied ? "bg-green-600 text-white" : ""}>
                                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                    {copied ? "Copié !" : "Copier"}
                                </Button>
                            )}
                        </div>

                        {/* Text mode */}
                        {textPreview !== null ? (
                            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                                <Textarea
                                    readOnly
                                    className="flex-1 font-mono text-sm resize-none focus-visible:ring-0 bg-card"
                                    value={textPreview}
                                />
                            </div>
                        ) : (
                            /* PDF preview */
                            <ScrollArea className="flex-1">
                                {loading ? (
                                    <div className="h-64 flex items-center justify-center gap-3 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span className="text-sm">Chargement...</span>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white text-black" ref={componentRef}>
                                        {/* Catalogue title */}
                                        <div className="text-center mb-8 pb-5 border-b-2 border-gray-100">
                                            <h1 className="text-4xl font-black tracking-tight text-gray-900 uppercase mb-2">
                                                Catalogue de Prix
                                            </h1>
                                            <div className="flex items-center justify-center gap-3 text-sm text-gray-400 flex-wrap">
                                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold">{getPriceLabel()}</span>
                                                <span>•</span>
                                                <span>{format(new Date(), "dd/MM/yyyy")}</span>
                                                <span>•</span>
                                                <span className="font-semibold">{filteredProducts.length} articles</span>
                                            </div>
                                        </div>

                                        {filteredProducts.length === 0 ? (
                                            <div className="text-center text-gray-400 py-20">
                                                <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">Aucun produit pour ces critères</p>
                                            </div>
                                        ) : includeImages ? (
                                            /* Grid with images – up to 5 cols */
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {filteredProducts.map(product => (
                                                    <div key={product.id} className="border border-gray-100 rounded-xl p-3 flex flex-col shadow-sm bg-white hover:shadow-md transition-shadow">
                                                        <div className="relative h-28 w-full bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-gray-100">
                                                            {product.images?.[0] ? (
                                                                <img src={product.images[0].url} alt={product.name} className="object-contain h-full w-full p-1" />
                                                            ) : (
                                                                <ImageIcon className="h-7 w-7 text-gray-200" />
                                                            )}
                                                            <span className="absolute top-1.5 left-1.5 bg-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm text-gray-500">
                                                                {product.category?.name || "Autres"}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-[13px] text-gray-900 line-clamp-2 leading-tight flex-1">{product.name}</h3>
                                                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-end justify-between">
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Prix</span>
                                                            <span className="font-black text-gray-900 text-lg">
                                                                {Number(getPrice(product)).toLocaleString("fr-DZ")}
                                                                <span className="text-xs text-gray-400 font-normal ml-0.5">DA</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Compact table without images */
                                            <table className="w-full text-left text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b-2 border-gray-200">
                                                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
                                                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Produit</th>
                                                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Catégorie</th>
                                                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Prix</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredProducts.map((product, idx) => (
                                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="py-3 px-4 text-gray-400 text-xs">{idx + 1}</td>
                                                            <td className="py-3 px-4 font-semibold text-gray-900">{product.name}</td>
                                                            <td className="py-3 px-4">
                                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{product.category?.name || "Autres"}</span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-black text-base">
                                                                {Number(getPrice(product)).toLocaleString("fr-DZ")}
                                                                <span className="text-xs text-gray-400 font-normal ml-1">DA</span>
                                                            </td>
                                                        </tr>
                                                    ))}
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
