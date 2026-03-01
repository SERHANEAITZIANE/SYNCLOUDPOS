"use client"

import { useState } from "react"
import Image from "next/image"
import { ShoppingCart, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { usePosStore, CartItem } from "@/hooks/use-pos-store"

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
}

export const ProductCard: React.FC<ProductCardProps> = ({
    data
}) => {
    const cart = usePosStore()
    const [showInfo, setShowInfo] = useState(false)

    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId);
    const clientType = activeSession?.clientType || 'RETAIL';
    let displayPrice = data.price;
    if (clientType === 'RESELLER' && data.dealerPrice != null) displayPrice = data.dealerPrice;
    if (clientType === 'WHOLESALE' && data.wholesalePrice != null) displayPrice = data.wholesalePrice;

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

    return (
        <Card className={cn(
            "group cursor-pointer overflow-hidden rounded-xl lg:rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-primary/20 transition-all duration-200 flex flex-col p-2.5 lg:p-4 h-[100px] lg:h-32 justify-between relative",
            data.stock <= 0 ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10" : ""
        )} onClick={onAddToCart}>
            {/* Top row: Name and Stock */}
            <div className="relative w-full">
                <h3 className="font-bold text-gray-800 dark:text-slate-200 text-[11px] lg:text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200 pr-7" title={data.name}>
                    {data.name}
                </h3>
                <div className={cn(
                    "absolute -top-0.5 right-0 shrink-0 text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                    data.stock > 0
                        ? "bg-emerald-100/80 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-900/50"
                        : "bg-red-100/80 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-900/50"
                )}>
                    {data.stock}
                </div>
            </div>

            {/* Bottom row: Price */}
            <div className="flex justify-end items-end">
                <div className="flex items-baseline gap-1 text-gray-900 dark:text-white">
                    <span className="font-black text-sm lg:text-xl leading-none">
                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)}
                    </span>
                </div>
            </div>

            <Modal
                title="Product Details & Stock"
                description={`View detailed inventory info for ${data.name}`}
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
            >
                <div className="space-y-6 pt-2">
                    <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                            {data.imageUrl ? (
                                <Image src={data.imageUrl} alt={data.name} fill className="object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No Img</div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-1">{data.name}</h3>
                            <p className="text-sm font-semibold text-primary/80 uppercase tracking-widest mt-1">{data.category}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{data.description || "No description available."}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-[#111318] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Stock</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                {data.stock}
                            </p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800/50">
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Min. Stock Alert</p>
                            <p className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1">
                                {data.minStock}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-[#111318] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Selling Price</p>
                            <p className="text-2xl font-black text-primary mt-1">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPrice)}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#111318] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Unit Cost</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.cost)}
                            </p>
                        </div>
                    </div>

                    {data.barcodes && data.barcodes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Linked Barcodes</p>
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
