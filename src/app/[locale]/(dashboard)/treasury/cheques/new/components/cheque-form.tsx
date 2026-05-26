"use client"

import * as z from "zod"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

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
import { createCheque } from "@/actions/cheques"

const formSchema = z.object({
    number: z.string().min(1, "Numéro requis"),
    bank: z.string().min(1, "Banque requise"),
    amount: z.coerce.number().min(0.01, "Montant invalide"),
    dueDate: z.string().min(1, "Date requise"),
    type: z.enum(["RECEIVED", "ISSUED"]),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
})

interface ChequeFormProps {
    customers: { id: string, name: string }[]
    suppliers: { id: string, name: string }[]
}

export const ChequeForm: React.FC<ChequeFormProps> = ({ customers, suppliers }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            number: "",
            bank: "",
            amount: 0,
            dueDate: new Date().toISOString().split('T')[0],
            type: "RECEIVED",
            customerId: undefined,
            supplierId: undefined,
        }
    })

    const type = form.watch("type")

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true)
            const payload = {
                ...values,
                dueDate: new Date(values.dueDate),
                customerId: values.type === "RECEIVED" ? values.customerId : undefined,
                supplierId: values.type === "ISSUED" ? values.supplierId : undefined,
            }
            const res = await createCheque(payload)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Chèque créé")
                router.push(`/treasury/cheques`)
                router.refresh()
            }
        } catch (error) {
            toast.error("Erreur inattendue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select disabled={loading} onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionnez un type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="RECEIVED">Reçu (Client)</SelectItem>
                                        <SelectItem value="ISSUED">Émis (Fournisseur)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Numéro de chèque</FormLabel>
                                <FormControl>
                                    <Input disabled={loading} placeholder="000000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="bank"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Banque</FormLabel>
                                <FormControl>
                                    <Input disabled={loading} placeholder="ex: BDL, BNA..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Montant</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" disabled={loading} placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date d'échéance</FormLabel>
                                <FormControl>
                                    <Input type="date" disabled={loading} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {type === "RECEIVED" && (
                        <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client</FormLabel>
                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionnez un client" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {type === "ISSUED" && (
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fournisseur</FormLabel>
                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionnez un fournisseur" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <Button disabled={loading} className="ml-auto" type="submit">
                        Créer le chèque
                    </Button>
                </form>
            </Form>
        </div>
    )
}
