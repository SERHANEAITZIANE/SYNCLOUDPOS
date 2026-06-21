"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    User, 
    ShoppingBag, 
    Store as StoreIcon, 
    Search, 
    ArrowLeft, 
    Tag, 
    Package, 
    Layers, 
    ChevronRight, 
    BadgeInfo 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog"

interface ProductImage {
    id: string
    url: string
}

interface BrandCount {
    id: string
    name: string
    imageUrl?: string | null
    productCount: number
}

interface Product {
    id: string
    name: string
    description?: string
    price: number
    wholesalePrice?: number
    dealerPrice?: number
    stock: number
    barcodes?: { value: string }[]
    images: ProductImage[]
    brand?: { id: string; name: string; imageUrl?: string | null }
    category?: { id: string; name: string }
}

interface CatalogClientProps {
    initialBrands: BrandCount[]
    initialProducts: Product[]
}

type ClientType = "RETAIL" | "WHOLESALE" | "RESELLER"
type Step = "CLIENT_TYPE" | "BRAND" | "PRODUCTS"

export const CatalogClient: React.FC<CatalogClientProps> = ({ initialBrands, initialProducts }) => {
    // State management
    const [step, setStep] = useState<Step>("CLIENT_TYPE")
    const [clientType, setClientType] = useState<ClientType>("RETAIL")
    const [selectedBrand, setSelectedBrand] = useState<BrandCount | null>(null)
    const [brandSearch, setBrandSearch] = useState("")
    const [productSearch, setProductSearch] = useState("")
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    // Clients Definition
    const clientTypes = [
        {
            id: "RETAIL" as ClientType,
            title: "Client de Détail",
            subtitle: "Vente standard au prix public",
            desc: "Affiche le prix de vente conseillé (TTC). Idéal pour les clients passagers et ventes comptoir.",
            icon: User,
            color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400"
        },
        {
            id: "WHOLESALE" as ClientType,
            title: "Client de Gros",
            subtitle: "Tarifs préférentiels / Demi-gros",
            desc: "Affiche le prix de gros. Applique automatiquement le prix standard si aucun tarif de gros n'est configuré.",
            icon: ShoppingBag,
            color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400"
        },
        {
            id: "RESELLER" as ClientType,
            title: "Partenaire / Revendeur",
            subtitle: "Tarifs revendeurs exclusifs",
            desc: "Affiche les prix revendeurs. Idéal pour les distributeurs réguliers et les conventions de partenariat.",
            icon: StoreIcon,
            color: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400"
        }
    ]

    // Helpers
    const getActivePrice = (product: Product) => {
        if (clientType === "WHOLESALE" && product.wholesalePrice && Number(product.wholesalePrice) > 0) {
            return { price: Number(product.wholesalePrice), fallback: false }
        }
        if (clientType === "RESELLER" && product.dealerPrice && Number(product.dealerPrice) > 0) {
            return { price: Number(product.dealerPrice), fallback: false }
        }
        return { price: Number(product.price), fallback: clientType !== "RETAIL" }
    }

    const formatPrice = (amount: number) => {
        return amount.toLocaleString("fr-DZ") + " DA"
    }

    // Filters
    const filteredBrands = initialBrands.filter(b => 
        b.name.toLowerCase().includes(brandSearch.toLowerCase()) && b.productCount > 0
    )

    const filteredProducts = initialProducts.filter(p => {
        const matchesBrand = selectedBrand ? p.brand?.id === selectedBrand.id : true
        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                              p.description?.toLowerCase().includes(productSearch.toLowerCase())
        return matchesBrand && matchesSearch
    })

    return (
        <div className="flex flex-col min-h-dvh text-white p-4 pb-24 md:p-6 lg:p-8 rounded-3xl" style={{ backgroundColor: '#07070a', color: '#ffffff' }}>
            
            {/* Header Area */}
            <div className="flex flex-col space-y-2 mb-6">
                <div className="flex items-center space-x-3">
                    {step !== "CLIENT_TYPE" && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                if (step === "PRODUCTS") setStep("BRAND")
                                else if (step === "BRAND") setStep("CLIENT_TYPE")
                            }}
                            className="bg-white/5 hover:bg-white/10 rounded-xl"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                            Catalogue de Vente
                        </h1>
                        <p className="text-xs text-white/50">
                            Recherche de prix et consultation de stock en temps réel
                        </p>
                    </div>
                </div>

                {/* Interactive Dynamic Breadcrumbs */}
                {step !== "CLIENT_TYPE" && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-white/50">
                        <button 
                            onClick={() => setStep("CLIENT_TYPE")}
                            className="hover:text-white font-medium transition-colors"
                        >
                            {clientTypes.find(c => c.id === clientType)?.title}
                        </button>
                        {step === "PRODUCTS" && selectedBrand && (
                            <>
                                <ChevronRight className="h-3 w-3 opacity-50" />
                                <button 
                                    onClick={() => setStep("BRAND")}
                                    className="hover:text-white font-medium transition-colors"
                                >
                                    {selectedBrand.name}
                                </button>
                            </>
                        )}
                        <ChevronRight className="h-3 w-3 opacity-50" />
                        <span className="text-white/80 truncate">
                            {step === "BRAND" ? "Sélectionner la Marque" : `Produits (${filteredProducts.length})`}
                        </span>
                    </div>
                )}
            </div>

            <Separator className="bg-white/5 mb-6" />

            {/* Steps Container */}
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    
                    {/* STEP 1: Select Client Type */}
                    {step === "CLIENT_TYPE" && (
                        <motion.div 
                            key="step-client"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col space-y-4 max-w-5xl mx-auto py-4"
                        >
                            <div className="text-center space-y-1 mb-4">
                                <h2 className="text-lg font-semibold">Étape 1: Type de Client</h2>
                                <p className="text-sm text-white/40">Sélectionnez le profil tarifaire à appliquer au catalogue</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {clientTypes.map((c) => {
                                    const IconComponent = c.icon
                                    return (
                                        <Card 
                                            key={c.id}
                                            onClick={() => {
                                                setClientType(c.id)
                                                setStep("BRAND")
                                            }}
                                            className={`relative overflow-hidden cursor-pointer bg-gradient-to-br ${c.color} border hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl`}
                                            style={{ backgroundColor: '#111116', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                        >
                                            <CardContent className="p-6 flex flex-row md:flex-col items-start md:items-center space-x-4 md:space-x-0 md:space-y-4">
                                                <div className="p-3 bg-white/5 rounded-2xl shadow-inner shrink-0">
                                                    <IconComponent className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1.5 md:text-center">
                                                    <h3 className="font-bold text-white text-base leading-none">{c.title}</h3>
                                                    <p className="text-xs font-semibold text-white/60 leading-none">{c.subtitle}</p>
                                                    <p className="text-xs text-white/40 pt-1 leading-relaxed">{c.desc}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Select Brand */}
                    {step === "BRAND" && (
                        <motion.div 
                            key="step-brand"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">Étape 2: Marques Disponibles</h2>
                                    <p className="text-sm text-white/40">Sélectionnez une marque pour afficher les produits en stock</p>
                                </div>
                                <div className="relative max-w-xs shrink-0">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                    <Input 
                                        placeholder="Rechercher une marque..."
                                        className="pl-9 bg-white/5 border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-10"
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {filteredBrands.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <Tag className="h-10 w-10 text-white/20 mb-3" />
                                    <p className="text-sm font-medium text-white/60">Aucune marque trouvée</p>
                                    <p className="text-xs text-white/40 mt-1">Essayez un autre mot-clé ou modifiez les filtres.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                    {filteredBrands.map((b) => (
                                        <div 
                                            key={b.id}
                                            onClick={() => {
                                                setSelectedBrand(b)
                                                setStep("PRODUCTS")
                                            }}
                                            className="group cursor-pointer border hover:border-blue-500/40 rounded-2xl active:scale-[0.97] transition-all duration-200 shadow-lg relative flex flex-col items-center overflow-hidden"
                                            style={{ backgroundColor: '#111116', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                        >
                                            {/* Brand Image or Fallback */}
                                            <div className="w-full aspect-square bg-[#18181f] flex items-center justify-center overflow-hidden">
                                                {b.imageUrl ? (
                                                    <img 
                                                        src={b.imageUrl} 
                                                        alt={b.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-white/5 group-hover:bg-blue-500/10 rounded-xl flex items-center justify-center transition-all duration-200">
                                                        <Tag className="h-6 w-6 text-white/40 group-hover:text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 w-full text-center space-y-1">
                                                <h3 className="font-semibold text-sm text-white/95 group-hover:text-white leading-tight truncate">
                                                    {b.name}
                                                </h3>
                                                <span className="inline-block px-2.5 py-0.5 bg-blue-500/15 text-blue-400 font-bold text-[10px] rounded-full uppercase tracking-wider">
                                                    {b.productCount} {b.productCount > 1 ? "articles" : "article"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 3: Products Grid */}
                    {step === "PRODUCTS" && (
                        <motion.div 
                            key="step-products"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <div className="flex items-center space-x-3.5">
                                    {selectedBrand?.imageUrl ? (
                                        <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#18181f] flex items-center justify-center select-none">
                                            <img 
                                                src={selectedBrand.imageUrl} 
                                                alt={selectedBrand.name} 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                            <Tag className="h-5 w-5 text-white/40" />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <span>Produits {selectedBrand?.name}</span>
                                            <span className="text-xs px-2.5 py-0.5 bg-white/5 border border-white/10 text-white/60 rounded-full font-normal">
                                                {filteredProducts.length} en stock
                                            </span>
                                        </h2>
                                        <p className="text-xs text-white/40 mt-0.5">Cliquez sur un produit pour voir sa fiche détaillée</p>
                                    </div>
                                </div>
                                <div className="relative max-w-xs shrink-0">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                    <Input 
                                        placeholder="Rechercher un produit..."
                                        className="pl-9 bg-white/5 border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-10"
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {filteredProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <Package className="h-10 w-10 text-white/20 mb-3" />
                                    <p className="text-sm font-medium text-white/60">Aucun produit en stock pour cette marque</p>
                                    <p className="text-xs text-white/40 mt-1">Recherchez un autre produit ou retournez aux marques.</p>
                                    <Button 
                                        variant="outline" 
                                        className="mt-4 border-white/10 bg-white/5 hover:bg-white/10 text-xs rounded-xl"
                                        onClick={() => setStep("BRAND")}
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Retour aux Marques
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                    {filteredProducts.map((p) => {
                                        const { price: activePrice, fallback } = getActivePrice(p)
                                        return (
                                            <div 
                                                key={p.id}
                                                onClick={() => setSelectedProduct(p)}
                                                className="group cursor-pointer border hover:border-blue-500/30 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 relative flex flex-col h-full"
                                                style={{ backgroundColor: '#111116', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                            >
                                                {/* Image Container */}
                                                <div className="relative aspect-square w-full bg-[#18181f] flex items-center justify-center overflow-hidden border-b border-white/5 select-none shrink-0">
                                                    {p.images.length > 0 ? (
                                                        <img 
                                                            src={p.images[0].url} 
                                                            alt={p.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center space-y-2 text-white/20 group-hover:text-blue-500/40 transition-colors">
                                                            <Package className="h-12 w-12 stroke-[1.5]" />
                                                            <span className="text-[10px] uppercase font-bold tracking-widest">Aucune Image</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Stock Badge */}
                                                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-[#07070a]/80 backdrop-blur-md border border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 rounded-lg shadow-sm">
                                                        {p.stock} disponibles
                                                    </div>
                                                </div>

                                                {/* Details Content */}
                                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                                    <div className="space-y-1">
                                                        {p.category && (
                                                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                                                                {p.category.name}
                                                            </span>
                                                        )}
                                                        <h3 className="font-bold text-sm text-white/90 group-hover:text-white leading-snug line-clamp-2">
                                                            {p.name}
                                                        </h3>
                                                    </div>

                                                    <div className="flex items-end justify-between pt-1.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] uppercase font-bold tracking-wider text-white/40 leading-none">
                                                                Prix {clientTypes.find(c => c.id === clientType)?.title.split(" ")[2]}
                                                            </span>
                                                            <span className="text-base font-extrabold text-blue-400 leading-tight">
                                                                {formatPrice(activePrice)}
                                                            </span>
                                                            {fallback && (
                                                                <span className="inline-flex items-center text-[9px] text-amber-500 font-bold mt-0.5 leading-none">
                                                                    <BadgeInfo className="h-2.5 w-2.5 mr-0.5" /> Prix Standard
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="h-8 w-8 bg-white/5 group-hover:bg-blue-600 rounded-xl flex items-center justify-center text-white/60 group-hover:text-white transition-all duration-200">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* PRODUCT DETAIL DIALOG / DRAWER OVERLAY */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                {selectedProduct && (
                    <DialogContent className="max-w-[480px] md:max-w-[760px] lg:max-w-[850px] text-white rounded-3xl p-5 md:p-6 shadow-2xl overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#0c0c11', borderColor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', width: '90vw', maxWidth: '850px' }}>
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-lg font-bold text-white pr-6">
                                {selectedProduct.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-white/40 uppercase font-bold tracking-wider flex items-center gap-1.5 flex-wrap">
                                {selectedProduct.brand?.imageUrl && (
                                    <span className="w-4 h-4 rounded-full overflow-hidden border border-white/10 shrink-0 bg-[#18181f] flex items-center justify-center select-none">
                                        <img 
                                            src={selectedProduct.brand.imageUrl} 
                                            alt={selectedProduct.brand.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    </span>
                                )}
                                <span>{selectedProduct.brand?.name}</span>
                                {selectedProduct.category && (
                                    <>
                                        <span>•</span>
                                        <span>{selectedProduct.category.name}</span>
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Responsive content layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Column 1: Image Showcase (left) */}
                            <div className="flex flex-col space-y-3">
                                <div className="relative aspect-video md:aspect-square w-full bg-[#18181f] rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center select-none shadow-inner shrink-0">
                                    {selectedProduct.images.length > 0 ? (
                                        <img 
                                            src={selectedProduct.images[0].url} 
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package className="h-16 w-16 text-white/10 stroke-[1.2]" />
                                    )}

                                    {/* Brand Logo Floating Overlay */}
                                    {selectedProduct.brand?.imageUrl && (
                                        <div className="absolute top-2.5 right-2.5 w-10 h-10 bg-[#07070a]/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg select-none">
                                            <img 
                                                src={selectedProduct.brand.imageUrl} 
                                                alt={selectedProduct.brand.name} 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Stock & Barcode on Left side for Desktop and Mobile */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Stock Disponible</span>
                                        <span className="text-sm font-extrabold text-emerald-400 mt-0.5">{selectedProduct.stock} articles</span>
                                    </div>
                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Code à barres</span>
                                        <span className="text-xs font-bold text-white/80 mt-1 truncate">
                                            {selectedProduct.barcodes && selectedProduct.barcodes.length > 0 
                                                ? selectedProduct.barcodes[0].value 
                                                : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Pricing Breakdown & Details (right) */}
                            <div className="flex flex-col justify-between space-y-4">
                                <div className="space-y-4">
                                    {/* Prices Breakdown */}
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2.5 shadow-md">
                                        <h4 className="text-[10px] uppercase font-extrabold text-white/40 tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <Layers className="h-3 w-3 text-blue-400" /> Structure Tarifaire Complexe
                                        </h4>
                                        
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/60">Prix de Détail (Public)</span>
                                            <span className="font-bold text-white">{formatPrice(selectedProduct.price)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/60">Prix de Gros</span>
                                            <span className={`font-bold ${selectedProduct.wholesalePrice ? 'text-emerald-400' : 'text-white/30'}`}>
                                                {selectedProduct.wholesalePrice && Number(selectedProduct.wholesalePrice) > 0 
                                                    ? formatPrice(Number(selectedProduct.wholesalePrice)) 
                                                    : "Non configuré"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/60">Prix Revendeur / Partenaire</span>
                                            <span className={`font-bold ${selectedProduct.dealerPrice ? 'text-violet-400' : 'text-white/30'}`}>
                                                {selectedProduct.dealerPrice && Number(selectedProduct.dealerPrice) > 0 
                                                    ? formatPrice(Number(selectedProduct.dealerPrice)) 
                                                    : "Non configuré"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description section */}
                                    {selectedProduct.description && (
                                        <div className="space-y-1.5">
                                            <h4 className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Description de l'article</h4>
                                            <p className="text-xs text-white/70 leading-relaxed bg-white/[0.01] border border-white/5 p-3 rounded-2xl max-h-[140px] md:max-h-[180px] overflow-y-auto">
                                                {selectedProduct.description}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end pt-3">
                                    <Button 
                                        variant="outline" 
                                        className="border-white/10 hover:bg-white/5 rounded-xl text-xs w-full sm:w-auto"
                                        onClick={() => setSelectedProduct(null)}
                                    >
                                        Fermer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

        </div>
    )
}
