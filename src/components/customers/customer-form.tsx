"use client"

import * as z from "zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash, RefreshCcw } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerSchema } from "@/schemas"
import { createCustomer, deleteCustomer, updateCustomer } from "@/actions/customers"

interface CustomerFormProps {
    initialData: any | null
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
    initialData
}) => {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const t = useTranslations("Customers")
    const tCommon = useTranslations("Common")

    const title = initialData ? tCommon("edit") : tCommon("addNew")
    const description = initialData ? t("subtitle") : t("subtitle")
    const toastMessage = initialData ? tCommon("success") : tCommon("success")
    const action = initialData ? tCommon("save") : tCommon("save")

    const form = useForm<z.infer<typeof CustomerSchema>>({
        resolver: zodResolver(CustomerSchema) as any,
        defaultValues: initialData ? {
            ...initialData,
            barcode: initialData.barcode || "",
            phone: initialData.phone || "",
            email: initialData.email || "",
            address: initialData.address || "",
            city: initialData.city || "",
            taxId: initialData.taxId || "",
            nif: initialData.nif || "",
            nis: initialData.nis || "",
            artImposition: initialData.artImposition || "",
            rc: initialData.rc || "",
            rib: initialData.rib || "",
            notes: initialData.notes || "",
            clientType: initialData.clientType || "RETAIL",
            balance: initialData.balance ?? 0,
        } : {
            name: "",
            phone: "",
            email: "",
            address: "",
            city: "",
            taxId: "",
            nif: "",
            nis: "",
            artImposition: "",
            rc: "",
            rib: "",
            notes: "",
            clientType: "RETAIL",
            balance: 0,
            barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString()
        }
    })

    const onSubmit = async (values: z.infer<typeof CustomerSchema>) => {
        try {
            setLoading(true)
            let result;
            if (initialData) {
                result = await updateCustomer(initialData.id, values)
            } else {
                result = await createCustomer(values)
            }

            if (result.error) {
                toast.error(result.error)
            } else {
                router.refresh()
                router.push(`/customers`)
                toast.success(toastMessage)
            }
        } catch (_error) {
            toast.error("Something went wrong.")
        } finally {
            setLoading(false)
        }
    }

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deleteCustomer(initialData?.id)
            if (result.error) {
                toast.error(result.error)
            } else {
                router.refresh()
                router.push(`/customers`)
                toast.success("Customer deleted.")
            }
        } catch (_error) {
            toast.error("Make sure to remove all orders using this customer first.")
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    const renderField = (name: keyof z.infer<typeof CustomerSchema>, label: string, placeholder?: string) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input disabled={loading} placeholder={placeholder || label} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    )

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <div className="flex items-center justify-between">
                <Heading title={title} description={description} />
                {initialData && (
                    <Button
                        disabled={loading}
                        variant="destructive"
                        size="icon"
                        onClick={() => setOpen(true)}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Separator />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
                    {/* General Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Informations générales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {renderField("name", t("fields.name"))}
                            {renderField("phone", t("fields.phone"))}
                            {renderField("email", t("fields.email"))}
                            {renderField("address", t("fields.address"))}
                            {renderField("city", t("fields.city"))}
                            <FormField
                                control={form.control}
                                name="clientType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type de Client</FormLabel>
                                        <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionnez un type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="RETAIL">Détaillant</SelectItem>
                                                <SelectItem value="RESELLER">Revendeur</SelectItem>
                                                <SelectItem value="WHOLESALE">Grossiste</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code-barres</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input disabled={loading} placeholder="Scan ou saisir" {...field} value={field.value ?? ""} />
                                                <Button type="button" variant="outline" size="icon" onClick={() => {
                                                    form.setValue('barcode', Math.floor(100000000000 + Math.random() * 900000000000).toString())
                                                }}>
                                                    <RefreshCcw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Solde Initial */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            {initialData ? "Solde Actuel" : "Solde Initial"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="balance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{initialData ? "Solde Actuel (DA)" : "Solde Initial (DA)"}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                disabled={loading || !!initialData} 
                                                type="number" 
                                                min={initialData ? undefined : 0} 
                                                step={0.01} 
                                                placeholder="0.00" 
                                                {...field} 
                                                value={field.value ?? 0} 
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            {initialData 
                                                ? "Le solde actuel de ce client (calculé et non modifiable)" 
                                                : "Le montant que ce client vous doit initialement"
                                            }
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Notes</h3>
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes / Remarques</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder="Remarques, conditions particulières, historique..."
                                            rows={4}
                                            className="resize-y"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator />

                    {/* Fiscal Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Informations fiscales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {renderField("nif", "NIF", "Numéro d'Identification Fiscale")}
                            {renderField("nis", "NIS", "Numéro d'Identifiant Statistique")}
                            {renderField("artImposition", "Article d'Imposition", "Article d'Imposition")}
                            {renderField("rc", "NRC", "Numéro de Registre de Commerce")}
                            {renderField("rib", "RIB Banque", "Relevé d'Identité Bancaire")}
                        </div>
                    </div>

                    <Button id="global-save-button" disabled={loading} className="ml-auto" type="submit">
                        {action}
                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                    </Button>
                </form>
            </Form>
        </>
    )
}
