"use client"

import { useState, useEffect, FC } from "react"
import { Search, ShoppingCart, ImageIcon, ChevronUp } from "lucide-react"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn, formatter } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"

import { PosHeader } from "./pos-header"
import { CartSidebar } from "./cart-sidebar"
import { ProductCard } from "./product-card"
import { SalesOrderSearchDialog } from "./sales-order-search-dialog"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { ModeToggle } from "@/components/dashboard/mode-toggle"
import { LanguageSwitcher } from "@/components/dashboard/language-switcher"
import { usePosStore } from "@/hooks/use-pos-store"
import { toast } from "react-hot-toast"
import { getSalesOrderByReceipt } from "@/actions/sales-orders"
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
    }[]
    categories: {
        id: string
        name: string
    }[]
    customers?: any[]
    accounts?: any[]
}

export const PosClient: FC<PosClientProps> = ({
    storeName = "SYNCLOUDPOS",
    storeAddress,
    storePhone,
    products,
    categories,
    customers = [],
    accounts = []
}) => {
    const t = useTranslations("PosClient")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [isSearchOrderOpen, setIsSearchOrderOpen] = useState(false)
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
    const cart = usePosStore()

    // Derived cart values for mobile bottom bar
    const activeSessionId = cart.activeSessionId
    const activeSession = cart.sessions.find(s => s.id === activeSessionId)
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
                if (searchQuery) setSearchQuery("");
                return;
            }

            if (isInput) return;

            if (e.key === "F9" || e.key === " ") {
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
            }
        };
        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isSearchOrderOpen, searchQuery]);

    const handleLoadOrder = (order: any) => {
        setIsSearchOrderOpen(false)
        cart.createSession()
        cart.updateSessionName(cart.activeSessionId, `Extracted ${order.receiptNumber}`)
        cart.setOriginalOrder(order.id, order.receiptNumber)

        // Set Customer if exists
        if (order.customer) {
            cart.setCustomer(order.customer.id, order.customer.name)
        }

        // Add all items
        for (const item of order.items) {
            cart.addItem({
                id: item.productId, // Use productId as the cart item id to merge duplicates easily
                productId: item.productId,
                name: item.product.name,
                price: Number(item.unitPrice), // Keep historical order unit price
                retailPrice: Number(item.unitPrice),
                cost: Number(item.product.cost || 0),
                tvaRate: Number(item.tvaRate || 19),
                priceHt: Number(item.priceHt || item.unitPrice),
                quantity: item.quantity,
                image: item.product.images?.[0]?.url
            })
        }

        toast.success(`Loaded order: ${order.receiptNumber}`)
    }

    const handleCodeInput = async (code: string) => {
        // 1. Check if it's an Order Receipt (e.g. BL-2026/0001, FA-2026/...)
        if (code.includes("-") && code.includes("/")) {
            const order = await getSalesOrderByReceipt(code)
            if (order) {
                cart.createSession()
                cart.updateSessionName(cart.activeSessionId, `Extracted ${code}`)
                cart.setOriginalOrder(order.id, order.receiptNumber)

                // Set Customer if exists
                if (order.customer) {
                    cart.setCustomer(order.customer.id, order.customer.name)
                }

                // Add all items
                for (const item of order.items) {
                    cart.addItem({
                        id: item.productId, // Use productId as the cart item id to merge duplicates easily
                        productId: item.productId,
                        name: item.product.name,
                        price: Number(item.unitPrice),
                        retailPrice: Number(item.unitPrice),
                        cost: Number(item.product.cost || 0),
                        quantity: item.quantity,
                        image: item.product.images?.[0]?.url
                    })
                }

                toast.success(`Loaded order: ${code}`)
                setSearchQuery("")
                return
            }
        }

        // 2. Check if Weight/Price Scale Barcode (EAN-13 starting with 2)
        if (code.length === 13 && code.startsWith("2")) {
            for (const p of products) {
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
                        priceHt: currentPrice / (1 + (p.tvaRate ?? 19) / 100),
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
        const product = products.find(p => p.barcodes.includes(code))
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
                priceHt: currentPrice / (1 + (product.tvaRate ?? 19) / 100),
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

    const filteredProducts = products.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.barcodes.some(b => b.includes(searchQuery))
        const matchesCategory = selectedCategory ? item.categoryId === selectedCategory : true
        return matchesSearch && matchesCategory
    })

    const renderedProducts = filteredProducts.slice(0, 50)

    return (
        <div className="flex h-[100dvh] flex-col bg-[#f8f9fa] dark:bg-[#0f1115] overflow-hidden">
            <PosHeader storeName={storeName} />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Cart Sidebar - Hidden on mobile, Left on Desktop */}
                <div className="hidden lg:flex w-[440px] h-full shrink-0 z-20 transition-all bg-white dark:bg-[#18181b] shadow-[4px_0_24px_rgba(0,0,0,0.2)] border-r border-gray-200 dark:border-gray-800 flex-col">
                    <CartSidebar customers={customers} accounts={accounts} storeName={storeName} storeAddress={storeAddress} storePhone={storePhone} />
                </div>

                {/* Mobile Cart Drawer */}
                <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
                    <SheetContent side="bottom" className="h-[90vh] p-0 w-full sm:max-w-md mx-auto rounded-t-3xl overflow-hidden flex flex-col border-none bg-white dark:bg-[#18181b] z-[100]">
                        <div className="flex-1 w-full h-[calc(100%-2rem)] flex flex-col pt-2">
                            {/* Draggable indicator line */}
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto my-2 flex-shrink-0" />
                            <CartSidebar customers={customers} accounts={accounts} storeName={storeName} storeAddress={storeAddress} storePhone={storePhone} />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Product Area - Right Side (Full width on mobile) */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-transparent w-full">

                    {/* Filter Bar */}
                    <div className="px-3 lg:px-6 py-2 lg:py-4 space-y-2 lg:space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 lg:gap-4 max-w-4xl mx-auto w-full">
                            <div className="relative group flex-1 w-full">
                                <Search className="absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors duration-200" />
                                <Input
                                    placeholder={t("searchPlaceholder")}
                                    className="pl-9 lg:pl-14 h-10 lg:h-14 w-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-xl lg:rounded-[20px] text-sm lg:text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                        if (e.target.value.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
                                            setViewMode("list")
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchQuery.trim() !== '') {
                                            handleCodeInput(searchQuery.trim())
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto h-10 lg:h-14">
                                <Button
                                    variant="outline"
                                    className="flex-1 md:flex-none h-full px-3 lg:px-6 rounded-xl lg:rounded-[20px] bg-white dark:bg-[#1e293b] border-gray-200 dark:border-slate-700 shadow-sm gap-2 font-bold text-xs lg:text-base text-gray-900 dark:text-gray-100"
                                    onClick={() => setIsSearchOrderOpen(true)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
                                    <span className="hidden sm:inline">{t("loadOrder")}</span>
                                </Button>

                                <div className="hidden lg:flex h-full bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-[20px] p-1 shadow-sm gap-1">
                                    <LanguageSwitcher />
                                    <ModeToggle />
                                    <div className="w-px bg-gray-200 dark:bg-slate-700 my-2 mx-1 rounded-full"></div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode("grid")}
                                        className={cn("w-12 h-full rounded-2xl transition-all", viewMode === "grid" ? "bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white" : "text-gray-500")}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode("list")}
                                        className={cn("w-12 h-full rounded-2xl transition-all", viewMode === "list" ? "bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white" : "text-gray-500")}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
                                    </Button>
                                    <div className="w-px bg-gray-200 dark:bg-slate-700 my-2 mx-1 rounded-full"></div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title={cart.showImages ? "Hide Images" : "Show Images"}
                                        onClick={() => cart.toggleImages()}
                                        className={cn("w-12 h-full rounded-2xl transition-all", cart.showImages ? "bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white" : "text-gray-500")}
                                    >
                                        <ImageIcon strokeWidth={cart.showImages ? 2.5 : 2} size={20} className={cn(!cart.showImages && "opacity-50")} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex w-max space-x-1.5 lg:space-x-3 pb-2 px-0.5">
                                <Button
                                    variant={selectedCategory === null ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(null)}
                                    className={cn(
                                        "rounded-full px-3 lg:px-6 h-7 lg:h-10 text-xs lg:text-sm font-bold transition-all border",
                                        selectedCategory === null ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm" : "bg-white text-gray-600 dark:bg-[#1e293b] dark:text-slate-300 dark:border-slate-700"
                                    )}
                                >
                                    {t("allCategories")}
                                </Button>
                                {categories.map((category) => (
                                    <Button
                                        key={category.id}
                                        variant={selectedCategory === category.id ? "default" : "outline"}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={cn(
                                            "rounded-full px-3 lg:px-6 h-7 lg:h-10 text-xs lg:text-sm font-bold transition-all border",
                                            selectedCategory === category.id ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm" : "bg-white text-gray-600 dark:bg-[#1e293b] dark:text-slate-300 dark:border-slate-700"
                                        )}
                                    >
                                        {category.name}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="h-1" />
                        </ScrollArea>
                    </div>

                    {/* Content Area (Grid or List) */}
                    <ScrollArea className="flex-1 px-3 lg:px-6 pb-20 lg:pb-6">
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 lg:gap-3 pb-8">
                                {renderedProducts.map((product) => (
                                    <ProductCard key={product.id} data={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 pb-8 max-w-4xl mx-auto">
                                {renderedProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => {
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
                                                priceHt: currentPrice / (1 + (product.tvaRate ?? 19) / 100),
                                                quantity: 1,
                                                image: product.imageUrl
                                            })
                                        }}
                                        className="flex items-center gap-3 lg:gap-4 bg-white dark:bg-[#1e293b] border-2 border-gray-100 dark:border-gray-800 p-2 lg:p-3 rounded-[16px] lg:rounded-[20px] hover:border-gray-300 dark:hover:border-gray-600 shadow-sm cursor-pointer transition-all group"
                                    >
                                        {cart.showImages && (
                                            <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative border border-gray-200/50 dark:border-gray-700/50">
                                                {product.imageUrl ? (
                                                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[8px] text-center font-medium text-gray-400">{t("noImg")}</div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[9px] lg:text-[10px] font-bold text-primary/80 uppercase tracking-widest truncate">{product.category}</p>
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs lg:text-sm truncate group-hover:text-primary transition-colors">{product.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] lg:text-xs text-gray-500 font-mono">{product.barcodes[0] || 'No Barcode'}</p>
                                                {product.stock <= 5 ? (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 font-bold uppercase hidden xs:inline">{t("lowStock", { stock: product.stock })}</span>
                                                ) : (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium uppercase hidden xs:inline">{t("stock", { stock: product.stock })}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <div className="font-black text-base lg:text-lg text-gray-900 dark:text-white flex items-center">
                                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.price)}
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 lg:h-8 lg:w-8 rounded-xl bg-gray-50 text-gray-900 group-hover:bg-gray-900 group-hover:text-white transition-all">
                                                <ShoppingCart size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {filteredProducts.length > 50 && (
                            <div className="py-8 text-center text-xs lg:text-sm font-medium text-gray-400">
                                {t("showingTop50")}
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

            </div>

            <SalesOrderSearchDialog
                isOpen={isSearchOrderOpen}
                onClose={() => setIsSearchOrderOpen(false)}
                onSelectOrder={handleLoadOrder}
            />
        </div>
    )
}
