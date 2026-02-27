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
            notes: initialData.notes || "",
            clientType: initialData.clientType || "RETAIL"
        } : {
            name: "",
            phone: "",
            email: "",
            address: "",
            city: "",
            taxId: "",
            notes: "",
            clientType: "RETAIL",
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
                    <div className="grid grid-cols-3 gap-8">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.name")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.name")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.phone")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.phone")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.email")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.email")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.address")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.address")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.city")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.city")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="taxId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.taxId")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.taxId")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="barcode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code-barres / Barcode</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input disabled={loading} placeholder="Scan or type barcode" {...field} />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    const newBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString()
                                                    form.setValue('barcode', newBarcode)
                                                }}
                                            >
                                                <RefreshCcw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
