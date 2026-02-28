"use client"

import { useState } from "react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createSpoilage } from "@/actions/spoilage"

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
}

export const AddSpoilageModal: React.FC<AddSpoilageModalProps> = ({
    isOpen,
    onClose,
    products
}) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            productId: "",
            quantity: 1,
            reason: "",
            date: new Date().toISOString().split('T')[0], // Defaults to today, YYYY-MM-DD
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true)
            const selectedProduct = products.find(p => p.id === values.productId)

            if (selectedProduct && selectedProduct.quantity < values.quantity) {
                toast.error(`Stock insuffisant. Quantité disponible: ${selectedProduct.quantity}`)
                return
            }

            const response = await createSpoilage({
                ...values,
                date: new Date(values.date)
            })

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
            title="Déclarer une Avarie"
            description="Ajouter un produit défectueux ou périmé pour le retirer du stock."
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
                                    <Select
                                        disabled={loading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un produit" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {products.map((product) => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name} ({product.quantity} en stock)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
