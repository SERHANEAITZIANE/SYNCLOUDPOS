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
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductSchema } from "@/schemas"
import { createProduct, deleteProduct, updateProduct } from "@/actions/products"
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
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, categories, brands }) => {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
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
            tvaRate: initialData.tvaRate ?? 19,
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
            isFeatured: false, isArchived: false, tvaRate: 19,
        }
    } as any)

    const onSubmit = async (values: z.infer<typeof ProductSchema>) => {
        try {
            setLoading(true)
            const result = initialData
                ? await updateProduct(initialData.id, values)
                : await createProduct(values)
            if (!result.error) {
                router.refresh()
                router.push(`/products`)
            } else {
                console.error(result.error)
            }
        } catch (error) {
            console.error("Something went wrong", error)
        } finally {
            setLoading(false)
        }
    }

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deleteProduct(initialData?.id as string)
            if (!result.error) { router.refresh(); router.push(`/products`) }
        } catch (error) {
            console.error(error)
        } finally { setLoading(false); setOpen(false) }
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
            <div className="flex items-center justify-between">
                <Heading title={title} description={t("subtitle")} />
                <div className="flex items-center gap-2">
                    {initialData && (
                        <>
                            <PrintBarcodeModal
                                productName={initialData.name}
                                price={initialData.price}
                                barcodes={initialData.barcodes || []}
                            />
                            <Button disabled={loading} variant="destructive" size="icon" onClick={() => setOpen(true)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </>
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
                                        Informations générales
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
                                                    <Input disabled={loading} placeholder="Nom du produit" {...field} />
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
                                                    <Textarea disabled={loading} placeholder="Description du produit..." rows={3} {...field} value={field.value ?? ""} />
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
                                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder={t("fields.category")} /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
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
                                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder={t("fields.brand")} /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
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
                                        Grille tarifaire
                                        <Badge variant="outline" className="text-indigo-600 border-indigo-300 text-xs ml-auto">4 tarifs</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {renderPriceInput({ name: "cost", label: "Prix d'achat", description: "Coût fournisseur", icon: ShoppingCart, color: "default" })}
                                        {renderPriceInput({ name: "price", label: "Prix détaillant", description: "Prix de vente au détail", icon: Store, color: "blue" })}
                                        {renderPriceInput({ name: "wholesalePrice", label: "Prix en gros", description: "Pour achat de grande quantité", icon: Package, color: "green" })}
                                        {renderPriceInput({ name: "dealerPrice", label: "Prix revendeur", description: "Pour partenaires et revendeurs", icon: Users, color: "purple" })}
                                    </div>
                                    <div className="mt-4">
                                        <FormField
                                            control={form.control}
                                            name="tvaRate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-semibold text-indigo-700">Taux de TVA (%)</FormLabel>
                                                    <Select disabled={loading} onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Sélectionnez un taux de TVA" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="19">TVA 19% (Générale)</SelectItem>
                                                            <SelectItem value="9">TVA 9% (Réduite)</SelectItem>
                                                            <SelectItem value="0">TVA 0% (Exonéré)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription className="text-xs">Taux applicable en Algérie</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Visual margin helper */}
                                    <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Marges calculées</p>
                                        <div className="grid grid-cols-3 gap-3 text-xs">
                                            {[
                                                { label: "Marge détail", price: form.watch("price"), name: "Détaillant" },
                                                { label: "Marge gros", price: form.watch("wholesalePrice"), name: "Gros" },
                                                { label: "Marge revendeur", price: form.watch("dealerPrice"), name: "Revendeur" },
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
                                        Codes-barres
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {(form.watch("barcodes") || []).map((_: any, index: number) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input disabled={loading} placeholder="Valeur du code-barres" {...form.register(`barcodes.${index}.value` as const)} />
                                            <Input disabled={loading} placeholder="Type (ex. EAN-13)" {...form.register(`barcodes.${index}.label` as const)} className="w-36" />
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
                                            <Plus className="h-4 w-4 mr-2" /> Ajouter
                                        </Button>
                                        <Button type="button" variant="secondary" size="sm" onClick={async () => {
                                            try {
                                                setLoading(true)
                                                const res = await generateNextBarcode()
                                                if (res.success && res.barcode) {
                                                    const current = form.getValues("barcodes") || []
                                                    form.setValue("barcodes", [...current, { value: res.barcode, label: "Auto-Généré" }])
                                                }
                                            } catch (e) { console.error(e) } finally { setLoading(false) }
                                        }}>
                                            <Wand2 className="h-4 w-4 mr-2 text-indigo-500" /> Auto-générer
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
                                    <CardTitle className="text-base">Images</CardTitle>
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
                                        Gestion du stock
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
                                                <FormDescription className="text-xs">Alerte stock faible</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Stock indicator */}
                                    {(() => {
                                        const s = Number(form.watch("stock") || 0)
                                        const m = Number(form.watch("minStock") || 0)
                                        const status = s === 0 ? { label: "Rupture de stock", color: "text-red-500 bg-red-50 border-red-200" }
                                            : s <= m ? { label: "Stock faible", color: "text-amber-600 bg-amber-50 border-amber-200" }
                                                : { label: "En stock", color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
                                        return (
                                            <div className={cn("flex items-center justify-between text-xs font-medium px-3 py-2 rounded-lg border", status.color)}>
                                                <span>{status.label}</span>
                                                <span className="font-bold">{s} unités</span>
                                            </div>
                                        )
                                    })()}
                                </CardContent>
                            </Card>

                            {/* STATUS */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Statut du produit</CardTitle>
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

                            {/* SAVE */}
                            <Button id="global-save-button" disabled={loading} className="w-full" size="lg" type="submit">
                                {loading ? "Enregistrement..." : action}
                                <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </>
    )
}
