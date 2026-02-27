"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, FileText, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { createProduct } from "@/actions/products"

interface ScannedProduct {
    name: string
    price: number
    quantity: number
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
    categoryId: z.string().min(1, "Catégorie requise"),
    brandId: z.string().min(1, "Marque requise"),
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

    // The current scanned item we are deciding on
    const currentItem = scannedItems[currentIndex]

    type FormValues = z.infer<typeof formSchema>

    // Pre-fill creation form with extracted name and price (as cost)
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: currentItem?.name || "",
            cost: currentItem?.price ? (currentItem.price as number) : 0,
            price: currentItem?.price ? (currentItem.price as number) : 0, // Fallback for default value
            categoryId: categories[0]?.id || "",
            brandId: brands[0]?.id || "",
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
                price: parseFloat((nextScannedItem.price * 1.3).toFixed(2)), // Suggest 30% margin
                categoryId: categories[0]?.id || "",
                brandId: brands[0]?.id || "",
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
                price: parseFloat((nextScannedItem.price * 1.3).toFixed(2)),
                categoryId: categories[0]?.id || "",
                brandId: brands[0]?.id || "",
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
                categoryId: values.categoryId,
                brandId: values.brandId,
                // Default required fields
                images: [],
                stock: 0,
                minStock: 0,
                isFeatured: false,
                isArchived: false
            })

            if (result && "success" in result && result.success && "data" in result && result.data) {
                // @ts-ignore
                handleNext(result.data.id, currentItem.quantity, values.cost)
            }
        } catch (error) {
            console.error("Failed to create product", error)
        } finally {
            setIsCreating(false)
        }
    }


    if (!currentItem) return null;

    return (
        <Card className="border-indigo-200 shadow-md">
            <CardHeader className="bg-indigo-50/50 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                        <FileText className="h-5 w-5" />
                        Traitement OCR
                    </CardTitle>
                    <Badge variant="outline" className="text-indigo-600 bg-white">
                        Article {currentIndex + 1} / {scannedItems.length}
                    </Badge>
                </div>
                <CardDescription>
                    Voulez-vous lier ou créer cet article détecté ?
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">

                {/* Detected stats */}
                <div className="flex gap-4 mb-6 p-4 rounded-lg bg-slate-50 border">
                    <div className="flex-1">
                        <p className="text-xs uppercase text-slate-500 font-bold mb-1">Texte extrait</p>
                        <p className="font-medium text-lg">&quot;{currentItem.name}&quot;</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-slate-500 font-bold mb-1">Prix (DA)</p>
                        <p className="font-bold text-lg text-emerald-600">{currentItem.price}</p>
                    </div>
                </div>

                {suggestMatch && (
                    <div className="mb-6 p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
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
                    <div className="mb-6 p-3 border border-amber-200 bg-amber-50 rounded-lg text-amber-800 flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>Aucun produit ne semble correspondre dans votre catalogue. Vous pouvez le créer rapidement ci-dessous.</p>
                    </div>
                )}

                <Separator className="my-6" />

                <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Ou créer un nouveau produit</h4>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitNew as any)} className="space-y-4">
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
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isCreating}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="brandId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marque</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isCreating}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <Button type="submit" disabled={isCreating} className="flex-1">
                                    {isCreating ? "Création..." : "Créer et lier"}
                                </Button>
                                <Button type="button" variant="outline" onClick={onSkip} disabled={isCreating}>
                                    Ignorer cet article
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>

            </CardContent>
        </Card >
    )
}
