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
        <Card
            ref={ref}
            className={cn(
                "group cursor-pointer overflow-hidden rounded-lg lg:rounded-xl border bg-white dark:bg-[#131418] transition-all duration-300 ease-out flex flex-col p-2 lg:p-3 h-[85px] lg:h-[105px] justify-between relative select-none hover:-translate-y-1 active:scale-[0.98]",
                quantityInCart > 0
                    ? "border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.02] shadow-[0_4px_20px_rgba(16,185,129,0.08)]"
                    : "border-slate-100 dark:border-slate-900/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:border-slate-300/80 dark:hover:border-slate-800",
                outOfStock ? "opacity-40 cursor-not-allowed select-none bg-gray-50/20 dark:bg-slate-900/20" : "",
                isLowStock && quantityInCart === 0 ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/10 dark:bg-amber-950/5 shadow-amber-500/5" : ""
            )}
            onClick={outOfStock ? undefined : onAddToCart}
        >
            {/* Out of Stock Overlay */}
            {outOfStock && (
                <div className="absolute inset-0 bg-[#0f1115]/50 dark:bg-[#0f1115]/75 backdrop-blur-[0.5px] flex items-center justify-center z-10 select-none">
                    <span className="bg-red-600 dark:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-md shadow-lg border border-red-500/20 transform -rotate-3">
                        ÉPUISÉ
                    </span>
                </div>
            )}

            {/* Top row: Name and Stock */}
            <div className="relative w-full">
                <h3 className="font-bold text-gray-800 dark:text-slate-200 text-[10px] lg:text-xs line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-200 pr-7" title={data.name}>
                    {data.name}
                </h3>
                <div className={cn(
                    "absolute -top-0.5 right-0 shrink-0 text-[8px] lg:text-[9px] font-black px-1 py-0.5 rounded border flex items-center gap-1",
                    (data.stock - quantityInCart) > 0
                        ? isLowStock
                            ? "bg-amber-100/90 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-900/50"
                            : "bg-emerald-100/80 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-900/50"
                        : "bg-red-100/80 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-900/50"
                )}>
                    {isLowStock && <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                    {data.stock - quantityInCart}
                </div>
            </div>

            {/* Bottom row: Price and Cart Quantity */}
            <div className="flex justify-between items-end w-full">
                <div>
                    {quantityInCart > 0 && (
                        <span className="inline-flex items-center gap-1 text-[8px] lg:text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1 py-0.5 rounded border border-emerald-500/20 animate-in fade-in duration-300">
                            {quantityInCart}
                        </span>
                    )}
                </div>
                <div className="flex items-baseline gap-1 text-gray-900 dark:text-white">
                    <span className="font-black text-xs lg:text-[15px] leading-none">
                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)}
                    </span>
                </div>
            </div>

            <Modal
                title={t("productDetailsStock")}
                description={t("viewDetailedInventory", { name: data.name })}
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
            >
                <div className="space-y-6 pt-2">
                    <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                            {data.imageUrl ? (
                                <Image src={data.imageUrl} alt={data.name} fill className="object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-center text-gray-400 leading-tight">{t("noImg")}</div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-1">{data.name}</h3>
                            <p className="text-sm font-semibold text-primary/80 uppercase tracking-widest mt-1">{data.category}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{data.description || t("noDescription")}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-[#111318] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("currentStock")}</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                {data.stock}
                            </p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800/50">
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">{t("minStockAlert")}</p>
                            <p className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1">
                                {data.minStock}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-[#111318] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("sellingPrice")}</p>
                            <p className="text-2xl font-black text-primary mt-1">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#111318] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("unitCost")}</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.cost)}
                            </p>
                        </div>
                    </div>

                    {data.barcodes && data.barcodes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("linkedBarcodes")}</p>
                            <div className="flex flex-wrap gap-2">
                                {data.barcodes.map((code) => (
                                    <span key={code} className="px-3 py-1 bg-gray-100/50 dark:bg-gray-800/50 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </Card>
    )
}
