"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { ShoppingCart, Info } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn, scrollIntoViewSafe } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
    isFocused?: boolean
    posUiSize?: "sm" | "md" | "lg"
}

export const ProductCard: React.FC<ProductCardProps> = ({
    data,
    blockNegativeStock = false,
    isFocused = false,
    posUiSize = "md"
}) => {
    const cart = usePosStore()
    const t = useTranslations("ProductCard")
    const tCommon = useTranslations("Common")
    const [showInfo, setShowInfo] = useState(false)
    const [showImagePreview, setShowImagePreview] = useState(false)

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

    useEffect(() => {
        if (isFocused && ref.current) {
            scrollIntoViewSafe(ref.current);
        }
    }, [isFocused, ref]);
    const outOfStock = blockNegativeStock && (data.stock - quantityInCart) <= 0;
    const isLowStock = (data.stock - quantityInCart) > 0 && (data.stock - quantityInCart) <= data.minStock;

    return (
        <>
            <Card
                ref={ref}
                className={cn(
                    "group cursor-pointer overflow-hidden rounded-xl border !bg-white dark:!bg-[#1c1e26] transition-all duration-200 ease-out flex flex-col p-0 gap-0 relative select-none active:scale-[0.97] hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
                    quantityInCart > 0
                        ? "border-emerald-500/60 dark:border-emerald-500/40 shadow-[0_2px_16px_rgba(16,185,129,0.12)]"
                        : "border-slate-200/70 dark:border-[#2a2d36] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-600",
                    outOfStock ? "opacity-40 cursor-not-allowed select-none" : "",
                    isLowStock && quantityInCart === 0 ? "border-amber-300/60 dark:border-amber-700/40" : "",
                    isFocused ? "ring-2 ring-indigo-500 dark:ring-indigo-400 scale-[1.02] z-10 border-transparent shadow-[0_0_20px_rgba(99,102,241,0.35)]" : ""
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
                        <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-md shadow-lg transform -rotate-3">
                            ÉPUISÉ
                        </span>
                    </div>
                )}

                {/* Cart Quantity Badge - top right corner */}
                {quantityInCart > 0 && (
                    <div className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md animate-in zoom-in-75 duration-150 border-2 border-white dark:border-[#1c1e26]">
                        {quantityInCart}
                    </div>
                )}

                {/* Low stock indicator - top left corner */}
                {isLowStock && quantityInCart === 0 && (
                    <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[8px] font-bold border border-amber-200 dark:border-amber-800/50">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Stock bas
                    </div>
                )}

                {/* Centered Product Image */}
                <div className="relative w-full aspect-square overflow-hidden bg-slate-100 dark:bg-[#22252e]">
                    {data.imageUrl ? (
                        <Image 
                            src={data.imageUrl} 
                            alt={data.name} 
                            fill 
                            className="object-cover transition-transform duration-300 group-hover:scale-105" 
                            unoptimized={data.imageUrl.startsWith("/uploads/")}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 dark:text-slate-600">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                <circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                            </svg>
                        </div>
                    )}
                </div>

                {/* Product Info - Below Image */}
                <div className={cn(
                    "flex flex-col flex-1 min-h-0",
                    posUiSize === "sm" ? "p-1.5 gap-0" : posUiSize === "lg" ? "p-3 gap-1" : "p-2 gap-0.5"
                )}>
                    {/* Product Name */}
                    <h3 
                        className={cn(
                            "font-bold text-gray-800 dark:text-slate-200 leading-tight line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-150",
                            posUiSize === "sm" ? "text-[8.5px] lg:text-[9.5px]" : posUiSize === "lg" ? "text-[12px] lg:text-[13px]" : "text-[10px] lg:text-[11px]"
                        )} 
                        title={data.name}
                    >
                        {data.name}
                    </h3>

                    {/* Price + Stock Row */}
                    <div className={cn("flex items-end justify-between mt-auto", posUiSize === "sm" ? "pt-0.5" : "pt-1")}>
                        <span className={cn(
                            "font-black leading-none text-gray-900 dark:text-white tabular-nums",
                            posUiSize === "sm" ? "text-[10px] lg:text-[11px]" : posUiSize === "lg" ? "text-[13px] lg:text-[15px]" : "text-[11px] lg:text-[13px]"
                        )}>
                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className={cn(
                                "font-bold px-1 py-px rounded tabular-nums",
                                posUiSize === "sm" ? "text-[7px]" : posUiSize === "lg" ? "text-[9px]" : "text-[8px]",
                                (data.stock - quantityInCart) > 0
                                    ? isLowStock
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                    : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                            )}>
                                {data.stock - quantityInCart}
                            </span>
                            {posUiSize !== "sm" && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    type="button"
                                    className="h-5 w-5 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowInfo(true);
                                    }}
                                    title={tCommon("view") || "Détails"}
                                >
                                    <Info size={11} />
                                </Button>
                            )}
                        </div>
                    </div>
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
                        <div 
                            className={cn(
                                "relative h-16 w-16 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shrink-0",
                                data.imageUrl ? "cursor-zoom-in hover:opacity-90 transition-opacity" : ""
                            )}
                            onClick={data.imageUrl ? (e) => {
                                e.stopPropagation();
                                setShowImagePreview(true);
                            } : undefined}
                        >
                            {data.imageUrl ? (
                                <Image src={data.imageUrl} alt={data.name} fill className="object-cover" unoptimized={data.imageUrl.startsWith("/uploads/")} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
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


            {/* Beautiful Lightbox Image Preview Dialog */}
            {data.imageUrl && (
                <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
                    <DialogContent className="max-w-[440px] p-0 overflow-hidden border-none bg-black/95 backdrop-blur-md shadow-2xl rounded-2xl z-[300] flex flex-col items-center justify-center gap-0 focus:outline-none">
                        <div className="relative w-full aspect-square flex items-center justify-center bg-zinc-950/20 p-2">
                            <Image 
                                src={data.imageUrl} 
                                alt={data.name} 
                                fill 
                                sizes="(max-width: 440px) 100vw, 440px"
                                className="object-contain p-2 animate-in zoom-in-95 duration-200" 
                                priority
                                unoptimized={data.imageUrl.startsWith("/uploads/")}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                        </div>
                        {/* Footer overlay */}
                        <div className="w-full bg-[#131418]/90 border-t border-slate-800/40 px-5 py-4 flex flex-col gap-1 select-text">
                            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">
                                {data.category || "General"}
                            </span>
                            <h3 className="text-sm font-black text-white leading-tight">
                                {data.name}
                            </h3>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-[11px] font-bold text-slate-400">
                                    Stock: <span className="text-white font-black">{data.stock}</span> un.
                                </span>
                                <span className="text-sm font-black text-white tabular-nums">
                                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD", minimumFractionDigits: 2 }).format(displayPrice)}
                                </span>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
