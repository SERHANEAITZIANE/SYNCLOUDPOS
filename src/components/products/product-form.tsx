"use client"

import * as z from "zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash, Plus, Wand2, Package, Tag, Barcode, Star, Archive, DollarSign, ShoppingCart, Users, Store } from "lucide-react"

// Local interfaces
interface ProductImage { url: string; id?: string; productId?: string }
interface Product {
    id: string; name: string; price: number | any; categoryId: string; brandId: string
    images: ProductImage[]; isFeatured: boolean; isArchived: boolean
    wholesalePrice?: number | null; dealerPrice?: number | null; cost?: number | null
    stock: number; minStock: number; barcodes?: { id?: string; value: string; label?: string | null }[]
    description?: string | null; colorId?: string | null; sizeId?: string | null
    tvaRate?: number | null
    createdAt: Date; updatedAt: Date; tenantId: string
}
interface Brand { id: string; name: string }
interface Category { id: string; name: string }

import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/modals/alert-modal"
import { toast } from "react-hot-toast"
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductSchema } from "@/schemas"
import { createProduct, deleteProduct, updateProduct, suggestProductNames } from "@/actions/products"
import { generateNextBarcode } from "@/actions/barcode"
import { ImageUpload } from "@/components/ui/image-upload"
import { PrintBarcodeModal } from "./print-barcode-modal"
import { FastCreateBrand } from "./fast-create-brand"
import { FastCreateCategory } from "./fast-create-category"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ProductFormProps {
    initialData: Product | null
    categories: Category[]
    brands: Brand[]
    tvaEnabled?: boolean
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, categories, brands, tvaEnabled = false }) => {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1)
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")

    const title = initialData ? tCommon("edit") : tCommon("addNew")
    const action = initialData ? tCommon("save") : tCommon("save")

    const form = useForm<z.infer<typeof ProductSchema>>({
        resolver: zodResolver(ProductSchema),
        defaultValues: initialData ? {
            ...initialData,
            price: parseFloat(String(initialData.price)),
            cost: initialData.cost ? parseFloat(String(initialData.cost)) : 0,
            wholesalePrice: initialData.wholesalePrice ? parseFloat(String(initialData.wholesalePrice)) : 0,
            dealerPrice: initialData.dealerPrice ? parseFloat(String(initialData.dealerPrice)) : 0,
            stock: initialData.stock,
            minStock: initialData.minStock,
            tvaRate: initialData.tvaRate ?? 0,
            barcodes: initialData.barcodes?.map(b => ({ value: b.value, label: b.label || "" })) || [],
            description: initialData.description || "",
            categoryId: initialData.categoryId || "",
            brandId: initialData.brandId || "",
            isFeatured: initialData.isFeatured || false,
            isArchived: initialData.isArchived || false,
            images: initialData.images || []
        } : {
            name: "", images: [], price: 0, cost: 0, wholesalePrice: 0, dealerPrice: 0,
            stock: 0, minStock: 0, categoryId: "", brandId: "", description: "", barcodes: [],
            isFeatured: false, isArchived: false, tvaRate: 0,
        }
    } as any)

    const onSubmit = async (values: z.infer<typeof ProductSchema>) => {
        try {
            setLoading(true)
            const result = initialData
                ? await updateProduct(initialData.id, values)
                : await createProduct(values)
            if (!result.error) {
                toast.success(t("messages.saved"))
                router.refresh()
                router.push(`/products`)
            } else {
                toast.error(result.error || tCommon("error"))
                console.error(result.error)
            }
        } catch (error) {
            toast.error(tCommon("error"))
            console.error("Something went wrong", error)
        } finally {
            setLoading(false)
        }
    }

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deleteProduct(initialData?.id as string)
            if (!result.error) {
                toast.success(t("messages.deleted"))
                router.refresh()
                router.push(`/products`)
            } else {
                toast.error(result.error || t("messages.error"))
            }
        } catch (error) {
            toast.error(t("messages.error"))
            console.error(error)
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    const renderPriceInput = ({
        name, label, description, icon: Icon, color = "default"
    }: {
        name: keyof z.infer<typeof ProductSchema>
        label: string
        description?: string
        icon: React.ElementType
        color?: "default" | "blue" | "green" | "amber" | "purple"
    }) => {
        const colorMap = {
            default: "text-muted-foreground bg-muted",
            blue: "text-blue-600 bg-blue-50 dark:bg-blue-950",
            green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950",
            amber: "text-amber-600 bg-amber-50 dark:bg-amber-950",
            purple: "text-purple-600 bg-purple-50 dark:bg-purple-950",
        }

        return (
            <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                            <span className={cn("rounded-md p-1", colorMap[color])}>
                                <Icon className="h-3.5 w-3.5" />
                            </span>
                            {label}
                        </FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.01"
                                    disabled={loading}
                                    placeholder="0.00"
                                    className="pr-12"
                                    {...field}
                                    value={field.value as string | number || ""}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                                    DA
                                </span>
                            </div>
                        </FormControl>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        <FormMessage />
                    </FormItem>
                )}
            />
        )
    }

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <div className="flex items-center justify-between">
                <Heading title={title} description={t("subtitle")} />
                <div className="flex items-center gap-2">
                    <PrintBarcodeModal
                        productName={form.watch("name") || ""}
                        price={Number(form.watch("price") || 0)}
                        barcodes={(form.watch("barcodes") || []).map(b => ({ value: b.value, label: b.label || "" }))}
                    />
                    {initialData && (
                        <Button disabled={loading} variant="destructive" size="icon" onClick={() => setOpen(true)}>
                            <Trash className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <Separator />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* ── TWO-PANEL LAYOUT ─────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* ── LEFT PANEL (2/3 width) ──────────────────── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* GENERAL INFO CARD */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        {t("form.generalInfo")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("fields.name")}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            autoFocus={!initialData}
                                                            disabled={loading}
                                                            placeholder={t("form.namePlaceholder")}
                                                            {...field}
                                                            onChange={async (e) => {
                                                                const val = e.target.value
                                                                field.onChange(val)
                                                                if (val.trim()) {
                                                                    const res = await suggestProductNames(val)
                                                                    setSuggestions(res)
                                                                    setShowSuggestions(res.length > 0)
                                                                } else {
                                                                    setSuggestions([])
                                                                    setShowSuggestions(false)
                                                                }
                                                                setFocusedSuggestionIndex(-1)
                                                            }}
                                                            onFocus={async () => {
                                                                const val = field.value || ""
                                                                if (val.trim()) {
                                                                    const res = await suggestProductNames(val)
                                                                    setSuggestions(res)
                                                                    setShowSuggestions(res.length > 0)
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                // Small timeout so click events can fire
                                                                setTimeout(() => setShowSuggestions(false), 200)
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (!showSuggestions || suggestions.length === 0) return

                                                                if (e.key === "ArrowDown") {
                                                                    e.preventDefault()
                                                                    setFocusedSuggestionIndex(prev => 
                                                                        prev < suggestions.length - 1 ? prev + 1 : 0
                                                                    )
                                                                } else if (e.key === "ArrowUp") {
                                                                    e.preventDefault()
                                                                    setFocusedSuggestionIndex(prev => 
                                                                        prev > 0 ? prev - 1 : suggestions.length - 1
                                                                    )
                                                                } else if (e.key === "Enter") {
                                                                    if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
                                                                        e.preventDefault()
                                                                        field.onChange(suggestions[focusedSuggestionIndex])
                                                                        setShowSuggestions(false)
                                                                    }
                                                                } else if (e.key === "Escape") {
                                                                    setShowSuggestions(false)
                                                                }
                                                            }}
                                                            autoComplete="off"
                                                        />
                                                        {showSuggestions && suggestions.length > 0 && (
                                                            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-border/85 rounded-lg shadow-xl divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-100">
                                                                {suggestions.map((name, idx) => (
                                                                    <div
                                                                        key={name}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => {
                                                                            field.onChange(name)
                                                                            setShowSuggestions(false)
                                                                        }}
                                                                        className={cn(
                                                                            "px-4 py-2.5 text-sm cursor-pointer select-none transition-colors text-left font-medium",
                                                                            idx === focusedSuggestionIndex 
                                                                                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                                                                                : "text-slate-700 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                                        )}
                                                                    >
                                                                        {name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("fields.description")}</FormLabel>
                                                <FormControl>
                                                    <Textarea disabled={loading} placeholder={t("form.descPlaceholder")} rows={3} {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="categoryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel>{t("fields.category")}</FormLabel>
                                                        <FastCreateCategory onSuccess={(id) => field.onChange(id)} />
                                                    </div>
                                                    <SearchableSelect
                                                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        disabled={loading}
                                                        placeholder={t("fields.category")}
                                                        searchPlaceholder={t("form.searchCategory")}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="brandId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel>{t("fields.brand")}</FormLabel>
                                                        <FastCreateBrand onSuccess={(id) => field.onChange(id)} />
                                                    </div>
                                                    <SearchableSelect
                                                        options={brands.map(b => ({ value: b.id, label: b.name }))}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        disabled={loading}
                                                        placeholder={t("fields.brand")}
                                                        searchPlaceholder={t("form.searchBrand")}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* PRICING CARD */}
                            <Card className="border-2 border-dashed border-indigo-200 dark:border-indigo-900">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <DollarSign className="h-4 w-4 text-indigo-500" />
                                        {t("form.pricing")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {renderPriceInput({ name: "cost", label: t("fields.purchasePrice"), description: t("form.purchasePriceDesc"), icon: ShoppingCart, color: "default" })}
                                        {renderPriceInput({ name: "price", label: t("fields.price"), description: t("form.retailPriceDesc"), icon: Store, color: "blue" })}
                                        {renderPriceInput({ name: "wholesalePrice", label: t("fields.wholesalePrice"), description: t("form.wholesalePriceDesc"), icon: Package, color: "green" })}
                                        {renderPriceInput({ name: "dealerPrice", label: t("fields.dealerPrice"), description: t("form.dealerPriceDesc"), icon: Users, color: "purple" })}
                                    </div>
                                    {tvaEnabled ? (
                                        <div className="mt-4">
                                            <FormField
                                                control={form.control}
                                                name="tvaRate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-semibold text-indigo-700">{t("form.tvaRate")}</FormLabel>
                                                        <Select disabled={loading} onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={t("form.selectTva")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="19">{t("form.tva19")}</SelectItem>
                                                                <SelectItem value="9">{t("form.tva9")}</SelectItem>
                                                                <SelectItem value="0">{t("form.tva0")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription className="text-xs">{t("form.tvaDesc")}</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                                            <Wand2 className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
                                            <span>La TVA est désactivée dans les paramètres généraux. Elle ne sera pas appliquée.</span>
                                        </div>
                                    )}

                                    {/* Visual margin helper */}
                                    <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">{t("form.calculatedMargins")}</p>
                                        <div className="grid grid-cols-3 gap-3 text-xs">
                                            {[
                                                { label: t("form.marginRetail"), price: form.watch("price"), name: "Détaillant" },
                                                { label: t("form.marginWholesale"), price: form.watch("wholesalePrice"), name: "Gros" },
                                                { label: t("form.marginDealer"), price: form.watch("dealerPrice"), name: "Revendeur" },
                                            ].map(({ label, price, name }) => {
                                                const cost = Number(form.watch("cost") || 0)
                                                const p = Number(price || 0)
                                                const margin = cost > 0 && p > 0 ? (((p - cost) / cost) * 100).toFixed(0) : "—"
                                                const isPositive = typeof margin === "string" && margin !== "—" && Number(margin) >= 0
                                                return (
                                                    <div key={name} className="text-center p-2 rounded-md bg-background border">
                                                        <p className="text-muted-foreground">{label}</p>
                                                        <p className={cn("font-bold text-sm", isPositive ? "text-emerald-600" : "text-red-500")}>
                                                            {margin !== "—" ? `${margin}%` : "—"}
                                                        </p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* BARCODES CARD */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Barcode className="h-4 w-4 text-muted-foreground" />
                                        {t("form.barcodes")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {(form.watch("barcodes") || []).map((_: any, index: number) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input disabled={loading} placeholder={t("form.barcodeValue")} {...form.register(`barcodes.${index}.value` as const)} />
                                            <Input disabled={loading} placeholder={t("form.barcodeType")} {...form.register(`barcodes.${index}.label` as const)} className="w-36" />
                                            <Button type="button" variant="destructive" size="icon" onClick={() => {
                                                const current = form.getValues("barcodes") || []
                                                form.setValue("barcodes", current.filter((_: any, i: number) => i !== index))
                                            }}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 pt-1">
                                        <Button type="button" variant="outline" size="sm" onClick={() => {
                                            const current = form.getValues("barcodes") || []
                                            form.setValue("barcodes", [...current, { value: "", label: "" }])
                                        }}>
                                            <Plus className="h-4 w-4 mr-2" /> {t("form.addBarcode")}
                                        </Button>
                                        <Button type="button" variant="secondary" size="sm" onClick={async () => {
                                            try {
                                                setLoading(true)
                                                const res = await generateNextBarcode()
                                                if (res.success && res.barcode) {
                                                    const current = form.getValues("barcodes") || []
                                                    form.setValue("barcodes", [...current, { value: res.barcode, label: t("form.autoGenerated") }])
                                                }
                                            } catch (e) { console.error(e) } finally { setLoading(false) }
                                        }}>
                                            <Wand2 className="h-4 w-4 mr-2 text-indigo-500" /> {t("form.autoGenerate")}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── RIGHT PANEL (1/3 width) ─────────────────── */}
                        <div className="space-y-6">

                            {/* IMAGES */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{t("form.images")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FormField
                                        control={form.control}
                                        name="images"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ImageUpload
                                                        value={field.value.map((i: any) => i.url)}
                                                        disabled={loading}
                                                        onChange={(url) => field.onChange([...field.value, { url }])}
                                                        onRemove={(url) => field.onChange([...field.value.filter((c: any) => c.url !== url)])}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* STOCK */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                        {t("form.stockManagement")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="stock"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("fields.stock")}</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="1" disabled={loading} placeholder="0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="minStock"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("fields.minStock")}</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="1" disabled={loading} placeholder="0" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">{t("form.lowStockAlert")}</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Stock indicator */}
                                    {(() => {
                                        const s = Number(form.watch("stock") || 0)
                                        const m = Number(form.watch("minStock") || 0)
                                        const status = s === 0 ? { label: t("form.outOfStock"), color: "text-red-500 bg-red-50 border-red-200" }
                                            : s <= m ? { label: t("form.lowStock"), color: "text-amber-600 bg-amber-50 border-amber-200" }
                                                : { label: t("form.inStock"), color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
                                        return (
                                            <div className={cn("flex items-center justify-between text-xs font-medium px-3 py-2 rounded-lg border", status.color)}>
                                                <span>{status.label}</span>
                                                <span className="font-bold">{s} {t("form.units")}</span>
                                            </div>
                                        )
                                    })()}
                                </CardContent>
                            </Card>

                            {/* STATUS */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{t("form.productStatus")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <FormField
                                        control={form.control}
                                        name="isFeatured"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center gap-3 rounded-lg border p-3">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-0.5">
                                                    <FormLabel className="flex items-center gap-1.5 cursor-pointer">
                                                        <Star className="h-3.5 w-3.5 text-amber-500" /> {t("fields.featured")}
                                                    </FormLabel>
                                                    <FormDescription className="text-xs">{t("fields.featuredDesc")}</FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="isArchived"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center gap-3 rounded-lg border p-3">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-0.5">
                                                    <FormLabel className="flex items-center gap-1.5 cursor-pointer">
                                                        <Archive className="h-3.5 w-3.5 text-muted-foreground" /> {t("fields.archived")}
                                                    </FormLabel>
                                                    <FormDescription className="text-xs">{t("fields.archivedDesc")}</FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                        </div>
                    </div>

                    {/* STICKY SAVE FOOTER */}
                    <div className="sticky bottom-0 z-20 -mx-6 -mb-6 mt-8 p-4 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
                        <div>
                            {form.formState.isDirty && (
                                <Badge variant="outline" className="animate-pulse bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 flex items-center gap-1.5 px-3 py-1 text-xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                    {t("form.unsavedChanges")}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={loading}
                                onClick={() => router.push(`/products`)}
                            >
                                {tCommon("cancel")}
                            </Button>
                            <Button
                                id="global-save-button"
                                disabled={loading}
                                size="lg"
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md rounded-lg px-6 transition-all"
                            >
                                {loading ? t("form.saving") : action}
                                <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </>
    )
}
