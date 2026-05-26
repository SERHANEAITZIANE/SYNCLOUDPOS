"use client"

import * as z from "zod"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Plus, Trash } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTransfer } from "@/actions/transfers"

const formSchema = z.object({
    fromStoreId: z.string().min(1, "Dépôt source requis"),
    toStoreId: z.string().min(1, "Dépôt destination requis"),
    notes: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1, "Produit requis"),
        quantity: z.coerce.number().min(1, "Quantité invalide")
    })).min(1, "Au moins un produit est requis")
})

interface TransferFormProps {
    stores: { id: string, name: string }[]
    products: { id: string, name: string, sku: string | null }[]
}

export const TransferForm: React.FC<TransferFormProps> = ({ stores, products }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            fromStoreId: "",
            toStoreId: "",
            notes: "",
            items: [{ productId: "", quantity: 1 }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (values.fromStoreId === values.toStoreId) {
            toast.error("Le dépôt source et destination doivent être différents")
            return
        }

        try {
            setLoading(true)
            const res = await createTransfer(values)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Demande de transfert créée")
                router.push(`/transfers`)
                router.refresh()
            }
        } catch (error) {
            toast.error("Erreur inattendue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="fromStoreId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dépôt Source</FormLabel>
                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionnez un dépôt" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {stores.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="toStoreId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dépôt Destination</FormLabel>
                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionnez un dépôt" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {stores.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Produits à transférer</h3>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 1 })}>
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter un produit
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.productId`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Produit</FormLabel>
                                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Sélectionnez un produit" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {products.map((p) => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem className="w-32">
                                                <FormLabel>Quantité</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="1" disabled={loading} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="mb-0.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => remove(index)}
                                        disabled={fields.length === 1 || loading}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                    <Input disabled={loading} placeholder="Motif du transfert..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button disabled={loading} className="ml-auto" type="submit">
                        Créer le transfert
                    </Button>
                </form>
            </Form>
        </div>
    )
}
