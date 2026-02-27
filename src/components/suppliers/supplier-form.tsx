"use client"

import * as z from "zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash } from "lucide-react"
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
import { SupplierSchema } from "@/schemas"
import { createSupplier, deleteSupplier, updateSupplier } from "@/actions/suppliers"

interface SupplierFormProps {
    initialData: any | null
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
    initialData
}) => {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const t = useTranslations("Suppliers")
    const tCommon = useTranslations("Common")

    const title = initialData ? tCommon("edit") : tCommon("addNew")
    const description = initialData ? t("subtitle") : t("subtitle")
    const toastMessage = initialData ? tCommon("success") : tCommon("success")
    const action = initialData ? tCommon("save") : tCommon("save")

    const form = useForm<z.infer<typeof SupplierSchema>>({
        resolver: zodResolver(SupplierSchema),
        defaultValues: initialData || {
            name: "",
            contactPerson: "",
            phone: "",
            email: "",
            address: "",
            taxId: ""
        }
    })

    const onSubmit = async (values: z.infer<typeof SupplierSchema>) => {
        try {
            setLoading(true)
            let result;
            if (initialData) {
                result = await updateSupplier(initialData.id, values)
            } else {
                result = await createSupplier(values)
            }

            if (result.error) {
                toast.error(result.error)
            } else {
                router.refresh()
                router.push(`/suppliers`)
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
            const result = await deleteSupplier(initialData?.id)
            if (result.error) {
                toast.error(result.error)
            } else {
                router.refresh()
                router.push(`/suppliers`)
                toast.success("Supplier deleted.")
            }
        } catch (_error) {
            toast.error("Make sure to remove all products linked to this supplier first.")
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                            name="contactPerson"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.contact")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={t("fields.contact")} {...field} />
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
