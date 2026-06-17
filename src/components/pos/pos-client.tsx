"use client"

import { useState, useEffect, useRef, useMemo, FC, Suspense, ReactNode } from "react"
import { Search, ShoppingCart, ImageIcon, ChevronUp, Mic, MicOff, Star, X, PlusCircle, Plus, Keyboard, Tag, HelpCircle, DollarSign, Store, Users as UsersIcon, Barcode, Wand2, Archive, CheckCircle, LayoutGrid, Package, Percent, Trash, ChevronLeft, ChevronRight, Info } from "lucide-react"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useSwipe } from "@/hooks/use-swipe"
import { cn, formatter, scrollIntoViewSafe } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"

import { PosHeader } from "./pos-header"
import { CartSidebar } from "./cart-sidebar"
import { ProductCard } from "./product-card"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import dynamic from "next/dynamic"
const SalesOrderSearchDialog = dynamic(() => import("./sales-order-search-dialog").then(m => m.SalesOrderSearchDialog), { ssr: false })
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { ModeToggle } from "@/components/dashboard/mode-toggle"
import { LanguageSwitcher } from "@/components/dashboard/language-switcher"
import { usePosStore } from "@/hooks/use-pos-store"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

interface PosClientProps {
    storeName?: string
    storeAddress?: string
    storePhone?: string
    products: {
        id: string
        name: string
        description: string
        price: number
        wholesalePrice?: number
        dealerPrice?: number
        cost: number
        minStock: number
        imageUrl: string
        category: string
        categoryId: string
        stock: number
        tvaRate: number
        barcodes: string[]
        isFeatured: boolean
    }[]
    categories: {
        id: string
        name: string
    }[]
    brands: {
        id: string
        name: string
    }[]
    customers?: any[]
    accounts?: any[]
    posTimbreEnabled?: boolean
    storeData?: any
    isElectronicsStore?: boolean
    sellers?: { id: string; name: string | null; role: string }[]
    currentUserId?: string
    actionCreateOrder: (values: any) => Promise<any>
    actionGetProductCustomerSellHistory: (productId: string, customerId: string) => Promise<any>
    actionSendWhatsAppReceipt: (orderId: string) => Promise<any>
    actionCreateCustomer: (data: any) => Promise<any>
    actionGetActivePromotions: () => Promise<any[]>
    actionGetSalesOrderByReceipt: (receiptNumber: string) => Promise<any>
    actionSearchRecentSalesOrders: (query: string, type?: string) => Promise<any[]>
    actionCreateProduct: (values: any) => Promise<any>
    actionSuggestProductNames: (query: string) => Promise<any>
    actionCreateCategory: (data: any) => Promise<any>
    actionCreateBrand: (data: any) => Promise<any>
    actionGenerateNextBarcode: () => Promise<any>
}

const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("all") || lower.includes("tous")) {
        return <LayoutGrid className="h-3.5 w-3.5 text-indigo-400 shrink-0 transition-transform group-hover:rotate-12" />
    }
    if (lower.includes("electr") || lower.includes("phone") || lower.includes("pc") || lower.includes("laptop")) {
        return <Store className="h-3.5 w-3.5 text-sky-400 shrink-0 transition-transform group-hover:scale-110" />
    }
    if (lower.includes("soft") || lower.includes("logiciel") || lower.includes("dev")) {
        return <Wand2 className="h-3.5 w-3.5 mr-1.5 text-purple-400 shrink-0 transition-transform group-hover:scale-110" />
    }
    if (lower.includes("promo") || lower.includes("solde") || lower.includes("percent")) {
        return <Percent className="h-3.5 w-3.5 text-rose-400 shrink-0 transition-transform group-hover:scale-110" />
    }
    return <Package className="h-3.5 w-3.5 text-indigo-400 shrink-0 transition-transform group-hover:scale-110" />
}

const getCategoryActiveStyle = (index: number) => {
    const gradients = [
        "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-[0_4px_16px_rgba(99,102,241,0.25)] dark:shadow-[0_4px_16px_rgba(99,102,241,0.15)] hover:from-indigo-600 hover:to-violet-600 dark:hover:from-indigo-500 dark:hover:to-violet-500",
        "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-[0_4px_16px_rgba(16,185,129,0.25)] dark:shadow-[0_4px_16px_rgba(16,185,129,0.15)] hover:from-emerald-600 hover:to-teal-600 dark:hover:from-emerald-500 dark:hover:to-emerald-500",
        "bg-gradient-to-r from-sky-600 to-blue-600 text-white border-transparent shadow-[0_4px_16px_rgba(56,189,248,0.25)] dark:shadow-[0_4px_16px_rgba(56,189,248,0.15)] hover:from-sky-600 hover:to-blue-600 dark:hover:from-sky-500 dark:hover:to-blue-500",
        "bg-gradient-to-r from-rose-600 to-pink-600 text-white border-transparent shadow-[0_4px_16px_rgba(244,63,94,0.25)] dark:shadow-[0_4px_16px_rgba(244,63,94,0.15)] hover:from-rose-600 hover:to-pink-600 dark:hover:from-rose-500 dark:hover:to-pink-500",
        "bg-gradient-to-r from-amber-600 to-orange-600 text-white border-transparent shadow-[0_4px_16px_rgba(245,158,11,0.25)] dark:shadow-[0_4px_16px_rgba(245,158,11,0.15)] hover:from-amber-600 hover:to-orange-600 dark:hover:from-amber-500 dark:hover:to-amber-500"
    ];
    return gradients[index % gradients.length];
}

