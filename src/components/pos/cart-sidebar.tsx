"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { Trash, Plus, Minus, ShoppingCart, X, PlusCircle, Edit2, Check, ChevronsUpDown, Star, Gift, Tag, History, Clock } from "lucide-react"
import { toast } from "react-hot-toast"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { usePosStore } from "@/hooks/use-pos-store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { createOrder, getProductCustomerSellHistory } from "@/actions/orders"
import { sendWhatsAppReceipt } from "@/actions/whatsapp-receipt"
import { createCustomer } from "@/actions/customers"
import dynamic from "next/dynamic"
const PaymentModal = dynamic(() => import("./payment-modal").then(m => m.PaymentModal), { ssr: false })
import { cn } from "@/lib/utils"
import { getActivePromotions } from "@/actions/promotions"
import { applyPromotionsToCart, ActivePromotion } from "@/lib/promotions-engine"

interface CartSidebarProps {
    customers?: any[]
    accounts?: any[]
    storeName?: string
    storeAddress?: string
    storePhone?: string
    posTimbreEnabled?: boolean
    storeData?: any
    isElectronicsStore?: boolean
    sellers?: { id: string; name: string | null; role: string }[]
    currentUserId?: string
}

interface CartSidebarProps {
    customers?: any[]
    accounts?: any[]
    storeName?: string
    storeAddress?: string
    storePhone?: string
    posTimbreEnabled?: boolean
    storeData?: any
    isElectronicsStore?: boolean
    sidebarWidth?: 'narrow' | 'standard' | 'wide'
    setSidebarWidth?: (w: 'narrow' | 'standard' | 'wide') => void
    sellers?: { id: string; name: string | null; role: string }[]
    currentUserId?: string
}

interface CartItemRowProps {
    item: any
    index: number
    isNewest: boolean
    isElectronics: boolean
    activeSession: any
    handleViewHistory: (item: any) => void
    cart: any
    t: (key: string) => string
}

