"use client"

import { ProductColumn } from "./columns"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, PackageIcon, TagIcon, Edit, Trash, Barcode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { CellAction } from "./cell-action"
import { useTranslations } from "next-intl"

interface ProductGridViewProps {
    data: ProductColumn[]
}

export const ProductGridView: React.FC<ProductGridViewProps> = ({ data }) => {
    const t = useTranslations("Products.productGrid")

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            {data.map((product) => {
                const hasImage = product.images && product.images.length > 0;
                const imageUrl = hasImage ? product.images[0].url : null;
                const isLowStock = product.stock <= product.minStock;

                return (
                    <Card key={product.id} className="group overflow-hidden relative flex flex-col hover:shadow-lg transition-all duration-300 border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-zinc-950">
                        {/* Overlay Actions Header (Cell Action Dropdown) */}
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-md shadow-sm border border-border">
                                <CellAction data={product} />
                            </div>
                        </div>

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 align-start pointer-events-none">
                            {product.isFeatured && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 border-transparent shadow-sm text-white px-2 py-0.5 rounded-full shadow-amber-500/20">
                                    {t("featured")}
                                </Badge>
                            )}
                            {product.isArchived && (
                                <Badge variant="secondary" className="bg-zinc-500 hover:bg-zinc-600 border-transparent text-white px-2 py-0.5 rounded-full opacity-90 shadow-sm shadow-zinc-500/20">
                                    {t("archived")}
                                </Badge>
                            )}
                        </div>

                        {/* Image Area */}
                        <div className={cn(
                            "relative w-full aspect-[4/3] bg-zinc-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center",
                            !hasImage && "opacity-80 border-b border-border/50"
                        )}>
                            {hasImage ? (
                                <Image
                                    src={imageUrl as string}
                                    alt={product.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                                    <ImageIcon className="h-12 w-12 mb-2 stroke-[1.5]" />
                                    <span className="text-xs font-semibold uppercase tracking-widest">{t("noImage")}</span>
                                </div>
                            )}

                            {/* Gradient Overlay for bottom text clarity if needed */}
                            {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
                        </div>

                        {/* Content Area */}
                        <CardContent className="p-5 flex-1 flex flex-col">
                            {/* Tags */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <Badge variant="outline" className="px-2 py-0.5 text-xs font-semibold tracking-wider text-indigo-700 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400">
                                    {product.brand}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium bg-muted/50 px-2 py-0.5 rounded-md">
                                    <TagIcon className="h-3.5 w-3.5 inline-block opacity-70" />
                                    {product.category}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="font-bold text-lg leading-tight tracking-tight line-clamp-2 mb-4 text-zinc-900 dark:text-zinc-100 flex-1">
                                {product.name}
                            </h3>

                            {/* Prices Grid */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-border/50">
                                <div className="col-span-2">
                                    <p className="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-0.5">{t("retailPrice")}</p>
                                    <p className="font-black text-2xl text-emerald-600 dark:text-emerald-400 leading-none">
                                        {product.price} <span className="text-sm font-bold font-sans text-emerald-700/70 dark:text-emerald-500/70">{t("currency")}</span>
                                    </p>
                                </div>
                                <div className="pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{t("wholesalePrice")}</p>
                                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                        {product.wholesalePrice} <span className="text-[10px] font-medium text-zinc-500">{t("currency")}</span>
                                    </p>
                                </div>
                                <div className="pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{t("dealerPrice")}</p>
                                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                        {product.dealerPrice} <span className="text-[10px] font-medium text-zinc-500">{t("currency")}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Footer/Stock Area inline */}
                            <div className="flex items-center justify-between mt-auto">
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border",
                                    isLowStock
                                        ? "bg-red-50 text-red-600 border-red-200 shadow-red-500/10 dark:bg-red-950/30 dark:border-red-900/50"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-900/50"
                                )}>
                                    <PackageIcon className="h-4 w-4" />
                                    <span>{t("stock")}{product.stock} {isLowStock && "⚠"}</span>
                                </div>

                                <span className="text-xs font-medium text-muted-foreground">
                                    {product.createdAt}
                                </span>
                            </div>

                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
