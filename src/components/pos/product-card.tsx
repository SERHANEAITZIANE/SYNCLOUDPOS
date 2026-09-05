"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import Image from "next/image"
import { ShoppingCart, Tag, Check } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn, scrollIntoViewSafe } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { usePosStore } from "@/hooks/use-pos-store"
import { useSwipe } from "@/hooks/use-swipe"
import { Badge } from "@/components/ui/badge"
import { getProductDirectDiscount, ActivePromotion } from "@/lib/promotions-engine"

interface ProductCardProps {
    data: {
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
        categoryId?: string
        stock: number
        barcodes: string[]
        isService?: boolean
    }
    blockNegativeStock?: boolean
    isFocused?: boolean
    posUiSize?: "sm" | "md" | "lg"
    promotions?: ActivePromotion[]
}

export const ProductCard: React.FC<ProductCardProps> = ({
    data,
    blockNegativeStock = false,
    isFocused = false,
    posUiSize = "md",
    promotions = []
}) => {
    const cart = usePosStore()
    const tCommon = useTranslations("Common")
    const [showInfo, setShowInfo] = useState(false)
    const [showImagePreview, setShowImagePreview] = useState(false)

    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);
    const clientType = activeSession?.clientType || 'RETAIL';

    // Determine the single chosen price based on active client mode
    let displayPrice = data.price;
    let chosenPriceName = "Prix Vente (Détail)";

    if (clientType === 'RESELLER' && data.dealerPrice != null) {
        displayPrice = data.dealerPrice;
        chosenPriceName = "Prix Revendeur";
    } else if (clientType === 'WHOLESALE' && data.wholesalePrice != null) {
        displayPrice = data.wholesalePrice;
        chosenPriceName = "Prix Gros";
    }

    // Calculate active direct product discount if available
    const discountInfo = useMemo(() => {
        return getProductDirectDiscount(
            { id: data.id, categoryId: data.categoryId, price: displayPrice },
            promotions
        )
    }, [data.id, data.categoryId, displayPrice, promotions]);

    // Cart state
    const cartItem = activeSession?.items.find(item => item.productId === data.id);
    const quantityInCart = cartItem?.quantity || 0;

    const onAddToCart = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        cart.addItem({
            id: data.id,
            productId: data.id,
            name: data.name,
            price: displayPrice,
            retailPrice: data.price,
            wholesalePrice: data.wholesalePrice,
            dealerPrice: data.dealerPrice,
            cost: data.cost,
            quantity: 1,
            image: data.imageUrl,
            categoryId: data.categoryId
        })
    }

    const onRemoveFromCart = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (quantityInCart > 0 && cartItem) {
            if (cartItem.quantity > 1) {
                cart.updateQuantity(cartItem.id, cartItem.quantity - 1);
            } else {
                cart.removeItem(cartItem.id);
            }
        }
    }

    // Swipe handlers
    const handleSwipeRight = useCallback(() => { onAddToCart(); }, []);
    const handleSwipeLeft = useCallback(() => { onRemoveFromCart(); }, [quantityInCart, cartItem]);

    const { ref } = useSwipe({
        onSwipeRight: handleSwipeRight,
        onSwipeLeft: handleSwipeLeft,
        onLongPress: () => setShowInfo(true),
        threshold: 50,
        preventDefaultTouchmoveEvent: true
    });

    useEffect(() => {
        if (isFocused && ref.current) {
            scrollIntoViewSafe(ref.current);
        }
    }, [isFocused, ref]);

    const isService = (data as any).isService;
    const outOfStock = !isService && blockNegativeStock && (data.stock - quantityInCart) <= 0;
    const isLowStock = !isService && (data.stock - quantityInCart) > 0 && (data.stock - quantityInCart) <= data.minStock;
    const inCart = quantityInCart > 0;

    return (
        <>
            <Card
                ref={ref}
                className={cn(
                    "group relative cursor-pointer overflow-hidden border transition-all duration-200 ease-out flex flex-col p-0 gap-0 select-none",
                    posUiSize === "sm" ? "rounded-xl" : "rounded-2xl",
                    "bg-white dark:bg-[#1a1d23]",
                    inCart
                        ? "border-emerald-500/70 dark:border-emerald-500/50 shadow-[0_2px_16px_rgba(16,185,129,0.12)]"
                        : "border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
                    outOfStock ? "opacity-40 cursor-not-allowed" : "active:scale-[0.97]",
                    isLowStock && !inCart ? "border-amber-300/70 dark:border-amber-700/50" : "",
                    isFocused ? "ring-2 ring-indigo-500 dark:ring-indigo-400 scale-[1.02] z-10 shadow-[0_0_20px_rgba(99,102,241,0.3)]" : ""
                )}
                onClick={outOfStock ? undefined : onAddToCart}
                onContextMenu={(e) => { e.preventDefault(); setShowInfo(true); }}
            >
                {/* Out of Stock Overlay */}
                {outOfStock && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                        <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-widest py-1 px-3 rounded-lg shadow-lg -rotate-6">
                            Épuisé
                        </span>
                    </div>
                )}

                {/* Low stock badge */}
                {isLowStock && !inCart && (
                    <div className="absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black shadow-sm">
                        Stock bas
                    </div>
                )}

                {/* Active Promotion Badge (e.g. -20%) */}
                {discountInfo?.hasDiscount && !outOfStock && (
                    <div className="absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black shadow-md flex items-center gap-1">
                        <Tag size={9} />
                        <span>{discountInfo.label}</span>
                    </div>
                )}

                {/* Quantity Badge — clean pill overlay on top-right */}
                {inCart && (
                    <div className={cn(
                        "absolute top-1.5 right-1.5 z-20 flex items-center justify-center rounded-full bg-emerald-500 text-white font-black shadow-md border-2 border-white dark:border-[#1a1d23] animate-in zoom-in-75 duration-150",
                        posUiSize === "sm" ? "min-w-[20px] h-[20px] text-[9px] px-1" : "min-w-[22px] h-[22px] text-[10px] px-1.5"
                    )}>
                        {quantityInCart}
                    </div>
                )}

                {/* Product Image — clean, no excess border */}
                <div className={cn(
                    "relative w-full overflow-hidden bg-slate-50 dark:bg-slate-900/60",
                    posUiSize === "sm" ? "aspect-[4/3]" : "aspect-square"
                )}>
                    {data.imageUrl ? (
                        <Image
                            src={data.imageUrl}
                            alt={data.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            unoptimized={data.imageUrl.startsWith("/uploads/")}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-200 dark:text-slate-800">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                <circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                            </svg>
                        </div>
                    )}

                    {/* Subtle green check overlay when in cart */}
                    {inCart && (
                        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-emerald-500/20 to-transparent pointer-events-none" />
                    )}
                </div>

                {/* Product Body — Minimal: Name + Price only */}
                <div className={cn(
                    "flex flex-col justify-between flex-1",
                    posUiSize === "sm" ? "px-2 py-1.5 gap-0.5" : posUiSize === "lg" ? "px-3.5 py-3 gap-1.5" : "px-2.5 py-2 gap-1"
                )}>
                    {/* Product Name */}
                    <h3
                        className={cn(
                            "font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2",
                            posUiSize === "sm" ? "text-[10px]" : posUiSize === "lg" ? "text-xs" : "text-[11px]"
                        )}
                        title={data.name}
                    >
                        {data.name}
                    </h3>

                    {/* Price & Discount Display */}
                    <div className="flex items-end justify-between mt-auto">
                        <div className="flex flex-col items-start leading-none">
                            {discountInfo?.hasDiscount && (
                                <span className="text-[10px] line-through font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(discountInfo.originalPrice)} DA
                                </span>
                            )}
                            <span className={cn(
                                "font-black tabular-nums tracking-tight",
                                discountInfo?.hasDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white",
                                posUiSize === "sm" ? "text-[11px]" : posUiSize === "lg" ? "text-sm" : "text-xs"
                            )}>
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(discountInfo?.hasDiscount ? discountInfo.discountedPrice : displayPrice)}
                                <span className="text-[8px] font-semibold text-slate-400 ml-0.5">DA</span>
                            </span>
                        </div>

                        {/* Stock indicator — very subtle */}
                        {!isService && (
                            <span className={cn(
                                "text-[8px] font-bold tabular-nums",
                                (data.stock - quantityInCart) > 0
                                    ? isLowStock ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
                                    : "text-red-400"
                            )}>
                                {data.stock - quantityInCart}
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {/* Right-Click Detail Modal — Shows Prix d'Achat */}
            <Modal
                title=""
                description=""
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        {data.imageUrl && (
                            <div
                                className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 cursor-pointer border"
                                onClick={() => setShowImagePreview(true)}
                            >
                                <Image
                                    src={data.imageUrl}
                                    alt={data.name}
                                    fill
                                    className="object-cover"
                                    unoptimized={data.imageUrl.startsWith("/uploads/")}
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">{data.name}</h2>
                                {isService && <Badge className="bg-indigo-600 text-white font-bold">Service</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.category || "Catégorie générale"}</p>
                            {data.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">{data.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Prices Grid: Selling Price, Promo Price & Purchase Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">{chosenPriceName}</span>
                                <span className={cn("text-xl font-black tabular-nums tracking-tight", discountInfo?.hasDiscount ? "line-through text-slate-400" : "text-slate-900 dark:text-white")}>
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)} <span className="text-xs font-bold text-slate-400">DA</span>
                                </span>
                            </div>
                            <Badge className="bg-emerald-500 text-white font-black text-[10px]">Prix Vente</Badge>
                        </div>

                        {discountInfo?.hasDiscount && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Prix Promo ({discountInfo.label})</span>
                                    <span className="text-xl font-black text-rose-700 dark:text-rose-300 tabular-nums tracking-tight">
                                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(discountInfo.discountedPrice)} <span className="text-xs font-bold text-slate-400">DA</span>
                                    </span>
                                </div>
                                <Badge className="bg-rose-600 text-white font-black text-[10px]">Promo {discountInfo.label}</Badge>
                            </div>
                        )}

                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">Prix d'Achat (P.A)</span>
                                <span className="text-xl font-black text-amber-900 dark:text-amber-200 tabular-nums tracking-tight">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.cost || 0)} <span className="text-xs font-bold text-slate-400">DA</span>
                                </span>
                            </div>
                            <Badge className="bg-amber-600 text-white font-black text-[10px]">Coût</Badge>
                        </div>
                    </div>

                    {data.barcodes && data.barcodes.length > 0 && (
                        <div className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border flex items-center gap-2">
                            <Tag className="h-4 w-4 text-indigo-500" />
                            <span>Codes-barres: {data.barcodes.join(", ")}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowInfo(false)} className="font-bold text-xs">Fermer</Button>
                        {!outOfStock && (
                            <Button onClick={() => { onAddToCart(); setShowInfo(false); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
                                <ShoppingCart className="h-4 w-4" /> Ajouter ({new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(discountInfo?.hasDiscount ? discountInfo.discountedPrice : displayPrice)} DA)
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Image Fullscreen Preview */}
            {data.imageUrl && (
                <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
                    <DialogContent className="max-w-xl p-2 bg-slate-950 border-slate-800">
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                            <Image
                                src={data.imageUrl}
                                alt={data.name}
                                fill
                                className="object-contain"
                                unoptimized={data.imageUrl.startsWith("/uploads/")}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