const CartItemRow = ({ item, index, isNewest, isElectronics, activeSession, handleViewHistory, cart, t }: CartItemRowProps) => {
    const [priceValue, setPriceValue] = useState(item.price.toString())
    const [qtyValue, setQtyValue] = useState(item.quantity.toString())

    useEffect(() => {
        setPriceValue(item.price.toString())
    }, [item.price])

    useEffect(() => {
        setQtyValue(item.quantity.toString())
    }, [item.quantity])

    const handlePriceChange = (val: string) => {
        if (val === "" || /^\d*\.?\d*$/.test(val)) {
            setPriceValue(val)
            const parsed = parseFloat(val)
            if (!isNaN(parsed) && parsed >= 0) {
                if (item.cost && parsed < item.cost) {
                    toast.error(`⚠️ Vente à perte ! Le prix (${parsed} DA) est inférieur au coût (${item.cost} DA)`, {
                        id: `under-cost-${item.id}`
                    })
                }
                cart.updatePrice(item.id, parsed)
            }
        }
    }

    const handlePriceBlur = () => {
        const parsed = parseFloat(priceValue)
        if (isNaN(parsed) || parsed < 0) {
            setPriceValue(item.price.toString())
        }
    }

    const handleQtyChange = (val: string) => {
        if (val === "" || /^\d*\.?\d*$/.test(val)) {
            setQtyValue(val)
            const parsed = parseFloat(val)
            if (!isNaN(parsed) && parsed >= 0) {
                cart.updateQuantity(item.id, parsed)
            }
        }
    }

    const handleQtyBlur = () => {
        const parsed = parseFloat(qtyValue)
        if (isNaN(parsed) || parsed <= 0) {
            setQtyValue(item.quantity.toString())
        }
    }

    return (
        <div
            onDoubleClick={() => document.getElementById(`price-input-${item.id}`)?.focus()}
            className={cn(
                "flex flex-col py-1.5 px-3 rounded-lg border transition-all duration-150 group/item gap-1 shadow-xs relative",
                index % 2 === 0
                    ? "border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850/50"
                    : "border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30"
            )}
        >
            {/* Line 1: Index + Name + History / Remove Button */}
            <div className="flex justify-between items-center gap-2">
                <h4 className="font-bold text-gray-900 dark:text-slate-100 text-xs leading-none flex-1 min-w-0 truncate" title={item.name}>
                    <span className="text-indigo-500 dark:text-indigo-400 mr-1 text-[10px] font-black">#{index + 1}</span>
                    {item.name}
                </h4>
                <div className="flex items-center gap-1.5 shrink-0">
                    {activeSession?.customerId && activeSession.customerName?.toUpperCase() !== "DIVERS" && activeSession.customerName?.toUpperCase() !== "PASSAGER" && (
                        <button
                            type="button"
                            className="text-slate-400 hover:text-indigo-500 transition-colors p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                            onClick={() => handleViewHistory(item)}
                            title="Historique d'achat du client"
                        >
                            <History size={12} />
                        </button>
                    )}
                    <button
                        type="button"
                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => cart.removeItem(item.id)}
                        title="Supprimer"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Line 2: S/N input if electronics */}
            {isElectronics && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-900 mt-0.5">
                    <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">S/N:</span>
                    <input
                        type="text"
                        placeholder="Numéro de série..."
                        className="flex-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-none focus:outline-none focus:ring-0 focus-visible:outline-none p-0"
                        value={item.serialNumber || ""}
                        onChange={(e) => cart.updateSerialNumber(item.id, e.target.value)}
                    />
                </div>
            )}

            {/* Line 4: Controls (Price input, Quantity input, Total) */}
            <div className="flex items-center justify-between gap-2.5 mt-0.5 border-t border-dashed border-gray-200 dark:border-slate-800/60 pt-1">
                {/* Price Input Column */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-[85px]">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-0.5 select-none">
                        Prix
                        {isNewest && (
                            <span className="bg-slate-200 dark:bg-slate-800 text-[8px] font-black px-0.5 py-0 rounded border border-gray-300/30 dark:border-slate-700/50 shrink-0 text-gray-500 dark:text-slate-400">F2</span>
                        )}
                    </span>
                    <div 
                        onClick={() => document.getElementById(`price-input-${item.id}`)?.focus()}
                        className={cn(
                            "flex items-center gap-0.5 bg-white dark:bg-slate-950 px-1.5 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500 transition-all cursor-text",
                            item.cost && item.price < item.cost ? "border-red-300 dark:border-red-900" : ""
                        )}
                    >
                        <input
                            id={`price-input-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            className={cn(
                                "w-full text-[11px] font-bold bg-transparent text-center focus:outline-none focus:ring-0 tabular-nums p-0 border-none focus-visible:outline-none",
                                item.cost && item.price < item.cost
                                    ? "text-red-500 underline decoration-wavy decoration-red-550"
                                    : "text-slate-800 dark:text-slate-200"
                            )}
                            value={priceValue}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            onBlur={handlePriceBlur}
                        />
                        <span className="text-[8px] font-bold text-slate-400 select-none">DA</span>
                    </div>
                </div>

                {/* Quantity Input Column */}
                <div className="flex flex-col gap-0.5 shrink-0">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-0.5 select-none">
                        Qte
                        {isNewest && (
                            <span className="bg-slate-200 dark:bg-slate-800 text-[8px] font-black px-0.5 py-0 rounded border border-gray-300/30 dark:border-slate-700/50 shrink-0 text-gray-500 dark:text-slate-400">F8</span>
                        )}
                    </span>
                    <div className="flex items-center bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden h-7">
                        <button
                            type="button"
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-6 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-900"
                            onClick={() => cart.updateQuantity(item.id, Math.max(0.01, item.quantity - 1))}
                        >
                            <Minus size={8} />
                        </button>
                        <input
                            id={`qty-input-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            className="w-8 text-center font-bold text-[11px] bg-transparent border-none focus:outline-none focus:ring-0 tabular-nums p-0 focus-visible:outline-none"
                            value={qtyValue}
                            onChange={(e) => handleQtyChange(e.target.value)}
                            onBlur={handleQtyBlur}
                        />
                        <button
                            type="button"
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-6 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-900"
                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                        >
                            <Plus size={8} />
                        </button>
                    </div>
                </div>

                {/* Line Total Column */}
                <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[70px] select-none">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</span>
                    <div className="flex items-center h-7">
                        <span className="font-black text-xs text-slate-800 dark:text-slate-200 tracking-tight tabular-nums truncate">
                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.price * item.quantity)} DA
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const CartSidebar = ({ 
    customers = [], 
    accounts = [], 
    storeName, 
    storeAddress, 
    storePhone, 
    posTimbreEnabled = false, 
    storeData, 
    isElectronicsStore = false,
    sidebarWidth,
    setSidebarWidth,
    sellers = [],
    currentUserId
}: CartSidebarProps) => {
    const t = useTranslations("CartSidebar")
    const cart = usePosStore()
    const isElectronics = cart.forceElectronicsMode || isElectronicsStore || storeData?.isElectronics || storeData?.name?.toLowerCase().includes("electr") || false;
    const router = useRouter()
    const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

    useEffect(() => {
        if (!idempotencyKey) {
            setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))
        }
    }, [idempotencyKey])

    useEffect(() => {
        const isCurrentlyElectronics = !!(isElectronicsStore || storeData?.isElectronics || storeData?.name?.toLowerCase().includes("electr"));
        cart.setForceElectronicsMode(isCurrentlyElectronics);
    }, [isElectronicsStore, storeData?.isElectronics, storeData?.name, cart.setForceElectronicsMode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") {
                e.preventDefault();
                const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId)
                const items = activeSession?.items || []
                if (items.length > 0) {
                    const lastItem = items[items.length - 1]
                    const inputElement = document.getElementById(`price-input-${lastItem.id}`)
                    if (inputElement) {
                        inputElement.focus();
                        (inputElement as HTMLInputElement).select();
                    }
                }
            }
            if (e.key === "F8") {
                e.preventDefault();
                const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId)
                const items = activeSession?.items || []
                if (items.length > 0) {
                    const lastItem = items[items.length - 1]
                    const inputElement = document.getElementById(`qty-input-${lastItem.id}`)
                    if (inputElement) {
                        inputElement.focus();
                        (inputElement as HTMLInputElement).select();
                    }
                }
            }
            if (e.key === "F3") {
                e.preventDefault();
                setOpenCustomer(prev => !prev);
            }
            if (e.key === "F4") {
                e.preventDefault();
                setOpenCustomer(false);
                setNewCustomerModalOpen(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cart.sessions, cart.activeSessionId]);

    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [openCustomer, setOpenCustomer] = useState(false)

    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false)
    const [newCustomerName, setNewCustomerName] = useState("")
    const [newCustomerPhone, setNewCustomerPhone] = useState("")

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return
        try {
            setLoading(true)
            const result = await createCustomer({
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim() || undefined,
                clientType: "RETAIL"
            })
            if (result.error) {
                toast.error(result.error)
            } else if (result.id) {
                toast.success("Client créé et sélectionné !")
                cart.setCustomer(result.id, newCustomerName.trim())
                cart.setClientType("RETAIL")
                setNewCustomerModalOpen(false)
                setNewCustomerName("")
                setNewCustomerPhone("")
                router.refresh()
            }
        } catch (error) {
            toast.error("Erreur lors de la création du client")
        } finally {
            setLoading(false)
        }
    }
    const [editingItem, setEditingItem] = useState<any>(null)
    const [editQuantity, setEditQuantity] = useState("")
    const [editPrice, setEditPrice] = useState("")
    const [activePromotions, setActivePromotions] = useState<ActivePromotion[]>([])
    const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0)
    const [usePointsMode, setUsePointsMode] = useState(false)

    const [historyItem, setHistoryItem] = useState<any | null>(null)
    const [sellHistory, setSellHistory] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    const handleViewHistory = async (item: any) => {
        const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId)
        if (!activeSession?.customerId) {
            toast.error("Veuillez sélectionner un client pour voir l'historique d'achat")
            return
        }
        try {
            setHistoryItem(item)
            setLoadingHistory(true)
            setSellHistory([])
            
            const res = await getProductCustomerSellHistory(item.productId, activeSession.customerId)
            if (res.error) {
                toast.error(res.error)
            } else if (res.history) {
                setSellHistory(res.history)
            }
        } catch (error) {
            toast.error("Erreur lors de la récupération de l'historique")
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleEditItem = (item: any) => {
        setEditingItem(item)
        setEditQuantity(item.quantity.toString())
        setEditPrice(item.price.toString())
    }

    const saveItemEdit = () => {
        if (!editingItem) return
        const qty = parseFloat(editQuantity)
        const price = parseFloat(editPrice)
        if (!isNaN(qty) && !isNaN(price)) {
            if (editingItem.cost && price < editingItem.cost) {
                const proceed = window.confirm(`⚠️ Attention : Le prix saisi (${price} DA) est inférieur au coût d'achat (${editingItem.cost} DA).\n\nVoulez-vous vraiment confirmer cette vente à perte ?`)
                if (!proceed) return
            }
            cart.updateQuantity(editingItem.id, qty)
            cart.updatePrice(editingItem.id, price)
        }
        setEditingItem(null)
    }

    useEffect(() => {
        const fetchPromos = async () => {
            const promos = await getActivePromotions()
            setActivePromotions(promos.map(p => ({
                ...p,
                discountValue: Number(p.discountValue),
                scopeId: p.scopeId ?? null
            })))
        }
        fetchPromos()
    }, [])

    // Get active session data
    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId)
    const items = activeSession?.items || []

    // Get selected customer info
    const selectedCustomer = activeSession?.customerId
        ? customers.find(c => c.id === activeSession.customerId)
        : null
    const customerLoyaltyPoints = selectedCustomer?.loyaltyPoints ?? 0

    // Apply promotions engine to items
    const { items: promotedItems, totalDiscount } = useMemo(() => {
        return applyPromotionsToCart(
            items.map(item => ({ ...item, categoryId: item.categoryId || undefined })),
            activePromotions
        )
    }, [items, activePromotions])

    const baseTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const totalAfterPromo = baseTotal - totalDiscount

    // Loyalty points: 100 pts = 10 DA => 1 DA = 10 pts
    const POINTS_TO_DA_RATIO = 0.10

    // Calculate the maximum amount of points needed to fully cover the cart
    const pointsNeededToCoverTotal = Math.ceil(totalAfterPromo / POINTS_TO_DA_RATIO)

    // Actual usable points is the minimum between what they have, what they want to use, and what is needed
    const maxUsablePoints = Math.min(
        customerLoyaltyPoints,
        usePointsMode ? pointsNeededToCoverTotal : 0
    )

    const pointsDiscount = usePointsMode ? (maxUsablePoints * POINTS_TO_DA_RATIO) : 0

    const total = totalAfterPromo - pointsDiscount

    useEffect(() => {
        try {
            const channel = new BroadcastChannel('pos-customer-display');
            channel.postMessage({
                type: 'CART_UPDATE',
                payload: {
                    items: promotedItems,
                    total: total,
                    totalDiscount: totalDiscount + pointsDiscount,
                    customerName: activeSession?.customerName || null
                }
            });
            return () => channel.close();
        } catch (error) {
            console.error('BroadcastChannel mapping error:', error);
        }
    }, [promotedItems, total, totalDiscount, pointsDiscount, activeSession?.customerName]);

    const onCheckout = async (method: "CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM", paidAmount: number, accountId: string | undefined, stampTax: number, subtotal: number, tvaAmount: number, totalTTC: number, vendorId?: string) => {
        setLoading(true)
        try {
            const response = await createOrder({
                storeId: "default",
                items: promotedItems.map((item) => {
                    const itemDiscount = item.discountAmount || 0;
                    const netPrice = item.quantity === 0 ? item.price : item.price - (itemDiscount / item.quantity);
                    const rate = item.tvaRate ?? 19;
                    const netPriceHt = netPrice / (1 + rate / 100);
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        price: netPrice,
                        tvaRate: rate,
                        priceHt: netPriceHt,
                        serialNumber: item.serialNumber
                    };
                }),
                total: totalTTC,
                subtotal: subtotal,
                tvaAmount: tvaAmount,
                stampTax: stampTax,
                paymentMethod: method,
                paidAmount: paidAmount,
                customerId: activeSession?.customerId || null,
                accountId: accountId || undefined,
                userId: vendorId || null,
                status: "COMPLETED",
                originalOrderId: activeSession?.originalOrderId || null,
                discountAmount: totalDiscount + pointsDiscount,
                loyaltyPointsUsed: usePointsMode ? maxUsablePoints : 0,
                idempotencyKey: idempotencyKey
            })

            if (response.error) {
                // Show specific error messages based on error type
                if (response.error.includes("Stock insuffisant")) {
                    toast.error(`⚠️ ${response.error}`, { duration: 5000 })
                } else if (response.error.includes("abonnement") || response.error.includes("subscription")) {
                    toast.error(`🔒 ${response.error}`, { duration: 5000 })
                } else {
                    toast.error(`❌ ${response.error}`)
                }
                return { success: false }
            } else {
                toast.success(t("orderValidated"))
                cart.resetSession()
                setIdempotencyKey(null)
                setUsePointsMode(false)
                setLoyaltyPointsToUse(0)
                // Fire WhatsApp receipt in background (non-blocking)
                if (response.orderId) {
                    sendWhatsAppReceipt(response.orderId).catch(() => null)
                }
                router.refresh()
                return {
                    success: true,
                    data: {
                        receiptNumber: response.receiptNumber,
                        paidAmount: paidAmount,
                        previousBalance: response.previousBalance,
                        newBalance: response.newBalance
                    }
                }
            }
        } catch (error: any) {
            console.error("POS Checkout Error:", error)
            // Extract the most useful error message
            const errorMsg = error?.message || error?.digest || String(error)
            
            if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("network"))) {
                toast.error("🌐 Connexion perdue. Veuillez vérifier votre réseau et réessayer.", { duration: 5000 })
            } else if (errorMsg.includes("abonnement") || errorMsg.includes("bloqué") || errorMsg.includes("expiré")) {
                toast.error(`🔒 ${errorMsg}`, { duration: 6000 })
            } else if (errorMsg.includes("Stock insuffisant")) {
                toast.error(`⚠️ ${errorMsg}`, { duration: 5000 })
            } else if (errorMsg.includes("magasin") || errorMsg.includes("store")) {
                toast.error(`🏪 ${errorMsg}`, { duration: 5000 })
            } else {
                toast.error(`❌ ${t("errorValidation")} — ${errorMsg}`, { duration: 4000 })
            }
            return { success: false }
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={!!editingItem} onOpenChange={(val) => !val && setEditingItem(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("editItem")}</DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="qty">{t("quantityLabel")}</Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">{t("priceLabel")}</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                />
                                {parseFloat(editPrice) < (editingItem?.cost || 0) && (
                                    <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1 animate-pulse">
                                        ⚠️ Attention : Prix inférieur au coût d'achat ({editingItem?.cost} DA)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>{t("cancel")}</Button>
                        <Button onClick={saveItemEdit}>{t("save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={newCustomerModalOpen} onOpenChange={setNewCustomerModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Nouveau Client</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cust-name" className="text-xs font-bold text-gray-700 dark:text-slate-300">Nom complet *</Label>
                            <Input
                                id="cust-name"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="Ahmed Benali"
                                className="rounded-xl border-gray-200 dark:border-slate-800"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cust-phone" className="text-xs font-bold text-gray-700 dark:text-slate-300">Téléphone (Optionnel)</Label>
                            <Input
                                id="cust-phone"
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                placeholder="0555123456"
                                className="rounded-xl border-gray-200 dark:border-slate-800"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setNewCustomerModalOpen(false)} className="rounded-xl font-bold">Annuler</Button>
                        <Button onClick={handleCreateCustomer} disabled={loading || !newCustomerName.trim()} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Suspense fallback={null}>
                <PaymentModal
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    onConfirm={(method, paidAmount, accountId, stampTax, subtotal, tvaAmount, totalTTC, vendorId) => onCheckout(method, paidAmount, accountId || undefined, stampTax, subtotal, tvaAmount, totalTTC, vendorId)}
                    loading={loading}
                    total={total}
                    items={promotedItems}
                    customerName={activeSession?.customerName || undefined}
                    hasCustomer={!!activeSession?.customerId}
                    accounts={accounts}
                    storeName={storeName}
                    storeAddress={storeAddress}
                    storePhone={storePhone}
                    posTimbreEnabled={posTimbreEnabled}
                    storeData={storeData}
                    sellers={sellers}
                    currentUserId={currentUserId}
                />
            </Suspense>
            <div className="flex h-full flex-col bg-white dark:bg-[#18181b] border-gray-200 dark:border-slate-800 overflow-hidden">

                <div className="flex shrink-0 items-center justify-between p-4 pb-2">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            {t("order")} {cart.sessions.findIndex(s => s.id === cart.activeSessionId) + 1}
                        </h2>
                        <div 
                            className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 select-none w-fit",
                                isElectronics 
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400" 
                                    : "bg-gray-100 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700/50"
                            )}
                        >
                            <span className={cn("w-1 h-1 rounded-full", isElectronics ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-slate-600")} />
                            Mode Électronique: {isElectronics ? "ACTIF" : "INACTIF"}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Width adjustment buttons */}
                        {setSidebarWidth && (
                            <div className="hidden lg:flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-750 select-none">
                                <button
                                    type="button"
                                    onClick={() => setSidebarWidth('narrow')}
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                        sidebarWidth === 'narrow' ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-400 hover:text-gray-655"
                                    )}
                                    title="Étroit (30%)"
                                >
                                    S
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSidebarWidth('standard')}
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                        sidebarWidth === 'standard' ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-400 hover:text-gray-655"
                                    )}
                                    title="Normal (40%)"
                                >
                                    M
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSidebarWidth('wide')}
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                        sidebarWidth === 'wide' ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-400 hover:text-gray-655"
                                    )}
                                    title="Large (50%)"
                                >
                                    L
                                </button>
                            </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={cart.resetSession} disabled={items.length === 0} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full px-3 h-7 text-xs font-black uppercase tracking-wider">
                            {t("clearTicket")}
                        </Button>
                    </div>
                </div>


                {/* Customer section */}
                <div className="px-4 pb-1.5 border-b border-gray-100 dark:border-slate-800 shrink-0 space-y-1">
                    <div className="flex gap-1.5 w-full">
                        <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCustomer}
                                    className="flex-1 justify-between h-9 rounded-xl bg-[#f8f9fa] dark:bg-[#1e293b] border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-[#f8f9fa] dark:hover:bg-[#1e293b] shadow-sm truncate"
                                >
                                    <div className="flex items-center gap-1.5 truncate pr-2 border-none">
                                        <span className="bg-slate-200 dark:bg-slate-800 text-[9px] font-black px-1 py-0.5 rounded border border-gray-300/30 dark:border-slate-700/50 shrink-0 text-gray-500 dark:text-slate-400">F3</span>
                                        <span className="truncate">
                                            {activeSession?.customerId
                                                ? customers.find((c) => c.id === activeSession.customerId)?.name
                                                : t("walkingCustomer")}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[340px] md:w-[400px] p-0 rounded-2xl z-[99999]" align="start">
                                <Command>
                                    <CommandInput placeholder={t("searchClient")} className="h-11" />
                                    <CommandList>
                                        <CommandEmpty>
                                            <div className="p-3 text-center">
                                                <p className="text-sm text-muted-foreground">{t("noClientFound")}</p>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="mt-2 text-xs font-bold gap-1 rounded-xl text-emerald-600 border-emerald-250 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                                                    onClick={() => {
                                                        setOpenCustomer(false);
                                                        setNewCustomerModalOpen(true);
                                                    }}
                                                >
                                                    <PlusCircle className="h-3.5 w-3.5" /> Créer ce client (F4)
                                                </Button>
                                            </div>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="Walking Customer No Name"
                                                onSelect={() => {
                                                    cart.clearCustomer();
                                                    cart.setClientType("RETAIL");
                                                    setOpenCustomer(false);
                                                    setUsePointsMode(false);
                                                    setLoyaltyPointsToUse(0);
                                                }}
                                                className="font-medium cursor-pointer py-3"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", !activeSession?.customerId ? "opacity-100" : "opacity-0")} />
                                                {t("walkingCustomer")}
                                            </CommandItem>
                                            {customers.map((c) => (
                                                <CommandItem
                                                    key={c.id}
                                                    value={`${c.name} ${c.phone || ''} ${c.barcode || ''}`}
                                                    onSelect={() => {
                                                        cart.setCustomer(c.id, c.name);
                                                        if (c.clientType) {
                                                            cart.setClientType(c.clientType as any);
                                                        } else {
                                                            cart.setClientType("RETAIL");
                                                        }
                                                        setOpenCustomer(false);
                                                        setUsePointsMode(false);
                                                        setLoyaltyPointsToUse(0);
                                                    }}
                                                    className="font-medium cursor-pointer py-3"
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", activeSession?.customerId === c.id ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex flex-col">
                                                        <span>{c.name}</span>
                                                        <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                            {c.phone}{c.phone && (c.barcode || c.loyaltyPoints) ? ' ·' : ''}
                                                            {c.barcode && ` ${c.barcode}`}
                                                            {c.loyaltyPoints > 0 && <span className="text-amber-600 font-semibold">★ {c.loyaltyPoints} pts</span>}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border-emerald-250 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30 shrink-0 shadow-sm"
                            onClick={() => setNewCustomerModalOpen(true)}
                            title="Ajouter un client (F4)"
                        >
                            <PlusCircle className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Loyalty Points Panel (shown only when a customer with points is selected) */}
                    {selectedCustomer && customerLoyaltyPoints > 0 && (
                        <div className={cn(
                            "flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all",
                            usePointsMode
                                ? "bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40"
                                : "bg-gray-50 border border-gray-100 dark:bg-slate-800/60 dark:border-slate-700/50"
                        )}>
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                                <span className="font-semibold text-amber-700 dark:text-amber-400">{customerLoyaltyPoints} pts</span>
                                {usePointsMode && <span className="text-xs text-muted-foreground">→ -{pointsDiscount} DA</span>}
                            </div>
                            <Button
                                size="sm"
                                variant={usePointsMode ? "default" : "outline"}
                                className={cn("h-7 text-xs rounded-lg", usePointsMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "")}
                                onClick={() => {
                                    setUsePointsMode(!usePointsMode)
                                    if (!usePointsMode) setLoyaltyPointsToUse(customerLoyaltyPoints)
                                    else setLoyaltyPointsToUse(0)
                                }}
                            >
                                {usePointsMode ? t("cancelPoints") : t("usePoints")}
                            </Button>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 min-h-0 px-2.5">
                    {items.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center space-y-4 text-gray-400 dark:text-gray-500 mt-28">
                            <div className="p-6 rounded-full bg-gray-50 dark:bg-gray-800/50">
                                <ShoppingCartIcon className="h-12 w-12 opacity-40" />
                            </div>
                            <p className="text-lg font-medium">{t("emptyTicket")}</p>
                            <p className="text-sm opacity-70">{t("scanToAdd")}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-1 py-1">
                        {[...promotedItems].reverse().map((item, index) => (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                index={promotedItems.length - 1 - index}
                                isNewest={index === 0}
                                isElectronics={isElectronics}
                                activeSession={activeSession}
                                handleViewHistory={handleViewHistory}
                                cart={cart}
                                t={t}
                            />
                        ))}
                    </div>
                </ScrollArea>

                <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#18181b] z-30 shrink-0 shadow-[0_-2px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_-2px_16px_rgba(0,0,0,0.15)]">
                    <div className="mb-2 space-y-0.5">
                        {/* Discount summary */}
                        {(totalDiscount > 0 || pointsDiscount > 0) && (
                            <div className="flex justify-between items-center text-[10px] text-violet-600 dark:text-violet-400 font-semibold bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-md">
                                <span className="flex items-center gap-1"><Gift size={10} /> {t("promoSavings")}</span>
                                <span>-{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(totalDiscount + pointsDiscount)} DA</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-gray-900 dark:text-slate-100">
                            <span className="text-sm font-black">{t("total")}</span>
                            <div className="text-right flex items-baseline gap-1.5">
                                <span className="text-[1.65rem] leading-none font-black tracking-tighter tabular-nums">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}
                                </span>
                                <span className="text-[10px] font-black uppercase">DA</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        id="checkout-button"
                        className="w-full h-[40px] rounded-lg text-lg font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 hover:-translate-y-0.5 flex flex-col items-center justify-center gap-0.5"
                        disabled={items.length === 0 || loading}
                        onClick={() => setOpen(true)}
                    >
                        <span>{t("checkout")}</span>
                        <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">Space / F9</span>
                    </Button>
                </div>
            </div>

            {/* Sell History Modal */}
            <Dialog open={!!historyItem} onOpenChange={(open) => !open && setHistoryItem(null)}>
                <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#181920] border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                            <History className="h-5 w-5 text-indigo-650 shrink-0" />
                            Historique d'achat
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Historique des ventes du produit <strong className="text-slate-800 dark:text-slate-200">{historyItem?.name}</strong> pour le client <strong className="text-slate-850 dark:text-slate-150">{activeSession?.customerName}</strong>
                        </p>
                    </DialogHeader>
                    
                    <div className="py-4 max-h-[300px] overflow-y-auto space-y-3 pr-1">
                         {loadingHistory ? (
                             <div className="flex flex-col items-center justify-center py-8 space-y-2">
                                 <Clock className="h-8 w-8 text-indigo-650 animate-spin" />
                                 <p className="text-xs text-muted-foreground">Chargement de l'historique...</p>
                             </div>
                         ) : sellHistory.length === 0 ? (
                             <div className="flex flex-col items-center justify-center py-10 text-center">
                                 <p className="text-sm font-semibold text-slate-500">Aucun historique d'achat trouvé</p>
                                 <p className="text-xs text-muted-foreground mt-1">C'est la première fois que ce client achète ce produit.</p>
                             </div>
                         ) : (
                             <div className="space-y-2.5">
                                 {sellHistory.map((h, i) => (
                                     <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors">
                                         <div className="space-y-0.5">
                                             <div className="flex items-center gap-2">
                                                 <span className={cn(
                                                     "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                                                     h.type === "POS" ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20" : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20"
                                                 )}>
                                                     {h.type}
                                                 </span>
                                                 <span className="text-xs font-semibold text-muted-foreground">{new Date(h.date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                             </div>
                                             <p className="text-[10px] font-bold text-muted-foreground">{h.receiptNumber}</p>
                                         </div>
                                         <div className="text-right">
                                             <p className="text-sm font-black text-slate-900 dark:text-slate-100">{h.price.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA</p>
                                             <p className="text-[10px] text-muted-foreground">Qté: <strong className="text-slate-800 dark:text-slate-200">{h.quantity}</strong></p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" className="w-full rounded-xl" onClick={() => setHistoryItem(null)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function ShoppingCartIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
    )
}
