"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { createSpoilage, updateSpoilage } from "@/actions/spoilage"

const formSchema = z.object({
    productId: z.string().min(1, "Produit requis"),
    quantity: z.coerce.number().min(1, "La quantité doit être supérieure à 0"),
    reason: z.string().min(1, "Motif requis"),
    date: z.string().min(1, "Date requise"),
})

interface AddSpoilageModalProps {
    isOpen: boolean
    onClose: () => void
    products: { id: string, name: string, quantity: number }[]
    initialData?: { id: string, productId: string, productName: string, quantity: number, reason: string, date: Date, userName: string } | null
}

export const AddSpoilageModal: React.FC<AddSpoilageModalProps> = ({
    isOpen,
    onClose,
    products,
    initialData
}) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const isEdit = !!initialData

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            productId: "",
            quantity: 1,
            reason: "",
            date: new Date().toISOString().split('T')[0],
        },
    })

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                form.reset({
                    productId: initialData.productId,
                    quantity: initialData.quantity,
                    reason: initialData.reason || "",
                    date: new Date(initialData.date).toISOString().split('T')[0]
                })
            } else {
                form.reset({
                    productId: "",
                    quantity: 1,
                    reason: "",
                    date: new Date().toISOString().split('T')[0]
                })
            }
        }
    }, [initialData, isOpen, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true)
            const selectedProduct = products.find(p => p.id === values.productId)

            if (selectedProduct) {
                const currentStock = selectedProduct.quantity
                const previousQty = initialData?.productId === values.productId ? initialData.quantity : 0
                const requiredStockChange = values.quantity - previousQty

                if (currentStock < requiredStockChange) {
                    toast.error(`Stock insuffisant. Quantité disponible: ${currentStock}`)
                    return
                }
            }

            let response;
            if (isEdit && initialData) {
                response = await updateSpoilage(initialData.id, {
                    ...values,
                    date: new Date(values.date)
                })
            } else {
                response = await createSpoilage({
                    ...values,
                    date: new Date(values.date)
                })
            }

            if (response.error) {
                toast.error(response.error)
            } else {
                toast.success(response.success || "Avarie enregistrée avec succès")
                form.reset()
                onClose()
                router.refresh()
            }
        } catch {
            toast.error("Un problème est survenu.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            title={isEdit ? "Modifier l'Avarie" : "Déclarer une Avarie"}
            description={isEdit ? "Modifier les détails de la perte de stock." : "Ajouter un produit défectueux ou périmé pour le retirer du stock."}
            isOpen={isOpen}
            onClose={onClose}
        >
            <div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="productId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Produit</FormLabel>
                                    <SearchableSelect
                                        options={products.map(p => ({
                                            value: p.id,
                                            label: `${p.name} (${p.quantity} en stock)`
                                        }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={loading}
                                        placeholder="Sélectionner un produit"
                                        searchPlaceholder="Rechercher un produit..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantité avariée</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date de déclaration</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motif (Périmé, Cassé, etc.)</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder="ex: Produit expiré" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                            <Button disabled={loading} variant="outline" onClick={onClose} type="button">
                                Annuler
                            </Button>
                            <Button disabled={loading} type="submit">
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </Modal>
    )
}
