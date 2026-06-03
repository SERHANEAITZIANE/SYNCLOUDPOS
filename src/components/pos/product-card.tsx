"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { ShoppingCart, Info } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { usePosStore, CartItem } from "@/hooks/use-pos-store"
import { useSwipe } from "@/hooks/use-swipe"

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
        stock: number
        barcodes: string[]
    }
    blockNegativeStock?: boolean
}

export const ProductCard: React.FC<ProductCardProps> = ({
    data,
    blockNegativeStock = false
}) => {
    const cart = usePosStore()
    const t = useTranslations("ProductCard")
    const tCommon = useTranslations("Common")
    const [showInfo, setShowInfo] = useState(false)

    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);
    const clientType = activeSession?.clientType || 'RETAIL';
    let displayPrice = data.price;
    if (clientType === 'RESELLER' && data.dealerPrice != null) displayPrice = data.dealerPrice;
    if (clientType === 'WHOLESALE' && data.wholesalePrice != null) displayPrice = data.wholesalePrice;

    // Find if this product is already in cart
    const cartItem = activeSession?.items.find(item => item.productId === data.id);
    const quantityInCart = cartItem?.quantity || 0;

    const onAddToCart = () => {
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
            image: data.imageUrl
        })
    }

    const onRemoveFromCart = () => {
        if (quantityInCart > 0) {
            cart.removeItem(cartItem!.id);
        }
    }

    // Swipe handlers for gesture navigation
    const handleSwipeRight = useCallback(() => {
        // Swipe right adds another unit of the product
        onAddToCart();
    }, [onAddToCart]);

    const handleSwipeLeft = useCallback(() => {
        // Swipe left removes one unit of the product
        onRemoveFromCart();
    }, [onRemoveFromCart]);

    // Setup swipe detection
    const { ref } = useSwipe({
        onSwipeRight: handleSwipeRight,
        onSwipeLeft: handleSwipeLeft,
        onLongPress: () => setShowInfo(true),
        threshold: 50,
        preventDefaultTouchmoveEvent: true
    });
    const outOfStock = blockNegativeStock && (data.stock - quantityInCart) <= 0;
    const isLowStock = (data.stock - quantityInCart) > 0 && (data.stock - quantityInCart) <= data.minStock;

    return (
        <>
            <Card
                ref={ref}
                className={cn(
                    "group cursor-pointer overflow-hidden rounded-lg border bg-white dark:bg-[#131418] transition-all duration-200 ease-out flex flex-col p-1.5 lg:p-2 h-[68px] lg:h-[78px] justify-between relative select-none active:scale-[0.97]",
                    quantityInCart > 0
                        ? "border-emerald-500/50 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/[0.03] shadow-[0_2px_12px_rgba(16,185,129,0.1)]"
                        : "border-slate-100 dark:border-slate-900/60 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:border-slate-200 dark:hover:border-slate-800",
                    outOfStock ? "opacity-40 cursor-not-allowed select-none" : "",
                    isLowStock && quantityInCart === 0 ? "border-amber-200 dark:border-amber-800/60" : ""
                )}
                onClick={outOfStock ? undefined : onAddToCart}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setShowInfo(true);
                }}
            >
                {/* Out of Stock Overlay */}
                {outOfStock && (
                    <div className="absolute inset-0 bg-[#0f1115]/40 dark:bg-[#0f1115]/70 backdrop-blur-[0.5px] flex items-center justify-center z-10 select-none">
                        <span className="bg-red-600 text-white text-[8px] font-black uppercase tracking-wider py-0.5 px-2 rounded shadow-lg transform -rotate-2">
                            ÉPUISÉ
                        </span>
                    </div>
                )}

                {/* Top row: Name + Stock */}
                <div className="flex items-start justify-between gap-1 w-full min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-[9px] lg:text-[10px] line-clamp-2 leading-[1.3] group-hover:text-primary transition-colors duration-150 flex-1 min-w-0" title={data.name}>
                        {data.name}
                    </h3>
                    <div className={cn(
                        "shrink-0 text-[7px] lg:text-[8px] font-bold px-1 py-px rounded tabular-nums",
                        (data.stock - quantityInCart) > 0
                            ? isLowStock
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                    )}>
                        {isLowStock && <span className="inline-block h-1 w-1 rounded-full bg-amber-500 animate-pulse mr-0.5 align-middle" />}
                        {data.stock - quantityInCart}
                    </div>
                </div>

                {/* Bottom row: Cart Qty + Price */}
                <div className="flex justify-between items-end w-full">
                    <div className="h-4">
                        {quantityInCart > 0 && (
                            <span className="inline-flex items-center justify-center text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 min-w-[16px] h-4 px-1 rounded border border-emerald-500/20 animate-in fade-in duration-200">
                                ×{quantityInCart}
                            </span>
                        )}
                    </div>
                    <span className="font-black text-[11px] lg:text-[13px] leading-none text-gray-900 dark:text-white tabular-nums">
                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)}
                    </span>
                </div>
            </Card>

            <Modal
                title=""
                description=""
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                className="max-w-[360px] p-4 rounded-xl gap-2 border-slate-150 dark:border-slate-800 shadow-2xl bg-white dark:bg-[#131418] overflow-hidden"
            >
                <div className="space-y-4 pt-1" onClick={(e) => e.stopPropagation()}>
                    {/* Header: Compact Info */}
                    <div className="flex gap-3">
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shrink-0">
                            {data.imageUrl ? (
                                <Image src={data.imageUrl} alt={data.name} fill className="object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/40 uppercase leading-none">
                                    No Image
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <span className="text-[9px] font-bold tracking-widest text-primary/80 uppercase">
                                {data.category || "General"}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5 line-clamp-2">
                                {data.name}
                            </h3>
                        </div>
                    </div>

                    {/* Stock status indicator */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800/40 flex flex-col justify-between">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("currentStock")}</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={cn(
                                    "text-lg font-black tracking-tight",
                                    data.stock > data.minStock ? "text-emerald-600 dark:text-emerald-400" :
                                    data.stock > 0 ? "text-amber-500" : "text-rose-500"
                                )}>
                                    {data.stock}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-600 font-semibold">un.</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800/40 flex flex-col justify-between">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alerte Min</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                    {data.minStock}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-600 font-semibold">un.</span>
                            </div>
                        </div>
                    </div>

                    {/* Prices list */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800/50 overflow-hidden">
                        <div className="px-2.5 py-1.5 bg-slate-100/50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/40 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grille Tarifaire (DZD)</span>
                            {data.cost > 0 && (
                                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                                    P.A: {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(data.cost)}
                                </span>
                            )}
                        </div>
                        <div className="p-2 space-y-1.5 text-[11px]">
                            {/* Retail price */}
                            <div className={cn(
                                "flex justify-between items-center py-0.5 px-1.5 rounded",
                                clientType === 'RETAIL' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"
                            )}>
                                <span>Détail (Retail)</span>
                                <span className="font-mono">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(data.price)}</span>
                            </div>
                            {/* Wholesale price */}
                            {data.wholesalePrice && (
                                <div className={cn(
                                    "flex justify-between items-center py-0.5 px-1.5 rounded",
                                    clientType === 'WHOLESALE' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                )}>
                                    <span>Gros (Wholesale)</span>
                                    <span className="font-mono">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(data.wholesalePrice)}</span>
                                </div>
                            )}
                            {/* Dealer price */}
                            {data.dealerPrice && (
                                <div className={cn(
                                    "flex justify-between items-center py-0.5 px-1.5 rounded",
                                    clientType === 'RESELLER' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                )}>
                                    <span>Revendeur (Dealer)</span>
                                    <span className="font-mono">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(data.dealerPrice)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Barcodes */}
                    {data.barcodes && data.barcodes.length > 0 && (
                        <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("linkedBarcodes")}</span>
                            <div className="flex flex-wrap gap-1">
                                {data.barcodes.map((code) => (
                                    <span key={code} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-[9px] font-mono rounded text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {data.description && (
                        <div className="space-y-1 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Description</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-3">
                                {data.description}
                            </p>
                        </div>
                    )}

                    {/* Add to cart / Action Button inside Modal */}
                    <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-8 text-[11px] rounded-lg border-slate-200 dark:border-slate-800"
                            onClick={() => setShowInfo(false)}
                        >
                            {tCommon("close")}
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 h-8 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold"
                            disabled={outOfStock}
                            onClick={() => {
                                onAddToCart();
                                setShowInfo(false);
                            }}
                        >
                            + Ajouter au Panier
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    )
}
