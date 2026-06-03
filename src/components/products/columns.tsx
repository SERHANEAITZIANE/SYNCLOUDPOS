"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { CellAction } from "./cell-action"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { PackageIcon, Star, Archive, ImageIcon } from "lucide-react"
import Image from "next/image"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export type ProductColumn = {
    id: string
    name: string
    price: string
    cost: string
    wholesalePrice: string
    dealerPrice: string
    category: string
    brand: string
    isFeatured: boolean
    isArchived: boolean
    stock: number
    minStock: number
    createdAt: string
    images: { url: string }[]
}

export function useProductColumns(): ColumnDef<ProductColumn>[] {
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")

    return [
        // Actions moved to the left/first position
        {
            id: "actions",
            header: "",
            cell: ({ row }) => <CellAction data={row.original} />,
            size: 140,
        },
        // Product name with image thumbnail and inline status icons
        {
            accessorKey: "name",
            header: t("fields.name"),
            cell: ({ row }) => {
                const hasImage = row.original.images && row.original.images.length > 0
                const imageUrl = hasImage ? row.original.images[0].url : null
                return (
                    <div className="flex items-center gap-3 min-w-[200px] max-w-[350px]">
                        <div className={cn(
                            "relative h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700",
                            !hasImage && "bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                        )}>
                            {hasImage ? (
                                <Image
                                    src={imageUrl as string}
                                    alt={row.original.name}
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                />
                            ) : (
                                <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                    {row.original.name}
                                </span>
                                {row.original.isFeatured && (
                                    <span title="Mis en avant" className="flex shrink-0">
                                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                    </span>
                                )}
                                {row.original.isArchived && (
                                    <span title="Archivé" className="flex shrink-0">
                                        <Archive className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                                {row.original.createdAt}
                            </span>
                        </div>
                    </div>
                )
            }
        },
        // Category only
        {
            accessorKey: "category",
            header: t("fields.category"),
            cell: ({ row }) => row.original.category ? (
                <Badge variant="outline" className="w-fit text-[11px] font-semibold tracking-wide px-2 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/50">
                    {row.original.category}
                </Badge>
            ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-650">—</span>
            ),
        },
        // Brand as its own column
        {
            accessorKey: "brand",
            header: t("fields.brand") || "Marque",
            cell: ({ row }) => row.original.brand && row.original.brand !== "N/A" ? (
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                    {row.original.brand}
                </span>
            ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-650">—</span>
            )
        },
        // Cost (Prix Achat)
        {
            accessorKey: "cost",
            header: "Achat",
            cell: ({ row }) => (
                <span className="font-semibold text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                    {Number(row.original.cost).toLocaleString("fr-DZ")} <span className="text-[9px] opacity-60">DA</span>
                </span>
            )
        },
        // Consolidated Price column with Hover Tooltip showing details
        {
            accessorKey: "price",
            header: t("fields.price") || "Vente",
            cell: ({ row }) => {
                const price = Number(row.original.price).toLocaleString("fr-DZ")
                const cost = Number(row.original.cost).toLocaleString("fr-DZ")
                const wholesale = Number(row.original.wholesalePrice).toLocaleString("fr-DZ")
                const dealer = Number(row.original.dealerPrice).toLocaleString("fr-DZ")

                return (
                    <TooltipProvider delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="font-bold text-sm tabular-nums text-emerald-600 dark:text-emerald-450 cursor-help border-b border-dashed border-emerald-500/40 pb-0.5 transition-all hover:border-emerald-500">
                                    {price} <span className="text-[10px] font-semibold opacity-60">DA</span>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="p-3 bg-zinc-950 text-zinc-100 border-zinc-800 rounded-lg shadow-xl min-w-[180px]">
                                <div className="space-y-1.5 text-xs">
                                    <p className="font-bold border-b border-zinc-850 pb-1 mb-1.5 text-[10px] text-zinc-400 uppercase tracking-wider">
                                        Grille Tarifaire
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        <span className="text-zinc-400">Achat:</span>
                                        <span className="font-medium text-right tabular-nums text-zinc-300">{cost} DA</span>
                                        
                                        <span className="text-emerald-400 font-semibold">Vente (Détail):</span>
                                        <span className="font-bold text-emerald-455 text-right tabular-nums">{price} DA</span>
                                        
                                        <span className="text-zinc-400">Gros:</span>
                                        <span className="font-medium text-right tabular-nums text-zinc-300">{wholesale} DA</span>
                                        
                                        <span className="text-zinc-400">Revendeur:</span>
                                        <span className="font-medium text-right tabular-nums text-zinc-300">{dealer} DA</span>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }
        },
        // Wholesale Price (Prix Gros)
        {
            accessorKey: "wholesalePrice",
            header: t("fields.wholesalePrice") || "Gros",
            cell: ({ row }) => (
                <span className="font-semibold text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                    {Number(row.original.wholesalePrice).toLocaleString("fr-DZ")} <span className="text-[9px] opacity-60">DA</span>
                </span>
            )
        },
        // Dealer Price (Prix Revendeur)
        {
            accessorKey: "dealerPrice",
            header: t("fields.dealerPrice") || "Revendeur",
            cell: ({ row }) => (
                <span className="font-semibold text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                    {Number(row.original.dealerPrice).toLocaleString("fr-DZ")} <span className="text-[9px] opacity-60">DA</span>
                </span>
            )
        },
        // Calculated Profit Margin column (cost -> price)
        {
            id: "margin",
            header: "Marge",
            cell: ({ row }) => {
                const cost = Number(row.original.cost || 0)
                const price = Number(row.original.price || 0)
                const margin = cost > 0 && price > 0 ? ((price - cost) / cost) * 100 : 0
                const isPositive = margin >= 0
                return (
                    <span className={cn(
                        "font-semibold tabular-nums text-xs",
                        cost > 0 && price > 0
                            ? isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            : "text-zinc-400 dark:text-zinc-650"
                    )}>
                        {cost > 0 && price > 0 ? `${margin.toFixed(0)}%` : "—"}
                    </span>
                )
            }
        },
        // Stock with visual indicator
        {
            accessorKey: "stock",
            header: t("fields.stock"),
            cell: ({ row }) => {
                const stock = Number(row.getValue("stock"))
                const minStock = row.original.minStock
                const isLow = stock <= minStock
                const isOut = stock <= 0
                return (
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                            isOut
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                                : isLow
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                        )}>
                            <PackageIcon className="h-3 w-3" />
                            <span className="tabular-nums">{stock}</span>
                            {isLow && <span className="text-[10px]">⚠</span>}
                        </div>
                    </div>
                )
            }
        },
        // CreatedAt Date
        {
            accessorKey: "createdAt",
            header: tCommon("date") || "Date",
            cell: ({ row }) => (
                <span className="text-xs text-zinc-400 dark:text-zinc-550 font-medium whitespace-nowrap">
                    {row.original.createdAt}
                </span>
            )
        },
    ]
}

// Legacy compat shim — update client.tsx to call useProductColumns() instead
export const columns: ColumnDef<ProductColumn>[] = []
