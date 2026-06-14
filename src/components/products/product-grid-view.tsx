"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/routing"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { ImageIcon, PackageIcon, Edit, Trash, History, PackageOpen } from "lucide-react"

import { ProductColumn } from "./columns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { deleteProduct } from "@/actions/products"
import { AlertModal } from "@/components/modals/alert-modal"
import { StockHistoryModal } from "./stock-history-modal"

interface ProductGridViewProps {
    data: ProductColumn[]
}

export const ProductGridView: React.FC<ProductGridViewProps> = ({ data }) => {
    const router = useRouter()
    const { data: session } = useSession()
    const t = useTranslations("Products.productGrid")
    const tProducts = useTranslations("Products")
    const tCommon = useTranslations("Common")

    const [selectedProduct, setSelectedProduct] = useState<ProductColumn | null>(null)
    const [deleteProductData, setDeleteProductData] = useState<ProductColumn | null>(null)
    const [loading, setLoading] = useState(false)

    const onDeleteConfirm = async () => {
        if (!deleteProductData) return
        try {
            setLoading(true)
            await deleteProduct(deleteProductData.id)
            toast.success(tProducts("messages.deleted"))
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(tProducts("messages.error"))
        } finally {
            setLoading(false)
            setDeleteProductData(null)
        }
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                <PackageOpen className="h-16 w-16 text-zinc-400 mb-4 stroke-[1.2]" />
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-250 mb-1">
                    {tCommon("noResults")}
                </h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                    Aucun produit ne correspond à vos critères de recherche.
                </p>
            </div>
        )
    }

    return (
        <>
            <AlertModal
                isOpen={deleteProductData !== null}
                onClose={() => setDeleteProductData(null)}
                onConfirm={onDeleteConfirm}
                loading={loading}
            />

            {selectedProduct && (
                <StockHistoryModal
                    isOpen={selectedProduct !== null}
                    onClose={() => setSelectedProduct(null)}
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-12">
                {data.map((product) => {
                    const hasImage = product.images && product.images.length > 0
                    const imageUrl = hasImage ? product.images[0].url : null
                    const isLowStock = product.stock <= product.minStock

                    return (
                        <Card 
                            key={product.id} 
                            className="group overflow-hidden relative flex flex-col hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-300 border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 rounded-xl"
                        >
                            {/* Top-left Badges (Featured/Archived) */}
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 pointer-events-none">
                                {product.isFeatured && (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 border-transparent shadow text-[10px] font-bold text-white px-2 py-0.5 rounded-full">
                                        {t("featured")}
                                    </Badge>
                                )}
                                {product.isArchived && (
                                    <Badge variant="secondary" className="bg-zinc-650 hover:bg-zinc-650 border-transparent text-white text-[10px] font-bold px-2 py-0.5 rounded-full opacity-90">
                                        {t("archived")}
                                    </Badge>
                                )}
                            </div>

                            {/* Always-visible Top-right Stock Badge */}
                            <div className="absolute top-2 right-2 z-10 pointer-events-none">
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "font-bold px-2 py-0.5 text-xs shadow-md backdrop-blur-md border",
                                        isLowStock
                                            ? "bg-red-50/90 text-red-750 border-red-200 dark:bg-red-950/90 dark:text-red-400 dark:border-red-900"
                                            : "bg-emerald-50/90 text-emerald-750 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-400 dark:border-emerald-900"
                                    )}
                                >
                                    <PackageIcon className="h-3 w-3 mr-1 inline-block shrink-0" />
                                    {product.stock}
                                </Badge>
                            </div>

                            {/* Image Container with Actions Slide-up Overlay */}
                            <div className={cn(
                                "relative w-full aspect-[4/3] bg-zinc-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-zinc-100 dark:border-zinc-900",
                                !hasImage && "opacity-80"
                            )}>
                                {hasImage ? (
                                    <Image
                                        src={imageUrl as string}
                                        alt={product.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                        unoptimized={(imageUrl as string).startsWith("/uploads/")}
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = "none";
                                            if (target.parentElement) {
                                                target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-zinc-300 dark:text-zinc-700"><span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Image introuvable</span></div>';
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                                        <ImageIcon className="h-10 w-10 mb-1 stroke-[1.2]" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t("noImage")}</span>
                                    </div>
                                )}

                                {/* Hover Slide-up Actions Overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-zinc-950/80 backdrop-blur-sm p-2 flex items-center justify-center gap-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-zinc-800 rounded-lg transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedProduct(product)
                                        }}
                                        title={tProducts("stockHistoryLabel")}
                                    >
                                        <History className="h-4 w-4" />
                                    </Button>

                                    {session?.user?.canEdit && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-zinc-800 rounded-lg transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/products/${product.id}`)
                                            }}
                                            title={tCommon("edit")}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}

                                    {session?.user?.canDelete && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeleteProductData(product)
                                            }}
                                            title={tCommon("delete")}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Card Details (Entire area is clickable to Edit) */}
                            <CardContent 
                                className="p-4 flex-1 flex flex-col justify-between cursor-pointer"
                                onClick={() => router.push(`/products/${product.id}`)}
                            >
                                <div className="space-y-1.5 flex-1">
                                    {/* Brand & Category Details */}
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-450 font-medium">
                                        {product.brand && (
                                            <span className="bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-bold">
                                                {product.brand}
                                            </span>
                                        )}
                                        {product.category && (
                                            <span className="truncate max-w-[100px]">
                                                {product.brand ? `• ${product.category}` : product.category}
                                            </span>
                                        )}
                                    </div>

                                    {/* Product Title */}
                                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {product.name}
                                    </h3>
                                </div>

                                {/* Pricing Section */}
                                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                                            {t("retailPrice")}
                                        </span>
                                        <span className="font-black text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            {product.price} <span className="text-xs font-semibold opacity-70">{t("currency")}</span>
                                        </span>
                                    </div>
                                    {product.wholesalePrice && Number(product.wholesalePrice) > 0 && (
                                        <div className="text-right flex flex-col">
                                            <span className="text-[8px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                                                {t("wholesalePrice")}
                                            </span>
                                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-350 tabular-nums">
                                                {product.wholesalePrice} <span className="text-[9px] opacity-70">{t("currency")}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </>
    )
}
