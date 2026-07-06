"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, FileText, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { createProduct } from "@/actions/products"

interface ScannedProduct {
    name: string
    price: number
    quantity: number
    sellingPrice?: number
    categoryName?: string
    brandName?: string
}

interface MissingProductsFormProps {
    scannedItems: ScannedProduct[]
    existingProducts: any[]
    categories: any[]
    brands: any[]
    onComplete: (matchedItems: { productId: string, quantity: number, costPrice: number }[]) => void
}

const formSchema = z.object({
    name: z.string().min(1, "Nom requis"),
    cost: z.number().min(0, "Prix d'achat invalide"),
    price: z.number().min(0, "Prix de vente invalide"),
    categoryId: z.string().optional().nullable(),
    brandId: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

export const MissingProductsForm: React.FC<MissingProductsFormProps> = ({
    scannedItems,
    existingProducts,
    categories,
    brands,
    onComplete
}) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [finalItems, setFinalItems] = useState<{ productId: string, quantity: number, costPrice: number }[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const t = useTranslations("Common")
    const router = useRouter()

    // The current scanned item we are deciding on
    const currentItem = scannedItems[currentIndex]

    type FormValues = z.infer<typeof formSchema>

    // Helper to find matching category/brand
    const findCategory = (name?: string) => {
        if (!name) return ""
        const lowerName = name.toLowerCase().trim()
        return categories.find(c => c.name.toLowerCase().trim() === lowerName)?.id || ""
    }

    const findBrand = (name?: string) => {
        if (!name) return ""
        const lowerName = name.toLowerCase().trim()
        return brands.find(b => b.name.toLowerCase().trim() === lowerName)?.id || ""
    }

    // Pre-fill creation form with extracted name and price (as cost)
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: currentItem?.name || "",
            cost: currentItem?.price ? (currentItem.price as number) : 0,
            price: currentItem?.sellingPrice !== undefined ? currentItem.sellingPrice : (currentItem?.price ? parseFloat((currentItem.price * 1.3).toFixed(2)) : 0),
            categoryId: findCategory(currentItem?.categoryName),
            brandId: findBrand(currentItem?.brandName),
        }
    })

    // Auto-match exact or partial name
    const suggestMatch = existingProducts.find(
        p => p.name.toLowerCase() === currentItem?.name.toLowerCase() ||
            p.name.toLowerCase().includes(currentItem?.name.toLowerCase()) ||
            currentItem?.name.toLowerCase().includes(p.name.toLowerCase())
    )

    const handleNext = (productId: string, quantity: number, costPrice: number) => {
        const nextItems = [...finalItems, { productId, quantity, costPrice }]

        if (currentIndex < scannedItems.length - 1) {
            setFinalItems(nextItems)
            setCurrentIndex(currentIndex + 1)
            // Reset form for next item
            const nextScannedItem = scannedItems[currentIndex + 1]
            form.reset({
                name: nextScannedItem.name,
                cost: nextScannedItem.price,
                price: nextScannedItem.sellingPrice !== undefined ? nextScannedItem.sellingPrice : parseFloat((nextScannedItem.price * 1.3).toFixed(2)),
                categoryId: findCategory(nextScannedItem.categoryName),
                brandId: findBrand(nextScannedItem.brandName),
            })
        } else {
            // All done
            onComplete(nextItems)
        }
    }

    const onSkip = () => {
        if (currentIndex < scannedItems.length - 1) {
            setCurrentIndex(currentIndex + 1)
            const nextScannedItem = scannedItems[currentIndex + 1]
            form.reset({
                name: nextScannedItem.name,
                cost: nextScannedItem.price,
                price: nextScannedItem.sellingPrice !== undefined ? nextScannedItem.sellingPrice : parseFloat((nextScannedItem.price * 1.3).toFixed(2)),
                categoryId: findCategory(nextScannedItem.categoryName),
                brandId: findBrand(nextScannedItem.brandName),
            })
        } else {
            onComplete(finalItems)
        }
    }

    const onSubmitNew = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsCreating(true)
            const result = await createProduct({
                name: values.name,
                cost: values.cost,
                price: values.price,
                categoryId: values.categoryId || undefined,
                brandId: values.brandId || undefined,
                // Default required fields
                images: [],
                stock: 0,
                minStock: 0,
                isFeatured: false,
                isArchived: false
            })

            if (result && "success" in result && result.success) {
                // The backend returns { product: ... }
                const newProduct = (result as any).product || (result as any).data;
                if (newProduct && newProduct.id) {
                    handleNext(newProduct.id, currentItem.quantity, values.cost)
                    router.refresh()
                } else {
                    console.error("No product returned", result);
                }
            }
        } catch (error) {
            console.error("Failed to create product", error)
        } finally {
            setIsCreating(false)
        }
    }


    if (!currentItem) return null;

    return (
        <Card className="border-indigo-200 dark:border-indigo-800/50 shadow-md">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                        <FileText className="h-5 w-5" />
                        Traitement OCR
                    </CardTitle>
                    <Badge variant="outline" className="text-indigo-600 dark:text-indigo-300 bg-white dark:bg-indigo-950/50">
                        Article {currentIndex + 1} / {scannedItems.length}
                    </Badge>
                </div>
                <CardDescription>
                    Voulez-vous lier ou créer cet article détecté ?
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">

                {/* Detected stats */}
                <div className="flex gap-4 mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                    <div className="flex-1">
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">Texte extrait</p>
                        <p className="font-medium text-lg">&quot;{currentItem.name}&quot;</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">Prix (DA)</p>
                        <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{currentItem.price}</p>
                    </div>
                </div>

                {suggestMatch && (
                    <div className="mb-6 p-4 border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                            <CheckCircle2 className="h-4 w-4" /> Correspondance possible trouvée
                        </p>
                        <div className="flex items-center justify-between">
                            <p className="font-medium">{suggestMatch.name}</p>
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleNext(suggestMatch.id, currentItem.quantity, currentItem.price)}
                            >
                                Lier ce produit <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                {!suggestMatch && (
                    <div className="mb-6 p-3 border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-800 dark:text-amber-300 flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>Aucun produit ne semble correspondre dans votre catalogue. Vous pouvez le créer rapidement ci-dessous.</p>
                    </div>
                )}

                <Separator className="my-6" />

                <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Ou créer un nouveau produit</h4>
                    <Form {...form}>
                        <div className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom final du produit</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={isCreating} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="cost" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prix d'achat (DA)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                value={field.value !== undefined ? field.value : ""}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                                disabled={isCreating}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prix de vente détail (DA)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                value={field.value !== undefined ? field.value : ""}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                                disabled={isCreating}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="categoryId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catégorie</FormLabel>
                                        <SearchableSelect
                                            options={[{ value: "", label: "Aucune" }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            disabled={isCreating}
                                            placeholder="Sélectionner une catégorie..."
                                            searchPlaceholder="Rechercher une catégorie..."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="brandId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marque</FormLabel>
                                        <SearchableSelect
                                            options={[{ value: "", label: "Aucune" }, ...brands.map(b => ({ value: b.id, label: b.name }))]}
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            disabled={isCreating}
                                            placeholder="Sélectionner une marque..."
                                            searchPlaceholder="Rechercher une marque..."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <Button type="button" onClick={form.handleSubmit(onSubmitNew as any)} disabled={isCreating} className="flex-1">
                                    {isCreating ? "Création..." : "Créer et lier"}
                                </Button>
                                <Button type="button" variant="outline" onClick={onSkip} disabled={isCreating}>
                                    Ignorer cet article
                                </Button>
                            </div>
                        </div>
                    </Form>
                </div>

            </CardContent>
        </Card >
    )
}
