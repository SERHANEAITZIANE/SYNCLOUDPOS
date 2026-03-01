"use client"

import { useState, useRef, useEffect } from "react"
import { Download, FileText, Settings2, Image as ImageIcon, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { useReactToPrint } from "react-to-print"
import { format } from "date-fns"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getAllProductsForCatalogue } from "@/actions/products"
import { getCategories } from "@/actions/categories"

interface PriceListModalProps {
    isOpen: boolean
    onClose: () => void
}

export const PriceListModal: React.FC<PriceListModalProps> = ({
    isOpen,
    onClose
}) => {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
    const [priceTier, setPriceTier] = useState<"RETAIL" | "WHOLESALE" | "RESELLER">("RETAIL")
    const [includeImages, setIncludeImages] = useState(true)

    const componentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoading(true)
                try {
                    const [prodData, catData] = await Promise.all([
                        getAllProductsForCatalogue(),
                        getCategories()
                    ])
                    setProducts(prodData)
                    setCategories(catData)
                } catch (error) {
                    toast.error("Erreur lors du chargement des données")
                } finally {
                    setLoading(false)
                }
            }
            fetchData()
        }
    }, [isOpen])

    const filteredProducts = products.filter(p => categoryFilter === "ALL" || p.categoryId === categoryFilter)

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Catalogue_Prix_${format(new Date(), "yyyy-MM-dd")}`,
    })

    const handleCopyText = () => {
        let text = `*CATALOGUE DE PRIX (${format(new Date(), "dd/MM/yyyy")})*\n\n`

        // Group by category for text output
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
                if (priceTier === "WHOLESALE" && p.wholesalePrice) priceToDisplay = p.wholesalePrice
                if (priceTier === "RESELLER" && p.dealerPrice) priceToDisplay = p.dealerPrice

                text += `- ${p.name}: ${Number(priceToDisplay).toLocaleString("fr-DZ")} DA\n`
            })
            text += `\n`
        })

        navigator.clipboard.writeText(text)
        toast.success("Catalogue copié dans le presse-papiers")
    }

    const getPriceLabel = () => {
        if (priceTier === "WHOLESALE") return "Prix Gros"
        if (priceTier === "RESELLER") return "Prix Revendeur"
        return "Prix Vente"
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-gray-50/50">
                <DialogHeader className="p-6 bg-white border-b">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Générer un Catalogue de Prix
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Controls */}
                    <div className="w-80 bg-white border-r p-6 space-y-6 flex flex-col">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2text-sm font-semibold text-gray-700">
                                <Settings2 className="h-4 w-4" /> Filtres & Options
                            </div>

                            <div className="space-y-2">
                                <Label>Catégorie</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Toutes les catégories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Toutes les catégories</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Type de Prix</Label>
                                <Select value={priceTier} onValueChange={(v: any) => setPriceTier(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RETAIL">Détaillant (Prix Vente)</SelectItem>
                                        <SelectItem value="WHOLESALE">Grossiste (Prix Gros)</SelectItem>
                                        <SelectItem value="RESELLER">Revendeur (Prix Revendeur)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-gray-500" />
                                        Photos
                                    </Label>
                                    <p className="text-[10px] text-gray-500">Inclure les images des produits</p>
                                </div>
                                <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
                            </div>
                        </div>

                        <div className="mt-auto pt-6 space-y-3">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handlePrint}
                                disabled={loading || filteredProducts.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Exporter en PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleCopyText}
                                disabled={loading || filteredProducts.length === 0}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Copier en Texte (Wa/SMS)
                            </Button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-hidden relative bg-gray-100 p-6 flex items-start justify-center">
                        <ScrollArea className="h-full w-full rounded-md border shadow-sm bg-white">
                            {loading ? (
                                <div className="h-full w-full flex items-center justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                    <span className="ml-3 text-gray-500">Chargement des produits...</span>
                                </div>
                            ) : (
                                /* PRINTABLE CONTENT */
                                <div className="p-8 print-content" ref={componentRef}>
                                    <div className="text-center mb-8 pb-6 border-b-2 border-gray-100">
                                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2 uppercase">
                                            Catalogue de Prix
                                        </h1>
                                        <div className="flex items-center justify-center gap-4 text-gray-500 font-medium">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                                                {getPriceLabel()}
                                            </span>
                                            <span>•</span>
                                            <span>{format(new Date(), "dd/MM/yyyy")}</span>
                                        </div>
                                    </div>

                                    {filteredProducts.length === 0 ? (
                                        <div className="text-center text-gray-500 py-12">
                                            Aucun produit trouvé pour ces critères.
                                        </div>
                                    ) : (
                                        <div className={includeImages ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-0"}>
                                            {includeImages ? (
                                                /* Grid Layout with Images */
                                                filteredProducts.map(product => {
                                                    let price = product.price
                                                    if (priceTier === "WHOLESALE" && product.wholesalePrice) price = product.wholesalePrice
                                                    if (priceTier === "RESELLER" && product.dealerPrice) price = product.dealerPrice

                                                    return (
                                                        <div key={product.id} className="border border-gray-100 rounded-xl p-3 flex flex-col break-inside-avoid shadow-sm hover:shadow-md transition-shadow bg-white">
                                                            <div className="h-32 w-full bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-gray-100 relative">
                                                                {product.images && product.images[0] ? (
                                                                    <img src={product.images[0].url} alt={product.name} className="object-contain h-full w-full p-2" />
                                                                ) : (
                                                                    <ImageIcon className="h-8 w-8 text-gray-300" />
                                                                )}
                                                                <div className="absolute top-2 left-2">
                                                                    <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded shadow-sm text-gray-600">
                                                                        {product.category?.name || "Autres"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 flex flex-col">
                                                                <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight flex-1">
                                                                    {product.name}
                                                                </h3>
                                                                <div className="mt-2 pt-2 border-t border-gray-100 flex items-end justify-between">
                                                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Prix</span>
                                                                    <span className="font-extrabold text-[#111] text-lg">
                                                                        {Number(price).toLocaleString("fr-DZ")} <span className="text-xs text-gray-500 font-medium uppercase">DA</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                /* Minimal List Layout without Images */
                                                <table className="w-full text-left text-sm border-collapse">
                                                    <thead>
                                                        <tr className="border-b-2 border-gray-200 text-gray-500">
                                                            <th className="py-3 px-2 font-semibold uppercase text-xs tracking-wider">Produit</th>
                                                            <th className="py-3 px-2 font-semibold uppercase text-xs tracking-wider">Catégorie</th>
                                                            <th className="py-3 px-2 font-semibold uppercase text-xs tracking-wider text-right">Prix</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {filteredProducts.map(product => {
                                                            let price = product.price
                                                            if (priceTier === "WHOLESALE" && product.wholesalePrice) price = product.wholesalePrice
                                                            if (priceTier === "RESELLER" && product.dealerPrice) price = product.dealerPrice

                                                            return (
                                                                <tr key={product.id} className="break-inside-avoid">
                                                                    <td className="py-3 px-2 font-bold text-gray-900">{product.name}</td>
                                                                    <td className="py-3 px-2 text-gray-500 text-xs">
                                                                        <span className="bg-gray-100 px-2 py-1 rounded-md">{product.category?.name || "Autres"}</span>
                                                                    </td>
                                                                    <td className="py-3 px-2 text-right font-extrabold text-base">
                                                                        {Number(price).toLocaleString("fr-DZ")} <span className="text-xs text-gray-400 font-medium ml-1">DA</span>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                        @media print {
                                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                            .print-content { padding: 0 !important; }
                                        }
                                    `}} />
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