export const PosClient: FC<PosClientProps> = ({
    storeName = "SYNCLOUDPOS",
    storeAddress,
    storePhone,
    products,
    categories,
    brands = [],
    customers = [],
    accounts = [],
    posTimbreEnabled = false,
    storeData,
    isElectronicsStore = false,
    sellers = [],
    currentUserId,
    actionCreateOrder,
    actionGetProductCustomerSellHistory,
    actionSendWhatsAppReceipt,
    actionCreateCustomer,
    actionGetActivePromotions,
    actionGetSalesOrderByReceipt,
    actionSearchRecentSalesOrders,
    actionCreateProduct,
    actionSuggestProductNames,
    actionCreateCategory,
    actionCreateBrand,
    actionGenerateNextBarcode
}) => {
    const t = useTranslations("PosClient")
    const tCommon = useTranslations("Common")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [isSearchOrderOpen, setIsSearchOrderOpen] = useState(false)
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
    const [posUiSize, setPosUiSize] = useState<"sm" | "md" | "lg">("md")
    const [page, setPage] = useState(1)
    const pageSize = 60
    
    // Product details state for list view
    const [selectedProductForInfo, setSelectedProductForInfo] = useState<any | null>(null)

    // Keyboard navigation and image preview states
    const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1)
    const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
    
    // Category bar scrolling ref and function
    const categoryScrollRef = useRef<HTMLDivElement>(null)
    const scrollCategories = (direction: "left" | "right") => {
        if (categoryScrollRef.current) {
            const scrollAmount = 240
            categoryScrollRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            })
        }
    }
    
    // Premium POS - Full Fiche Produit Express states
    const [quickProductOpen, setQuickProductOpen] = useState(false)
    const [quickTab, setQuickTab] = useState<"general" | "pricing" | "barcodes" | "stock">("general")
    const [quickName, setQuickName] = useState("")
    const [quickSuggestions, setQuickSuggestions] = useState<string[]>([])
    const [showQuickSuggestions, setShowQuickSuggestions] = useState(false)
    const [focusedQuickSuggestionIndex, setFocusedQuickSuggestionIndex] = useState(-1)
    const [quickDescription, setQuickDescription] = useState("")
    const [quickCategoryId, setQuickCategoryId] = useState(categories[0]?.id || "")
    const [quickBrandId, setQuickBrandId] = useState(brands[0]?.id || "")
    const [quickCost, setQuickCost] = useState(0)
    const [quickPrice, setQuickPrice] = useState(0)
    const [quickWholesalePrice, setQuickWholesalePrice] = useState(0)
    const [quickDealerPrice, setQuickDealerPrice] = useState(0)
    const [quickTva, setQuickTva] = useState(0)
    const [quickBarcodes, setQuickBarcodes] = useState<{ value: string; label: string }[]>([])
    const [quickImages, setQuickImages] = useState<{ url: string }[]>([])
    const [quickStock, setQuickStock] = useState(0)
    const [quickMinStock, setQuickMinStock] = useState(0)
    const [quickIsFeatured, setQuickIsFeatured] = useState(false)
    const [quickIsArchived, setQuickIsArchived] = useState(false)
    
    // Inline creation states
    const [localCategories, setLocalCategories] = useState(categories)
    const [localBrands, setLocalBrands] = useState(brands)
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")
    const [creatingCat, setCreatingCat] = useState(false)
    const [showNewBrandInput, setShowNewBrandInput] = useState(false)
    const [newBrandName, setNewBrandName] = useState("")
    const [creatingBrand, setCreatingBrand] = useState(false)

    // Shortcuts state
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

    // Sync categories and brands
    useEffect(() => {
        setLocalCategories(categories)
        if (categories.length > 0 && !quickCategoryId) {
            setQuickCategoryId(categories[0].id)
        }
    }, [categories])

    useEffect(() => {
        setLocalBrands(brands)
        if (brands.length > 0 && !quickBrandId) {
            setQuickBrandId(brands[0].id)
        }
    }, [brands])

    // Fiche Produit Express helper functions
    const handleQuickCostChange = (val: number) => {
        setQuickCost(val)
        if (val > 0) {
            setQuickPrice(Number((val * 1.30).toFixed(2)))
            setQuickWholesalePrice(Number((val * 1.15).toFixed(2)))
            setQuickDealerPrice(Number((val * 1.20).toFixed(2)))
        } else {
            setQuickPrice(0)
            setQuickWholesalePrice(0)
            setQuickDealerPrice(0)
        }
    }

    const handleGenerateQuickBarcode = async () => {
        try {
            const res = await actionGenerateNextBarcode()
            if (res.success && res.barcode) {
                setQuickBarcodes(prev => [...prev, { value: res.barcode, label: "Principal" }])
                toast.success("Code-barre généré !")
            } else {
                toast.error("Erreur de génération.")
            }
        } catch {
            toast.error("Erreur lors de la génération.")
        }
    }

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return
        try {
            setCreatingCat(true)
            const result = await actionCreateCategory({ name: newCategoryName.trim() })
            if (result.error) {
                toast.error(result.error)
            } else if (result.data) {
                toast.success("Catégorie créée avec succès !")
                setLocalCategories(prev => [...prev, result.data])
                setQuickCategoryId(result.data.id)
                setShowNewCategoryInput(false)
            }
        } catch {
            toast.error("Erreur de création de la catégorie")
        } finally {
            setCreatingCat(false)
        }
    }

    const handleCreateBrand = async () => {
        if (!newBrandName.trim()) return
        try {
            setCreatingBrand(true)
            const result = await actionCreateBrand({ name: newBrandName.trim() })
            if (result.error) {
                toast.error(result.error)
            } else if (result.data) {
                toast.success("Marque créée avec succès !")
                setLocalBrands(prev => [...prev, result.data])
                setQuickBrandId(result.data.id)
                setShowNewBrandInput(false)
            }
        } catch {
            toast.error("Erreur de création de la marque")
        } finally {
            setCreatingBrand(false)
        }
    }

    // Local products state inside PosClient so newly created products are instantly added and rendered!
    const [localProducts, setLocalProducts] = useState(products)
    
    // Sync local products with props changes
    useEffect(() => {
        setLocalProducts(products)
    }, [products])

    // Lock body scrolling when POS is mounted to prevent layout shift and keep categories sticky
    useEffect(() => {
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [])



    const handleCreateQuickProduct = async () => {
        if (!quickName.trim() || !quickCategoryId || !quickBrandId) {
            toast.error("Veuillez remplir les champs obligatoires (*)")
            return
        }
        try {
            const payload = {
                name: quickName,
                description: quickDescription || "",
                price: quickPrice || 0,
                cost: quickCost || 0,
                wholesalePrice: quickWholesalePrice || 0,
                dealerPrice: quickDealerPrice || 0,
                categoryId: quickCategoryId,
                brandId: quickBrandId,
                tvaRate: quickTva,
                images: quickImages.map(img => ({ url: img.url })),
                stock: quickStock || 0,
                minStock: quickMinStock || 0,
                isFeatured: quickIsFeatured,
                isArchived: quickIsArchived,
                barcodes: quickBarcodes.map(b => ({ value: b.value, label: b.label || "" }))
            }
            const result = await actionCreateProduct(payload)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Produit créé et ajouté au panier !")
                const newProduct = result.product
                if (newProduct) {
                    // Derive formatted product
                    const derivedProduct = {
                        id: newProduct.id,
                        name: newProduct.name,
                        description: newProduct.description || "",
                        price: Number(newProduct.price),
                        cost: Number(newProduct.cost || 0),
                        stock: quickStock,
                        minStock: quickMinStock,
                        category: localCategories.find(c => c.id === quickCategoryId)?.name || "Non Classé",
                        categoryId: quickCategoryId,
                        wholesalePrice: Number(newProduct.wholesalePrice || newProduct.price),
                        dealerPrice: Number(newProduct.dealerPrice || newProduct.price),
                        tvaRate: storeData?.tvaEnabled ? Number(newProduct.tvaRate ?? 0) : 0,
                        imageUrl: newProduct.images?.[0]?.url || "",
                        isFeatured: newProduct.isFeatured || false,
                        barcodes: newProduct.barcodes?.map((b: any) => b.value) || []
                    }

                    // 1. Add to localProducts state immediately so grid/list render it
                    setLocalProducts(prev => [derivedProduct, ...prev])

                    // 2. Add to active cart session!
                    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId)
                    const cType = activeSession?.clientType || 'RETAIL'
                    let currentPrice = derivedProduct.price
                    if (cType === 'RESELLER' && derivedProduct.dealerPrice != null) currentPrice = derivedProduct.dealerPrice
                    if (cType === 'WHOLESALE' && derivedProduct.wholesalePrice != null) currentPrice = derivedProduct.wholesalePrice

                    cart.addItem({
                        id: derivedProduct.id,
                        productId: derivedProduct.id,
                        name: derivedProduct.name,
                        price: currentPrice,
                        retailPrice: derivedProduct.price,
                        wholesalePrice: derivedProduct.wholesalePrice,
                        dealerPrice: derivedProduct.dealerPrice,
                        cost: derivedProduct.cost,
                        tvaRate: derivedProduct.tvaRate,
                        priceHt: currentPrice / (1 + (derivedProduct.tvaRate ?? 0) / 100),
                        quantity: 1,
                        image: derivedProduct.imageUrl
                    })
                }
                setQuickProductOpen(false)
            }
        } catch (err) {
            toast.error("Erreur de création du produit.")
        }
    }

    const cart = usePosStore()
    const isElectronics = cart.forceElectronicsMode || isElectronicsStore || storeData?.isElectronics || storeData?.name?.toLowerCase().includes("electr") || false;

    // Load favorites-only preference from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem("pos_defaults_prefs")
            if (stored) {
                const prefs = JSON.parse(stored)
                if (prefs.showFavoritesOnly) setShowFavoritesOnly(true)
            }
        } catch { }
    }, [])

    // Reset page on search or filter changes
    useEffect(() => {
        setPage(1)
    }, [searchQuery, selectedCategory, showFavoritesOnly])

    // Derived cart values for mobile bottom bar
    const activeSessionId = cart.activeSessionId
    const activeSession = cart.sessions.find(s => s.id === activeSessionId)
    const clientType = activeSession?.clientType || 'RETAIL'
    const blockNegativeStock = storeData?.blockNegativeStock ?? false
    const items = activeSession?.items || []
    const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)
    const totalItemsCount = items.reduce((total, item) => total + item.quantity, 0)

    // Auto-select "DIVERS" customer if none is selected
    useEffect(() => {
        if (activeSession && !activeSession.customerId) {
            const diversCustomer = customers.find(c => c.name.toUpperCase() === "DIVERS")
            if (diversCustomer) {
                cart.setCustomer(diversCustomer.id, diversCustomer.name)
            }
        }
    }, [activeSessionId, activeSession?.customerId, customers, cart])

    // Global POS Shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const isInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";

            if (e.key === "Escape") {
                if (isSearchOrderOpen) setIsSearchOrderOpen(false);
                if (quickProductOpen) setQuickProductOpen(false);
                if (isShortcutsOpen) setIsShortcutsOpen(false);
                if (searchQuery) setSearchQuery("");
                return;
            }

            if (isInput) return;

            if (e.key === "F1") {
                e.preventDefault();
                const sessions = cart.sessions;
                if (sessions.length > 0) {
                    const currentIndex = sessions.findIndex(s => s.id === cart.activeSessionId);
                    const nextIndex = (currentIndex + 1) % sessions.length;
                    cart.setActiveSession(sessions[nextIndex].id);
                    toast.success(`Panier actif : ${sessions[nextIndex].name || 'Commande ' + (nextIndex + 1)}`);
                }
                return;
            } else if (e.key === "F2") {
                e.preventDefault();
                setQuickName("");
                setQuickDescription("");
                setQuickCost(0);
                setQuickPrice(0);
                setQuickWholesalePrice(0);
                setQuickDealerPrice(0);
                setQuickTva(0);
                setQuickBarcodes([]);
                setQuickImages([]);
                setQuickStock(0);
                setQuickMinStock(0);
                setQuickIsFeatured(false);
                setQuickIsArchived(false);
                setQuickCategoryId(categories[0]?.id || "");
                setQuickBrandId(brands[0]?.id || "");
                setQuickTab("general");
                setQuickProductOpen(true);
                return;
            } else if (e.key === "F6") {
                e.preventDefault();
                // Cycle through categories: null -> cat[0] -> cat[1] -> ... -> null
                const allCatIds = [null, ...categories.map(c => c.id)];
                const currentIdx = allCatIds.indexOf(selectedCategory);
                const nextIdx = (currentIdx + 1) % allCatIds.length;
                setSelectedCategory(allCatIds[nextIdx]);
                const nextName = allCatIds[nextIdx] === null ? 'Toutes' : categories.find(c => c.id === allCatIds[nextIdx])?.name || '';
                toast.success(`Catégorie: ${nextName}`, { id: 'cat-switch' });
                return;
            } else if (e.key === "F5") {
                e.preventDefault();
                setSelectedCategory(null);
                toast.success('Catégorie: Toutes', { id: 'cat-switch' });
                return;
            } else if (e.key === "F9" || e.key === " ") {
                e.preventDefault();
                const checkoutButton = document.getElementById("checkout-button");
                if (checkoutButton && !checkoutButton.hasAttribute("disabled")) {
                    checkoutButton.click();
                }
            } else if (e.key === "F4" || e.key.toLowerCase() === "f") {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="Rechercher"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
            } else if (e.key === "PageDown") {
                e.preventDefault();
                setPage(p => p + 1);
            } else if (e.key === "PageUp") {
                e.preventDefault();
                setPage(p => Math.max(1, p - 1));
            } else if (e.key === "?" || e.key.toLowerCase() === "h") {
                e.preventDefault();
                setIsShortcutsOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isSearchOrderOpen, quickProductOpen, isShortcutsOpen, searchQuery, cart, categories, brands, selectedCategory, localProducts.length, pageSize]);

    const handleLoadOrder = (order: any) => {
        setIsSearchOrderOpen(false)
        cart.createSession()
        const newSessionId = usePosStore.getState().activeSessionId
        cart.updateSessionName(newSessionId, `Extracted ${order.receiptNumber}`)
        cart.setOriginalOrder(order.id, order.receiptNumber)

        // Set Customer if exists
        if (order.customer) {
            cart.setCustomer(order.customer.id, order.customer.name)
        }

        // Add all items
        for (const item of order.items) {
            cart.addItem({
                id: isElectronics ? item.id : item.productId, // Use database item ID in electronics mode to preserve exact rows, otherwise productId to merge duplicates
                productId: item.productId,
                name: item.product.name,
                price: Number(item.unitPrice), // Keep historical order unit price
                retailPrice: Number(item.unitPrice),
                cost: Number(item.product.cost || 0),
                tvaRate: storeData?.tvaEnabled ? Number(item.tvaRate ?? 0) : 0,
                priceHt: Number(item.priceHt || item.unitPrice),
                quantity: item.quantity,
                image: item.product.images?.[0]?.url,
                serialNumber: item.serialNumber || "",
                skipSplit: true
            })
        }

        toast.success(`Loaded order: ${order.receiptNumber}`)
    }

    const handleCodeInput = async (code: string) => {
        // 1. Check if it's an Order Receipt (e.g. BL-2026/0001, FA-2026/...)
        if (code.includes("-") && code.includes("/")) {
            const order = await actionGetSalesOrderByReceipt(code)
            if (order) {
                cart.createSession()
                const newSessionId = usePosStore.getState().activeSessionId
                cart.updateSessionName(newSessionId, `Extracted ${code}`)
                cart.setOriginalOrder(order.id, order.receiptNumber)

                // Set Customer if exists
                if (order.customer) {
                    cart.setCustomer(order.customer.id, order.customer.name)
                }

                // Add all items
                for (const item of order.items) {
                    cart.addItem({
                        id: isElectronics ? item.id : item.productId, // Use database item ID in electronics mode to preserve exact rows, otherwise productId to merge duplicates
                        productId: item.productId,
                        name: item.product.name,
                        price: Number(item.unitPrice),
                        retailPrice: Number(item.unitPrice),
                        cost: Number(item.product.cost || 0),
                        quantity: item.quantity,
                        image: item.product.images?.[0]?.url,
                        serialNumber: item.serialNumber || "",
                        skipSplit: true
                    })
                }

                toast.success(`Loaded order: ${code}`)
                setSearchQuery("")
                return
            }
        }

        // 2. Check if Weight/Price Scale Barcode (EAN-13 starting with 2)
        if (code.length === 13 && code.startsWith("2")) {
            for (const p of localProducts) {
                const prefixMatch = p.barcodes.find(b => code.startsWith(b) && b.length >= 4 && b.length <= 7);
                if (prefixMatch) {
                    const safeDataPart = code.substring(7, 12);
                    const parsedQuantity = parseInt(safeDataPart, 10) / 1000;

                    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);
                    const cType = activeSession?.clientType || 'RETAIL';
                    let currentPrice = p.price;
                    if (cType === 'RESELLER' && p.dealerPrice != null) currentPrice = p.dealerPrice;
                    if (cType === 'WHOLESALE' && p.wholesalePrice != null) currentPrice = p.wholesalePrice;

                    cart.addItem({
                        id: p.id,
                        productId: p.id,
                        name: p.name,
                        price: currentPrice,
                        retailPrice: p.price,
                        wholesalePrice: p.wholesalePrice,
                        dealerPrice: p.dealerPrice,
                        cost: p.cost,
                        tvaRate: p.tvaRate,
                        priceHt: currentPrice / (1 + (p.tvaRate ?? 0) / 100),
                        quantity: parsedQuantity,
                        image: p.imageUrl
                    });
                    toast.success(`Ajouté ${p.name} (${parsedQuantity} kg) au panier`);
                    setSearchQuery("");
                    return;
                }
            }
        }

        // 3. Check if barcode belongs to a customer
        const customer = customers.find(c => c.barcode === code)
        if (customer) {
            cart.setCustomer(customer.id, customer.name)
            toast.success(`Selected customer: ${customer.name}`)
            setSearchQuery("")
            return
        }

        // 3. Otherwise, assume it's a product barcode
        const product = localProducts.find(p => p.barcodes.includes(code))
        if (product) {
            const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);
            const cType = activeSession?.clientType || 'RETAIL';
            let currentPrice = product.price;
            if (cType === 'RESELLER' && product.dealerPrice != null) currentPrice = product.dealerPrice;
            if (cType === 'WHOLESALE' && product.wholesalePrice != null) currentPrice = product.wholesalePrice;

            cart.addItem({
                id: product.id,
                productId: product.id,
                name: product.name,
                price: currentPrice,
                retailPrice: product.price,
                wholesalePrice: product.wholesalePrice,
                dealerPrice: product.dealerPrice,
                cost: product.cost,
                tvaRate: product.tvaRate,
                priceHt: currentPrice / (1 + (product.tvaRate ?? 0) / 100),
                quantity: 1,
                image: product.imageUrl
            })
            toast.success(`Added ${product.name} to cart`)
            setSearchQuery("") // reset so they can scan the next
        } else {
            toast.error(`Barcode not found (Code: ${code})`)
        }
    }

    const onScan = (code: string) => {
        handleCodeInput(code)
    }

    useBarcodeScanner(onScan)

    const filteredProducts = useMemo(() => {
        // Simple fuzzy matching function
        const fuzzyMatch = (text: string, query: string) => {
            const pattern = query.toLowerCase().split('').join('.*?');
            return new RegExp(`^.*?${pattern}.*?$`, 'i').test(text);
        };

        const result = localProducts.filter(item => {
            // 1. Search Query Filter
            if (searchQuery) {
                const matchesText = searchQuery.length <= 2
                    ? fuzzyMatch(item.name.toLowerCase(), searchQuery) ||
                      fuzzyMatch(item.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''), searchQuery) ||
                      item.barcodes.some(b => b.startsWith(searchQuery))
                    : item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.barcodes.some(b => b.includes(searchQuery));
                if (!matchesText) return false;
            }

            // 2. Category Filter
            if (selectedCategory && item.categoryId !== selectedCategory) {
                return false;
            }

            // 3. Favorites Filter
            if (showFavoritesOnly && !item.isFeatured) {
                return false;
            }

            return true;
        });

        console.log(`[POS Category Filter] Selected Category ID: "${selectedCategory}". Filtered products count: ${result.length}/${localProducts.length}`);

        return result.sort((a, b) => {
            // 1. Beginning matches first
            if (searchQuery) {
                const aMatchStart = a.name.toLowerCase().indexOf(searchQuery.toLowerCase()) === 0;
                const bMatchStart = b.name.toLowerCase().indexOf(searchQuery.toLowerCase()) === 0;
                if (aMatchStart && !bMatchStart) return -1;
                if (bMatchStart && !aMatchStart) return 1;
            }

            // 2. Then by category
            if (selectedCategory) {
                const aInCategory = a.categoryId === selectedCategory;
                const bInCategory = b.categoryId === selectedCategory;
                if (aInCategory && !bInCategory) return -1;
                if (bInCategory && !aInCategory) return 1;
            }

            // 3. Then favorited
            if (showFavoritesOnly) {
                const aFavorited = a.isFeatured;
                const bFavorited = b.isFeatured;
                if (aFavorited && !bFavorited) return -1;
                if (bFavorited && !aFavorited) return 1;
            }

            // 4. Alphabetical
            return a.name.localeCompare(b.name);
        });
    }, [localProducts, searchQuery, selectedCategory, showFavoritesOnly]);

    const totalFiltered = filteredProducts.length
    const totalPages = Math.ceil(totalFiltered / pageSize)
    const currentPage = Math.max(1, Math.min(page, totalPages || 1))
    const renderedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const [sidebarWidth, setSidebarWidth] = useState<'narrow' | 'standard' | 'wide'>('standard');

    // Scroll categories horizontally with mouse wheel
    const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (categoryScrollRef.current) {
            categoryScrollRef.current.scrollLeft += e.deltaY;
        }
    }

    const lastScrollPageChange = useRef<number>(0);

    const handleProductsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const viewport = e.currentTarget.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
        if (!viewport) return;

        const now = Date.now();
        if (now - lastScrollPageChange.current < 800) return; // 800ms cooldown

        const isScrollDown = e.deltaY > 0;
        const isScrollUp = e.deltaY < 0;
        const canScroll = viewport.scrollHeight > viewport.clientHeight;

        if (isScrollDown) {
            // Check if user is at the bottom of the scroll container
            const isAtBottom = canScroll && Math.abs(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop) < 15;
            if (isAtBottom && currentPage < totalPages) {
                lastScrollPageChange.current = now;
                setPage(p => p + 1);
                toast.success(`Page ${currentPage + 1} / ${totalPages}`, { id: 'pos-page-change', duration: 1000 });
                // Reset scroll position to top for the next page
                setTimeout(() => {
                    if (viewport) viewport.scrollTop = 0;
                }, 50);
            }
        } else if (isScrollUp) {
            // Check if user is at the top of the scroll container
            const isAtTop = canScroll && viewport.scrollTop <= 2;
            if (isAtTop && currentPage > 1) {
                lastScrollPageChange.current = now;
                setPage(p => p - 1);
                toast.success(`Page ${currentPage - 1} / ${totalPages}`, { id: 'pos-page-change', duration: 1000 });
                // Reset scroll position to bottom for the previous page
                setTimeout(() => {
                    if (viewport) viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight - 15;
                }, 50);
            }
        }
    };

    // Keyboard navigation functionality
    const getColumnsCount = () => {
        const gridEl = document.querySelector(".pos-products-grid");
        if (gridEl) {
            const computedStyle = window.getComputedStyle(gridEl);
            const gridTemplateColumns = computedStyle.getPropertyValue("grid-template-columns");
            const cols = gridTemplateColumns.split(" ").filter(Boolean);
            return cols.length;
        }
        return 4;
    };

    // Reset focused index when query/category changes
    useEffect(() => {
        setFocusedProductIndex(-1);
    }, [searchQuery, selectedCategory]);

    // Scroll list item into view when focused in list view
    useEffect(() => {
        if (viewMode === "list" && focusedProductIndex !== -1 && itemRefs.current[focusedProductIndex]) {
            scrollIntoViewSafe(itemRefs.current[focusedProductIndex]);
        }
    }, [focusedProductIndex, viewMode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if any modal/dialog is open
            if (quickProductOpen || isSearchOrderOpen || selectedProductForInfo || isShortcutsOpen) {
                return;
            }

            const openModals = document.querySelectorAll('[role="dialog"], [role="menu"]');
            if (openModals.length > 0) {
                return;
            }

            // Check if user is typing in a text input (excluding the search input)
            const activeEl = document.activeElement;
            const isSearchInput = activeEl && activeEl.classList.contains("pos-search-input");
            const isOtherInputFocused = activeEl && !isSearchInput && (
                activeEl.tagName === "INPUT" || 
                activeEl.tagName === "TEXTAREA" || 
                activeEl.getAttribute("contenteditable") === "true"
            );

            if (isOtherInputFocused) {
                return;
            }

            const itemsCount = renderedProducts.length;
            if (itemsCount === 0) return;

            const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);

            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (viewMode === "grid") {
                    const cols = getColumnsCount();
                    setFocusedProductIndex(prev => {
                        if (prev === -1) return 0;
                        const next = prev + cols;
                        return next < itemsCount ? next : prev;
                    });
                } else {
                    setFocusedProductIndex(prev => (prev === -1 ? 0 : Math.min(itemsCount - 1, prev + 1)));
                }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (viewMode === "grid") {
                    const cols = getColumnsCount();
                    setFocusedProductIndex(prev => {
                        if (prev === -1) return 0;
                        const next = prev - cols;
                        return next >= 0 ? next : prev;
                    });
                } else {
                    setFocusedProductIndex(prev => (prev === -1 ? 0 : Math.max(0, prev - 1)));
                }
            } else if (e.key === "ArrowRight") {
                if (viewMode === "grid") {
                    e.preventDefault();
                    setFocusedProductIndex(prev => (prev === -1 ? 0 : Math.min(itemsCount - 1, prev + 1)));
                }
            } else if (e.key === "ArrowLeft") {
                if (viewMode === "grid") {
                    e.preventDefault();
                    setFocusedProductIndex(prev => (prev === -1 ? 0 : Math.max(0, prev - 1)));
                }
            } else if (e.key === "Enter") {
                if (focusedProductIndex !== -1 && focusedProductIndex < itemsCount) {
                    const targetProduct = renderedProducts[focusedProductIndex];
                    const quantityInCart = activeSession?.items.find(item => item.productId === targetProduct.id)?.quantity || 0;
                    const outOfStock = (storeData?.blockNegativeStock) && (targetProduct.stock - quantityInCart) <= 0;

                    if (outOfStock) {
                        toast.error("Cet article est en rupture de stock.");
                        return;
                    }

                    e.preventDefault();
                    e.stopPropagation();

                    const cType = activeSession?.clientType || 'RETAIL';
                    let currentPrice = targetProduct.price;
                    if (cType === 'RESELLER' && targetProduct.dealerPrice != null) currentPrice = targetProduct.dealerPrice;
                    if (cType === 'WHOLESALE' && targetProduct.wholesalePrice != null) currentPrice = targetProduct.wholesalePrice;

                    cart.addItem({
                        id: targetProduct.id,
                        productId: targetProduct.id,
                        name: targetProduct.name,
                        price: currentPrice,
                        retailPrice: targetProduct.price,
                        wholesalePrice: targetProduct.wholesalePrice,
                        dealerPrice: targetProduct.dealerPrice,
                        cost: targetProduct.cost,
                        tvaRate: targetProduct.tvaRate,
                        priceHt: currentPrice / (1 + (targetProduct.tvaRate ?? 0) / 100),
                        quantity: 1,
                        image: targetProduct.imageUrl
                    });

                    toast.success(`${targetProduct.name} ajouté au panier !`, { id: 'added-to-cart' });
                }
            } else if (e.key === "Escape") {
                setFocusedProductIndex(-1);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [focusedProductIndex, renderedProducts, viewMode, quickProductOpen, isSearchOrderOpen, selectedProductForInfo, isShortcutsOpen, cart.activeSessionId, storeData]);

    return (
        <div className="flex h-[100dvh] flex-col bg-[#f8f9fa] dark:bg-[#0f1115] overflow-hidden">
            <PosHeader storeName={storeName} />
            
            {/* Multi-Session Hold Carts Bar */}
            <div className="flex items-center justify-between px-6 py-2 bg-[#1b1c21] dark:bg-[#131418] border-b border-gray-800 shrink-0 select-none overflow-x-auto scrollbar-none h-11">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                    {cart.sessions.map((session, index) => {
                        const isActive = session.id === cart.activeSessionId;
                        const sessionItemsCount = session.items.reduce((total, item) => total + item.quantity, 0);
                        const sessionTotal = session.items.reduce((total, item) => total + (item.price * item.quantity), 0);
                        
                        return (
                            <div
                                key={session.id}
                                onClick={() => cart.setActiveSession(session.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 border",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                                        : "bg-gray-800/40 text-gray-400 border-transparent hover:bg-gray-800/80 hover:text-gray-300"
                                )}
                            >
                                <span className="font-mono text-[10px] text-gray-500">#{index + 1}</span>
                                <span>{session.name || `Panier ${index + 1}`}</span>
                                
                                {sessionItemsCount > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-tight",
                                        isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-700 text-gray-400"
                                    )}>
                                        {sessionItemsCount}
                                    </span>
                                )}
                                
                                <span className="font-extrabold text-[10px] tracking-tight pl-1 border-l border-gray-700/50">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(sessionTotal)} DA
                                </span>

                                {cart.sessions.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            cart.removeSession(session.id);
                                            toast.success("Panier supprimé/fermé");
                                        }}
                                        className="text-gray-500 hover:text-red-400 ml-1.5 transition-colors p-0.5 rounded hover:bg-gray-700/50"
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            cart.createSession();
                            toast.success("Nouveau panier créé !");
                        }}
                        className="h-7 w-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-0 flex items-center justify-center transition-all"
                        title="Nouveau Panier (Hold) [F1]"
                    >
                        <PlusCircle size={14} />
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">

                {/* Mobile Cart Drawer */}
                <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
                    <SheetContent side="bottom" className="h-[90vh] p-0 w-full sm:max-w-md mx-auto rounded-t-3xl overflow-hidden flex flex-col border-none bg-white dark:bg-[#18181b] z-[100]">
                        <div className="sr-only">
                            <SheetTitle>{t("cartTitle")}</SheetTitle>
                            <SheetDescription>{t("cartDescription")}</SheetDescription>
                        </div>
                        <div className="flex-1 w-full h-[calc(100%-2rem)] flex flex-col pt-2">
                            {/* Draggable indicator line */}
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto my-2 flex-shrink-0" />
                            <CartSidebar
                                customers={customers}
                                accounts={accounts}
                                storeName={storeName}
                                storeAddress={storeAddress}
                                storePhone={storePhone}
                                posTimbreEnabled={posTimbreEnabled}
                                storeData={storeData}
                                isElectronicsStore={isElectronicsStore}
                                sellers={sellers}
                                currentUserId={currentUserId}
                                actionCreateOrder={actionCreateOrder}
                                actionGetProductCustomerSellHistory={actionGetProductCustomerSellHistory}
                                actionSendWhatsAppReceipt={actionSendWhatsAppReceipt}
                                actionCreateCustomer={actionCreateCustomer}
                                actionGetActivePromotions={actionGetActivePromotions}
                            />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Product Area - Right Side (Full width on mobile) */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-transparent w-full">

                    {/* Filter Bar */}
                    <div className="px-3 lg:px-6 py-2 lg:py-3 shrink-0 select-none">
                        <div className="flex items-center gap-2 lg:gap-3 max-w-7xl mx-auto w-full">
                            {/* Search bar input container */}
                            <div className="relative group flex-1 min-w-0">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors duration-200" />
                                <Input
                                    placeholder={t("searchPlaceholder")}
                                    className="pl-10 pr-4 h-11 w-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all rounded-xl text-xs lg:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 font-bold pos-search-input"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchQuery.trim() !== '') {
                                            handleCodeInput(searchQuery.trim())
                                        }
                                    }}
                                />
                            </div>

                            {/* Buttons and Action items */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Express creation button */}
                                <Button
                                    variant="outline"
                                    className="h-11 px-3 lg:px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30 shadow-sm gap-2 font-bold text-xs transition-all shrink-0"
                                    onClick={() => {
                                        setQuickName("");
                                        setQuickDescription("");
                                        setQuickCost(0);
                                        setQuickPrice(0);
                                        setQuickWholesalePrice(0);
                                        setQuickDealerPrice(0);
                                        setQuickTva(0);
                                        setQuickBarcodes([]);
                                        setQuickImages([]);
                                        setQuickStock(0);
                                        setQuickMinStock(0);
                                        setQuickIsFeatured(false);
                                        setQuickIsArchived(false);
                                        setQuickCategoryId(categories[0]?.id || "");
                                        setQuickBrandId(brands[0]?.id || "");
                                        setQuickTab("general");
                                        setQuickProductOpen(true);
                                    }}
                                    title="Article Express (F2)"
                                >
                                    <Tag className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span className="hidden md:inline lg:hidden xl:inline">Express</span>
                                </Button>

                                {/* Load Order button */}
                                <Button
                                    variant="outline"
                                    className="h-11 px-3 lg:px-4 rounded-xl bg-white dark:bg-[#1e293b] border-gray-200 dark:border-slate-800 shadow-sm gap-2 font-bold text-xs text-gray-700 dark:text-slate-200 shrink-0 hover:bg-gray-50 dark:hover:bg-slate-800"
                                    onClick={() => setIsSearchOrderOpen(true)}
                                    title="Charger Commande"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
                                    <span className="hidden md:inline lg:hidden xl:inline">{t("loadOrder")}</span>
                                </Button>

                                {/* Compact Actions Toolbar (icons only, super premium) */}
                                <div className="hidden md:flex h-11 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-800 rounded-xl p-0.5 shadow-sm gap-0.5 items-center shrink-0">
                                    <LanguageSwitcher />
                                    <ModeToggle />
                                    <div className="w-px bg-gray-200 dark:bg-slate-700 h-6 mx-0.5 rounded-full shrink-0"></div>
                                    
                                    {/* Keyboard shortcuts */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Raccourcis Clavier (H)"
                                        onClick={() => setIsShortcutsOpen(p => !p)}
                                        className={cn("w-9 h-9 rounded-lg transition-all shrink-0", isShortcutsOpen ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200")}
                                    >
                                        <Keyboard size={16} />
                                    </Button>

                                    <div className="w-px bg-gray-200 dark:bg-slate-700 h-6 mx-0.5 rounded-full shrink-0"></div>
                                    
                                    {/* Grid View */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode("grid")}
                                        className={cn("w-9 h-9 rounded-lg transition-all shrink-0", viewMode === "grid" ? "bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white" : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200")}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                                    </Button>

                                    {/* List View */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode("list")}
                                        className={cn("w-9 h-9 rounded-lg transition-all shrink-0", viewMode === "list" ? "bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white" : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200")}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
                                    </Button>

                                    <div className="w-px bg-gray-200 dark:bg-slate-700 h-6 mx-0.5 rounded-full shrink-0"></div>

                                    {/* Favorites filter */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Favoris seulement"
                                        onClick={() => setShowFavoritesOnly(p => !p)}
                                        className={cn("w-9 h-9 rounded-lg transition-all shrink-0", showFavoritesOnly ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200")}
                                    >
                                        <Star strokeWidth={showFavoritesOnly ? 0 : 2.5} fill={showFavoritesOnly ? "currentColor" : "none"} size={16} />
                                    </Button>

                                    {/* Images display switcher */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => cart.toggleImages()}
                                        className={cn("w-9 h-9 rounded-lg transition-all shrink-0", cart.showImages ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-200")}
                                    >
                                        <ImageIcon strokeWidth={cart.showImages ? 2.5 : 2} size={16} className={cn(!cart.showImages && "opacity-50")} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Selector Bar with Navigation Buttons - Always visible, sticky (F6 to cycle) */}
                    <div className="relative flex items-center w-full px-3 lg:px-6 shrink-0 select-none group/cat-bar bg-[#f8f9fa] dark:bg-[#0f1115] py-1.5 border-b border-gray-200/60 dark:border-slate-800/60 sticky top-0 z-30 backdrop-blur-md">
                        {/* Scroll Left Button */}
                        <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => scrollCategories("left")}
                            className="absolute left-4 z-20 h-7 w-7 rounded-full bg-white/95 dark:bg-[#1e293b]/95 border border-gray-200 dark:border-slate-800 shadow-md opacity-80 [@media(hover:hover)]:opacity-0 group-hover/cat-bar:opacity-100 transition-all duration-200 flex items-center justify-center hover:scale-105"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div 
                            ref={categoryScrollRef} 
                            onWheel={handleCategoryWheel}
                            className="w-full overflow-x-auto scrollbar-none whitespace-nowrap py-1 scroll-smooth"
                        >
                            <div className="flex gap-1.5 lg:gap-2 pb-1.5 px-1 w-max">
                                <Button
                                    variant={selectedCategory === null ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(null)}
                                    className={cn(
                                        "group rounded-full px-2.5 lg:px-4 h-7 lg:h-8 text-[10px] lg:text-xs font-bold transition-all border flex items-center gap-1.5 select-none hover:scale-[1.02] duration-200 shrink-0",
                                        selectedCategory === null 
                                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-[0_4px_12px_rgba(99,102,241,0.2)]" 
                                            : "bg-white hover:bg-slate-50 text-slate-500 border-slate-200/60 dark:bg-[#1e293b] dark:text-slate-400 dark:border-slate-800 dark:hover:bg-[#2e3b4e] dark:hover:text-white"
                                    )}
                                >
                                    <span className={cn("h-2 w-2 rounded-full shrink-0 transition-colors", selectedCategory === null ? "bg-white/80" : "bg-indigo-400")} />
                                    <span>{t("allCategories")}</span>
                                </Button>
                                {categories.map((category, index) => {
                                    const isActive = selectedCategory === category.id;
                                    const dotColors = [
                                        "bg-emerald-400", "bg-sky-400", "bg-rose-400", "bg-amber-400", "bg-purple-400",
                                        "bg-teal-400", "bg-pink-400", "bg-cyan-400", "bg-orange-400", "bg-lime-400"
                                    ];
                                    const dotColor = dotColors[(index) % dotColors.length];
                                    return (
                                        <Button
                                            key={category.id}
                                            variant={isActive ? "default" : "outline"}
                                            onClick={() => setSelectedCategory(category.id)}
                                            className={cn(
                                                "group rounded-full px-2.5 lg:px-4 h-7 lg:h-8 text-[10px] lg:text-xs font-bold transition-all border flex items-center gap-1.5 select-none hover:scale-[1.02] duration-200 shrink-0",
                                                isActive 
                                                    ? getCategoryActiveStyle(index + 1)
                                                    : "bg-white hover:bg-slate-50 text-slate-500 border-slate-200/60 dark:bg-[#1e293b] dark:text-slate-400 dark:border-slate-800 dark:hover:bg-[#2e3b4e] dark:hover:text-white"
                                            )}
                                        >
                                            <span className={cn("h-2 w-2 rounded-full shrink-0 transition-all", isActive ? "bg-white/80 scale-110" : dotColor)} />
                                            <span>{category.name}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Scroll Right Button */}
                        <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => scrollCategories("right")}
                            className="absolute right-4 z-20 h-7 w-7 rounded-full bg-white/95 dark:bg-[#1e293b]/95 border border-gray-200 dark:border-slate-800 shadow-md opacity-80 [@media(hover:hover)]:opacity-0 group-hover/cat-bar:opacity-100 transition-all duration-200 flex items-center justify-center hover:scale-105"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        {/* F6 shortcut hint */}
                        <span className="hidden lg:flex items-center gap-1 ml-1 shrink-0">
                            <kbd className="px-1.5 py-0.5 text-[8px] font-black bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400 dark:text-slate-500 font-mono">F6</kbd>
                        </span>
                    </div>

                    {/* Content Area (Grid or List) */}
                    <ScrollArea 
                        className="flex-1 min-h-0 px-3 lg:px-6 pt-2 pb-20 lg:pb-6"
                        onWheel={handleProductsWheel}
                    >
                        {viewMode === "grid" ? (
                            <div className={cn(
                                "grid gap-2.5 lg:gap-3 pb-8 pos-products-grid",
                                posUiSize === "sm" ? (
                                    sidebarWidth === 'wide'
                                        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 min-[1800px]:grid-cols-8"
                                        : sidebarWidth === 'narrow'
                                        ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 min-[1800px]:grid-cols-10"
                                        : "grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 min-[1800px]:grid-cols-9"
                                ) : posUiSize === "lg" ? (
                                    sidebarWidth === 'wide'
                                        ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6"
                                        : sidebarWidth === 'narrow'
                                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 min-[1800px]:grid-cols-8"
                                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7"
                                ) : (
                                    sidebarWidth === 'wide' 
                                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7"
                                        : sidebarWidth === 'narrow'
                                        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 min-[1800px]:grid-cols-9"
                                        : "grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 min-[1800px]:grid-cols-8"
                                )
                            )}>
                                {renderedProducts.map((product, index) => (
                                    <ProductCard 
                                        key={product.id} 
                                        data={product} 
                                        blockNegativeStock={storeData?.blockNegativeStock ?? false} 
                                        isFocused={focusedProductIndex === index}
                                        posUiSize={posUiSize}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 pb-8 max-w-4xl mx-auto">
                                {renderedProducts.map((product, index) => {
                                    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);
                                    const quantityInCart = activeSession?.items.find(item => item.productId === product.id)?.quantity || 0;
                                    const outOfStock = (storeData?.blockNegativeStock) && (product.stock - quantityInCart) <= 0;

                                    return (
                                        <div
                                            key={product.id}
                                            ref={el => { itemRefs.current[index] = el; }}
                                            onClick={() => {
                                                if (outOfStock) {
                                                    toast.error("Cet article est en rupture de stock.");
                                                    return;
                                                }
                                                const cType = activeSession?.clientType || 'RETAIL';
                                                let currentPrice = product.price;
                                                if (cType === 'RESELLER' && product.dealerPrice != null) currentPrice = product.dealerPrice;
                                                if (cType === 'WHOLESALE' && product.wholesalePrice != null) currentPrice = product.wholesalePrice;

                                                cart.addItem({
                                                    id: product.id,
                                                    productId: product.id,
                                                    name: product.name,
                                                    price: currentPrice,
                                                    retailPrice: product.price,
                                                    wholesalePrice: product.wholesalePrice,
                                                    dealerPrice: product.dealerPrice,
                                                    cost: product.cost,
                                                    tvaRate: product.tvaRate,
                                                    priceHt: currentPrice / (1 + (product.tvaRate ?? 0) / 100),
                                                    quantity: 1,
                                                    image: product.imageUrl
                                                })
                                            }}
                                            className={cn(
                                                "flex items-center bg-white dark:bg-[#1e293b] border-2 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm cursor-pointer transition-all group relative overflow-hidden",
                                                posUiSize === "sm"
                                                    ? "p-1.5 lg:p-2 gap-2 lg:gap-2.5 rounded-[12px] lg:rounded-[14px]"
                                                    : posUiSize === "lg"
                                                    ? "p-3.5 lg:p-4 gap-4 lg:gap-5 rounded-[20px] lg:rounded-[24px]"
                                                    : "p-2 lg:p-3 gap-3 lg:gap-4 rounded-[16px] lg:rounded-[20px]",
                                                outOfStock ? "opacity-50 cursor-not-allowed select-none bg-gray-50/20 dark:bg-slate-900/20" : "",
                                                focusedProductIndex === index
                                                    ? "ring-2 ring-indigo-600 dark:ring-indigo-400 scale-[1.01] z-10 border-transparent shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                                                    : ""
                                            )}
                                        >
                                            {outOfStock && (
                                                <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-[10px] font-black uppercase tracking-wider py-1 px-3.5 rounded-full border border-red-200 dark:border-red-900/50">
                                                    Épuisé
                                                </div>
                                            )}
                                            <div 
                                                className={cn(
                                                    "overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative border border-gray-200/50 dark:border-gray-700/50",
                                                    posUiSize === "sm"
                                                        ? "h-9 w-9 rounded-lg"
                                                        : posUiSize === "lg"
                                                        ? "h-16 w-16 rounded-2xl"
                                                        : "h-12 w-12 lg:h-14 lg:w-14 rounded-xl"
                                                )}
                                            >
                                                {product.imageUrl ? (
                                                    <Image 
                                                        src={product.imageUrl} 
                                                        alt={product.name} 
                                                        fill 
                                                        className="object-cover" 
                                                        unoptimized={product.imageUrl.startsWith("/uploads/")}
                                                        onError={(e) => {
                                                            const target = e.currentTarget as HTMLImageElement;
                                                            target.style.display = "none";
                                                            if (target.parentElement) {
                                                                target.parentElement.innerHTML = `<div class="flex h-full w-full items-center justify-center text-[8px] text-center font-medium text-gray-400">${t("noImg")}</div>`;
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[8px] text-center font-medium text-gray-400">{t("noImg")}</div>
                                                )}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className={cn(
                                                    "font-bold text-primary/80 uppercase tracking-widest truncate",
                                                    posUiSize === "sm" ? "text-[7.5px]" : posUiSize === "lg" ? "text-[10px] lg:text-[11px]" : "text-[9px] lg:text-[10px]"
                                                )}>{product.category}</p>
                                                <h4 className={cn(
                                                    "font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors",
                                                    posUiSize === "sm" ? "text-xs" : posUiSize === "lg" ? "text-sm lg:text-base" : "text-xs lg:text-sm"
                                                )}>{product.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className={cn(
                                                        "text-gray-500 font-mono",
                                                        posUiSize === "sm" ? "text-[8px] lg:text-[9px]" : posUiSize === "lg" ? "text-xs lg:text-sm" : "text-[10px] lg:text-xs"
                                                    )}>{product.barcodes[0] || 'No Barcode'}</p>
                                                    {product.stock <= 5 ? (
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 font-bold uppercase hidden xs:inline",
                                                            posUiSize === "sm" ? "text-[8px]" : "text-[9px]"
                                                        )}>{t("lowStock", { stock: product.stock })}</span>
                                                    ) : (
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium uppercase hidden xs:inline",
                                                            posUiSize === "sm" ? "text-[8px]" : "text-[9px]"
                                                        )}>{t("stock", { stock: product.stock })}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <div className="font-black text-base lg:text-lg text-gray-900 dark:text-white flex items-center">
                                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.price)}
                                                </div>
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        type="button"
                                                        className="h-7 w-7 lg:h-8 lg:w-8 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-355"
                                                        onClick={() => {
                                                            setSelectedProductForInfo(product);
                                                        }}
                                                        title={tCommon("view") || "Détails"}
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        type="button"
                                                        disabled={outOfStock}
                                                        className="h-7 w-7 lg:h-8 lg:w-8 rounded-xl bg-gray-50 text-gray-900 hover:bg-gray-900 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-100 dark:hover:bg-slate-900 transition-all disabled:opacity-50"
                                                        onClick={() => {
                                                            if (outOfStock) return;
                                                            const cType = activeSession?.clientType || 'RETAIL';
                                                            let currentPrice = product.price;
                                                            if (cType === 'RESELLER' && product.dealerPrice != null) currentPrice = product.dealerPrice;
                                                            if (cType === 'WHOLESALE' && product.wholesalePrice != null) currentPrice = product.wholesalePrice;
                                                            
                                                            cart.addItem({
                                                                id: product.id,
                                                                productId: product.id,
                                                                name: product.name,
                                                                price: currentPrice,
                                                                retailPrice: product.price,
                                                                wholesalePrice: product.wholesalePrice,
                                                                dealerPrice: product.dealerPrice,
                                                                cost: product.cost,
                                                                tvaRate: product.tvaRate,
                                                                priceHt: currentPrice / (1 + (product.tvaRate ?? 0) / 100),
                                                                quantity: 1,
                                                                image: product.imageUrl
                                                            });
                                                        }}
                                                    >
                                                        <ShoppingCart size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {totalFiltered > 0 && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200/50 dark:border-slate-800/50 pt-4 pb-8 select-none">
                                <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">
                                    {t("showingProducts", {
                                        start: totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1,
                                        end: Math.min(currentPage * pageSize, totalFiltered),
                                        total: totalFiltered
                                    })}
                                </p>
                                {totalPages > 1 && (
                                    <nav className="relative z-0 inline-flex rounded-xl shadow-xs -space-x-px bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-800 p-0.5" aria-label="Pagination">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-950 dark:hover:text-white disabled:opacity-40"
                                        >
                                            <ChevronLeft size={16} />
                                        </Button>
                                        
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                            .map((p, index, array) => {
                                                const showEllipsis = index > 0 && p - array[index - 1] > 1;
                                                return (
                                                    <div key={p} className="flex items-center">
                                                        {showEllipsis && (
                                                            <span className="px-2 text-xs text-gray-400">...</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setPage(p)}
                                                            className={cn(
                                                                "h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                                currentPage === p
                                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            {p}
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-950 dark:hover:text-white disabled:opacity-40"
                                        >
                                            <ChevronRight size={16} />
                                        </Button>
                                    </nav>
                                )}
                            </div>
                        )}
                        {filteredProducts.length === 0 && (
                            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-700">
                                <Search className="h-10 w-10 lg:h-16 lg:w-16 mb-4 opacity-20" />
                                <p className="text-lg lg:text-xl font-medium">{t("noProductsFound")}</p>
                                <p className="text-xs lg:text-sm opacity-70 mt-1">{t("tryRefiningSearch")}</p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Absolute Mobile Bottom Action Bar */}
                    <div className="lg:hidden absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-white dark:from-[#0f1115] via-white/90 dark:via-[#0f1115]/90 to-transparent pointer-events-none z-10 flex flex-col justify-end">
                        <Button
                            onClick={() => setIsMobileCartOpen(true)}
                            className="w-full h-12 rounded-2xl shadow-xl pointer-events-auto bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 text-white flex items-center justify-between px-4 border border-gray-800 dark:border-gray-200"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <ShoppingCart size={18} />
                                    {totalItemsCount > 0 && (
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-gray-900 dark:border-gray-100">
                                            {totalItemsCount}
                                        </div>
                                    )}
                                </div>
                                <span className="font-bold text-sm">{t("viewCart")}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-base tracking-tight">
                                    {formatter.format(cartTotal)}
                                </span>
                                <ChevronUp size={18} className="text-gray-400 dark:text-gray-500" />
                            </div>
                        </Button>
                    </div>
                </div>

                {/* Cart Sidebar - Hidden on mobile, Right on Desktop */}
                <div 
                    className="hidden lg:flex h-full shrink-0 z-20 transition-all duration-200 bg-white dark:bg-[#18181b] shadow-[-4px_0_24px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_24px_rgba(0,0,0,0.3)] border-l border-gray-200 dark:border-gray-800 flex-col"
                    style={{ width: sidebarWidth === 'narrow' ? '30%' : sidebarWidth === 'wide' ? '50%' : '40%' }}
                >
                    <CartSidebar
                        customers={customers}
                        accounts={accounts}
                        storeName={storeName}
                        storeAddress={storeAddress}
                        storePhone={storePhone}
                        posTimbreEnabled={posTimbreEnabled}
                        storeData={storeData}
                        isElectronicsStore={isElectronicsStore}
                        sidebarWidth={sidebarWidth}
                        setSidebarWidth={setSidebarWidth}
                        sellers={sellers}
                        currentUserId={currentUserId}
                        actionCreateOrder={actionCreateOrder}
                        actionGetProductCustomerSellHistory={actionGetProductCustomerSellHistory}
                        actionSendWhatsAppReceipt={actionSendWhatsAppReceipt}
                        actionCreateCustomer={actionCreateCustomer}
                        actionGetActivePromotions={actionGetActivePromotions}
                    />
                </div>

            </div>


            <Suspense fallback={null}>
                <SalesOrderSearchDialog
                    isOpen={isSearchOrderOpen}
                    onClose={() => setIsSearchOrderOpen(false)}
                    onSelectOrder={handleLoadOrder}
                    actionSearchRecentSalesOrders={actionSearchRecentSalesOrders}
                />
            </Suspense>

            {/* Stunning inline Quick Product Dialog with Tabbed Navigation (Fiche Produit Complète Express) */}
            <Dialog open={quickProductOpen} onOpenChange={setQuickProductOpen}>
                <DialogContent className="max-w-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
                    <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-900">
                        <DialogTitle className="text-xl font-bold flex items-center justify-between text-indigo-950 dark:text-indigo-400">
                            <span className="flex items-center gap-2">
                                <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                                Fiche Produit Express
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-none text-xs px-2.5 py-0.5 rounded-full font-bold">
                                Modèle Complet
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Navigation Tabs bar */}
                    <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-900/60 rounded-xl my-4 border border-slate-100 dark:border-slate-800/80">
                        {[
                            { id: "general", label: "Général", icon: Package },
                            { id: "pricing", label: "Prix & Tarifs", icon: DollarSign },
                            { id: "barcodes", label: "Codes-barres & Photos", icon: Barcode },
                            { id: "stock", label: "Stock & Visibilité", icon: Tag }
                        ].map((t) => {
                            const Icon = t.icon
                            const isActive = quickTab === t.id
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setQuickTab(t.id as any)}
                                    className={cn(
                                        "flex items-center gap-1.5 flex-1 justify-center py-2 text-xs font-bold transition-all rounded-lg",
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-[1.02]"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Tab Contents */}
                    <div className="min-h-[300px] max-h-[50vh] overflow-y-auto px-1 py-2 space-y-4">
                        {/* GENERAL TAB */}
                        {quickTab === "general" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nom du Produit *</label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Ex: Coca Cola 33cl ou iPhone 14 Pro Max"
                                            value={quickName}
                                            onChange={async (e) => {
                                                const val = e.target.value
                                                setQuickName(val)
                                                if (val.trim()) {
                                                    const res = await actionSuggestProductNames(val)
                                                    setQuickSuggestions(res)
                                                    setShowQuickSuggestions(res.length > 0)
                                                    const suggestionList = res
                                                } else {
                                                    setQuickSuggestions([])
                                                    setShowQuickSuggestions(false)
                                                }
                                                setFocusedQuickSuggestionIndex(-1)
                                            }}
                                            onFocus={async () => {
                                                if (quickName.trim()) {
                                                    const res = await actionSuggestProductNames(quickName)
                                                    setQuickSuggestions(res)
                                                    setShowQuickSuggestions(res.length > 0)
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setShowQuickSuggestions(false), 200)
                                            }}
                                            onKeyDown={(e) => {
                                                if (!showQuickSuggestions || quickSuggestions.length === 0) return

                                                if (e.key === "ArrowDown") {
                                                    e.preventDefault()
                                                    setFocusedQuickSuggestionIndex(prev => 
                                                        prev < quickSuggestions.length - 1 ? prev + 1 : 0
                                                    )
                                                } else if (e.key === "ArrowUp") {
                                                    e.preventDefault()
                                                    setFocusedQuickSuggestionIndex(prev => 
                                                        prev > 0 ? prev - 1 : quickSuggestions.length - 1
                                                    )
                                                } else if (e.key === "Enter") {
                                                    if (focusedQuickSuggestionIndex >= 0 && focusedQuickSuggestionIndex < quickSuggestions.length) {
                                                        e.preventDefault()
                                                        setQuickName(quickSuggestions[focusedQuickSuggestionIndex])
                                                        setShowQuickSuggestions(false)
                                                    }
                                                } else if (e.key === "Escape") {
                                                    setShowQuickSuggestions(false)
                                                }
                                            }}
                                            className="text-sm font-semibold border-slate-200 dark:border-slate-800"
                                            autoComplete="off"
                                        />
                                        {showQuickSuggestions && quickSuggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-border/85 rounded-lg shadow-xl divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-100">
                                                {quickSuggestions.map((name, idx) => (
                                                    <div
                                                        key={name}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setQuickName(name)
                                                            setShowQuickSuggestions(false)
                                                        }}
                                                        className={cn(
                                                            "px-4 py-2.5 text-sm cursor-pointer select-none transition-colors text-left font-medium",
                                                            idx === focusedQuickSuggestionIndex 
                                                                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                                                                : "text-slate-700 dark:text-slate-350 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                        )}
                                                    >
                                                        {name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catégorie *</label>
                                            {!showNewCategoryInput ? (
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowNewCategoryInput(true); setNewCategoryName(""); }}
                                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" /> Nouvelle
                                                </button>
                                            ) : null}
                                        </div>
                                        {!showNewCategoryInput ? (
                                            <Select value={quickCategoryId} onValueChange={setQuickCategoryId}>
                                                <SelectTrigger className="border-slate-200 dark:border-slate-800"><SelectValue placeholder="Choisir la catégorie..." /></SelectTrigger>
                                                <SelectContent>
                                                    {localCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex gap-1.5 items-center animate-in fade-in duration-200">
                                                <Input
                                                    placeholder="Nom catégorie..."
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    className="h-9 text-xs border-indigo-200 dark:border-indigo-900/50"
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleCreateCategory();
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                                    onClick={handleCreateCategory}
                                                    disabled={creatingCat}
                                                >
                                                    ✓
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                    onClick={() => setShowNewCategoryInput(false)}
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Marque *</label>
                                            {!showNewBrandInput ? (
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowNewBrandInput(true); setNewBrandName(""); }}
                                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" /> Nouvelle
                                                </button>
                                            ) : null}
                                        </div>
                                        {!showNewBrandInput ? (
                                            <Select value={quickBrandId} onValueChange={setQuickBrandId}>
                                                <SelectTrigger className="border-slate-200 dark:border-slate-800"><SelectValue placeholder="Choisir la marque..." /></SelectTrigger>
                                                <SelectContent>
                                                    {localBrands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex gap-1.5 items-center animate-in fade-in duration-200">
                                                <Input
                                                    placeholder="Nom marque..."
                                                    value={newBrandName}
                                                    onChange={e => setNewBrandName(e.target.value)}
                                                    className="h-9 text-xs border-indigo-200 dark:border-indigo-900/50"
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleCreateBrand();
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                                    onClick={handleCreateBrand}
                                                    disabled={creatingBrand}
                                                >
                                                    ✓
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                    onClick={() => setShowNewBrandInput(false)}
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description du produit</label>
                                    <Textarea
                                        placeholder="Fiche technique ou description rapide du produit..."
                                        value={quickDescription}
                                        onChange={e => setQuickDescription(e.target.value)}
                                        className="text-sm min-h-[100px] border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                        )}

                        {/* PRICING TAB */}
                        {quickTab === "pricing" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className={cn("grid gap-4", storeData?.tvaEnabled ? "grid-cols-2" : "grid-cols-1")}>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                            <ShoppingCart className="h-3.5 w-3.5" /> {storeData?.tvaEnabled ? "Coût d'achat HT (DA) *" : "Coût d'achat (DA) *"}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={quickCost || ""}
                                                onChange={e => handleQuickCostChange(e.target.valueAsNumber || 0)}
                                                className="font-bold border-indigo-200 dark:border-indigo-900/50 pr-12 focus-visible:ring-indigo-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                        </div>
                                    </div>

                                    {storeData?.tvaEnabled && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Taux de TVA (%)</label>
                                            <Select value={String(quickTva)} onValueChange={v => setQuickTva(Number(v))}>
                                                <SelectTrigger className="border-slate-200 dark:border-slate-800 font-semibold"><SelectValue placeholder="TVA..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="19">19% (Taux normal)</SelectItem>
                                                    <SelectItem value="9">9% (Taux réduit)</SelectItem>
                                                    <SelectItem value="0">0% (Exonéré)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            <Store className="h-3.5 w-3.5" /> {storeData?.tvaEnabled ? "Vente Public TTC" : "Vente Public"}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={quickPrice || ""}
                                                onChange={e => setQuickPrice(e.target.valueAsNumber || 0)}
                                                className="font-bold border-blue-100 dark:border-blue-900/40 pr-12 text-blue-700 dark:text-blue-300"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <Package className="h-3.5 w-3.5" /> Demi-Gros / Gros
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={quickWholesalePrice || ""}
                                                onChange={e => setQuickWholesalePrice(e.target.valueAsNumber || 0)}
                                                className="font-bold border-emerald-100 dark:border-emerald-900/40 pr-12 text-emerald-700 dark:text-emerald-300"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                            <UsersIcon className="h-3.5 w-3.5" /> {storeData?.tvaEnabled ? "Revendeur TTC" : "Revendeur"}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={quickDealerPrice || ""}
                                                onChange={e => setQuickDealerPrice(e.target.valueAsNumber || 0)}
                                                className="font-bold border-purple-100 dark:border-purple-900/40 pr-12 text-purple-700 dark:text-purple-300"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Margins calculator */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <Percent className="h-3.5 w-3.5 text-emerald-500" /> Marges calculées live
                                    </p>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        {[
                                            { label: "Marge Public", cost: quickCost, price: quickPrice, color: "text-blue-600 dark:text-blue-400 bg-blue-500/5" },
                                            { label: "Marge Gros", cost: quickCost, price: quickWholesalePrice, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" },
                                            { label: "Marge Revendeur", cost: quickCost, price: quickDealerPrice, color: "text-purple-600 dark:text-purple-400 bg-purple-500/5" }
                                        ].map((m, idx) => {
                                            const margin = m.cost > 0 && m.price > 0 ? (((m.price - m.cost) / m.cost) * 100).toFixed(0) : "—"
                                            const isPositive = margin !== "—" && Number(margin) >= 0
                                            return (
                                                <div key={idx} className={cn("p-2 rounded-xl border border-slate-200/60 dark:border-slate-800", m.color)}>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{m.label}</p>
                                                    <p className={cn("text-sm font-black mt-0.5", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                                        {margin !== "—" ? `${margin}%` : "—"}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BARCODES & PHOTOS TAB */}
                        {quickTab === "barcodes" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Barcode className="h-4 w-4 text-slate-500" /> Codes-barres
                                        </label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuickBarcodes(prev => [...prev, { value: "", label: "" }])}
                                                className="h-7 text-[10px] font-bold py-1 px-2.5 rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-600"
                                            >
                                                <Plus className="h-3 w-3 mr-1" /> Ajouter
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleGenerateQuickBarcode}
                                                className="h-7 text-[10px] font-bold py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                                            >
                                                <Wand2 className="h-3 w-3 mr-1" /> Générer
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-36 overflow-y-auto border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50">
                                        {quickBarcodes.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-4 italic">Aucun code-barre. Cliquez sur Générer ou Ajouter.</p>
                                        ) : (
                                            quickBarcodes.map((bar, index) => (
                                                <div key={index} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
                                                    <Input
                                                        placeholder="Code-barre (scanner ou taper)..."
                                                        value={bar.value}
                                                        onChange={e => {
                                                            const val = e.target.value
                                                            setQuickBarcodes(prev => prev.map((b, i) => i === index ? { ...b, value: val } : b))
                                                        }}
                                                        className="h-8 text-xs font-mono text-center flex-1"
                                                    />
                                                    <Input
                                                        placeholder="Type (ex: Cartouche)..."
                                                        value={bar.label}
                                                        onChange={e => {
                                                            const val = e.target.value
                                                            setQuickBarcodes(prev => prev.map((b, i) => i === index ? { ...b, label: val } : b))
                                                        }}
                                                        className="h-8 text-xs w-28 text-center"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700"
                                                        onClick={() => setQuickBarcodes(prev => prev.filter((_, i) => i !== index))}
                                                    >
                                                        <Trash className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Images du produit (Max 3)</label>
                                    <div className="flex justify-center p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50">
                                        <ImageUpload
                                            value={quickImages.map(img => img.url)}
                                            onChange={(url) => setQuickImages(prev => [...prev, { url }])}
                                            onRemove={(url) => setQuickImages(prev => prev.filter(img => img.url !== url))}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STOCK & OPTIONS TAB */}
                        {quickTab === "stock" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock Initial</label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={quickStock || ""}
                                            onChange={e => setQuickStock(e.target.valueAsNumber || 0)}
                                            className="font-bold border-slate-200 dark:border-slate-800 text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock Minimum</label>
                                        <Input
                                            type="number"
                                            placeholder="5"
                                            value={quickMinStock || ""}
                                            onChange={e => setQuickMinStock(e.target.valueAsNumber || 0)}
                                            className="font-bold border-slate-200 dark:border-slate-800 text-center"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Paramètres de visibilité</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div
                                            onClick={() => setQuickIsFeatured(!quickIsFeatured)}
                                            className={cn(
                                                "flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all hover:scale-[1.01] shadow-sm select-none",
                                                quickIsFeatured
                                                    ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
                                                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <Checkbox checked={quickIsFeatured} onCheckedChange={() => {}} className="pointer-events-none" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold flex items-center gap-1.5">
                                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Produit Vedette
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Mettre en avant sur la caisse tactile.</p>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setQuickIsArchived(!quickIsArchived)}
                                            className={cn(
                                                "flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all hover:scale-[1.01] shadow-sm select-none",
                                                quickIsArchived
                                                    ? "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-900/50 dark:border-slate-700"
                                                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <Checkbox checked={quickIsArchived} onCheckedChange={() => {}} className="pointer-events-none" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold flex items-center gap-1.5">
                                                    <Archive className="h-3.5 w-3.5 text-slate-500" /> Archiver le Produit
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Masquer du POS et du catalogue.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dialog Footer Actions */}
                    <DialogFooter className="gap-2 border-t border-slate-100 dark:border-slate-900 pt-4 mt-2">
                        <Button type="button" variant="outline" onClick={() => setQuickProductOpen(false)} className="text-xs font-bold rounded-xl h-10 px-4">
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreateQuickProduct}
                            disabled={!quickName.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs font-black shadow-md hover:shadow-emerald-500/10 transition-all rounded-xl h-10 px-5 flex items-center gap-1.5"
                        >
                            <CheckCircle className="h-4.5 w-4.5" />
                            Enregistrer & Insérer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Shortcuts Help Modal */}
            <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
                <DialogContent className="max-w-md rounded-2xl bg-[#131418] text-white border-none shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Keyboard className="text-blue-400 animate-pulse" size={22} />
                            <span>Raccourcis Clavier Caisse</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-400">
                            Utilisez ces raccourcis clavier pour travailler plus vite sans souris.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3.5 my-4">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Changer / Switch de Panier</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-emerald-400 font-mono shadow-[0_2px_0_rgba(16,185,129,0.2)]">F1</kbd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Ajouter un Article Express</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-emerald-400 font-mono shadow-[0_2px_0_rgba(16,185,129,0.2)]">F2</kbd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Changer de Catégorie</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-amber-400 font-mono shadow-[0_2px_0_rgba(245,158,11,0.2)]">F6</kbd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Rechercher un produit</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-emerald-400 font-mono shadow-[0_2px_0_rgba(16,185,129,0.2)]">F4 ou F</kbd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Toutes les catégories (reset)</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-amber-400 font-mono shadow-[0_2px_0_rgba(245,158,11,0.2)]">F5</kbd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Encaisser la vente (Paiement)</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-emerald-400 font-mono shadow-[0_2px_0_rgba(16,185,129,0.2)]">F9 ou Espace</kbd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-300 font-bold">Page suivante / précédente</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-sky-400 font-mono shadow-[0_2px_0_rgba(56,189,248,0.2)]">PgUp / PgDn</kbd>
                        </div>
                        <div className="flex items-center justify-between pb-1">
                            <span className="text-xs text-gray-300 font-bold">Fermer les modals / Effacer la recherche</span>
                            <kbd className="px-2.5 py-1 text-[10px] font-black bg-gray-800 border border-gray-700 rounded-md text-emerald-400 font-mono shadow-[0_2px_0_rgba(16,185,129,0.2)]">ESC</kbd>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsShortcutsOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dedicated Info Modal for List View */}
            {selectedProductForInfo && (
                <Modal
                    title=""
                    description=""
                    isOpen={!!selectedProductForInfo}
                    onClose={() => setSelectedProductForInfo(null)}
                    className="max-w-[360px] p-4 rounded-xl gap-2 border-slate-150 dark:border-slate-800 shadow-2xl bg-white dark:bg-[#131418] overflow-hidden"
                >
                    <div className="space-y-4 pt-1" onClick={(e) => e.stopPropagation()}>
                        {/* Header: Compact Info */}
                        <div className="flex gap-3">
                            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shrink-0">
                                {selectedProductForInfo.imageUrl ? (
                                    <Image src={selectedProductForInfo.imageUrl} alt={selectedProductForInfo.name} fill className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/40 uppercase leading-none">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <span className="text-[9px] font-bold tracking-widest text-primary/80 uppercase">
                                    {selectedProductForInfo.category || "General"}
                                </span>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5 line-clamp-2">
                                    {selectedProductForInfo.name}
                                </h3>
                            </div>
                        </div>

                        {/* Stock status indicator */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800/40 flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Stock Actuel</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className={cn(
                                        "text-lg font-black tracking-tight",
                                        selectedProductForInfo.stock > selectedProductForInfo.minStock ? "text-emerald-600 dark:text-emerald-400" :
                                        selectedProductForInfo.stock > 0 ? "text-amber-500" : "text-rose-500"
                                    )}>
                                        {selectedProductForInfo.stock}
                                    </span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-600 font-semibold">un.</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800/40 flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alerte Min</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                        {selectedProductForInfo.minStock}
                                    </span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-600 font-semibold">un.</span>
                                </div>
                            </div>
                        </div>

                        {/* Prices list */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800/50 overflow-hidden">
                            <div className="px-2.5 py-1.5 bg-slate-100/50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/40 flex justify-between items-center">
                                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grille Tarifaire (DZD)</span>
                                {selectedProductForInfo.cost > 0 && (
                                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                                        P.A: {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(selectedProductForInfo.cost)}
                                    </span>
                                )}
                            </div>
                            <div className="p-2 space-y-1.5 text-[11px]">
                                <div className={cn(
                                    "flex justify-between items-center py-0.5 px-1.5 rounded",
                                    clientType === 'RETAIL' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                )}>
                                    <span>Détail (Retail)</span>
                                    <span className="font-mono">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(selectedProductForInfo.price)}</span>
                                </div>
                                {selectedProductForInfo.wholesalePrice && (
                                    <div className={cn(
                                        "flex justify-between items-center py-0.5 px-1.5 rounded",
                                        clientType === 'WHOLESALE' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                    )}>
                                        <span>Gros (Wholesale)</span>
                                        <span className="font-mono">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(selectedProductForInfo.wholesalePrice)}</span>
                                    </div>
                                )}
                                {selectedProductForInfo.dealerPrice && (
                                    <div className={cn(
                                        "flex justify-between items-center py-0.5 px-1.5 rounded",
                                        clientType === 'RESELLER' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                    )}>
                                        <span>Revendeur (Dealer)</span>
                                        <span className="font-mono">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(selectedProductForInfo.dealerPrice)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Barcodes */}
                        {selectedProductForInfo.barcodes && selectedProductForInfo.barcodes.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Codes-barres liés</span>
                                <div className="flex flex-wrap gap-1">
                                    {selectedProductForInfo.barcodes.map((code: string) => (
                                        <span key={code} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-[9px] font-mono rounded text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                                            {code}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {selectedProductForInfo.description && (
                            <div className="space-y-1 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Description</span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-3">
                                    {selectedProductForInfo.description}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 h-8 text-[11px] rounded-lg border-slate-200 dark:border-slate-800"
                                onClick={() => setSelectedProductForInfo(null)}
                            >
                                {tCommon("close")}
                            </Button>
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="flex-1 h-8 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold"
                                disabled={blockNegativeStock && (selectedProductForInfo.stock - (activeSession?.items.find(item => item.productId === selectedProductForInfo.id)?.quantity || 0)) <= 0}
                                onClick={() => {
                                    const inCartQty = activeSession?.items.find(item => item.productId === selectedProductForInfo.id)?.quantity || 0;
                                    const outOfStock = blockNegativeStock && (selectedProductForInfo.stock - inCartQty) <= 0;
                                    if (outOfStock) {
                                        toast.error("Cet article est en rupture de stock.");
                                        return;
                                    }
                                    const cType = activeSession?.clientType || 'RETAIL';
                                    let currentPrice = selectedProductForInfo.price;
                                    if (cType === 'RESELLER' && selectedProductForInfo.dealerPrice != null) currentPrice = selectedProductForInfo.dealerPrice;
                                    if (cType === 'WHOLESALE' && selectedProductForInfo.wholesalePrice != null) currentPrice = selectedProductForInfo.wholesalePrice;
                                    
                                    cart.addItem({
                                        id: selectedProductForInfo.id,
                                        productId: selectedProductForInfo.id,
                                        name: selectedProductForInfo.name,
                                        price: currentPrice,
                                        retailPrice: selectedProductForInfo.price,
                                        wholesalePrice: selectedProductForInfo.wholesalePrice,
                                        dealerPrice: selectedProductForInfo.dealerPrice,
                                        cost: selectedProductForInfo.cost,
                                        tvaRate: selectedProductForInfo.tvaRate,
                                        priceHt: currentPrice / (1 + (selectedProductForInfo.tvaRate ?? 0) / 100),
                                        quantity: 1,
                                        image: selectedProductForInfo.imageUrl
                                    });
                                    setSelectedProductForInfo(null);
                                }}
                            >
                                + Ajouter au Panier
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
