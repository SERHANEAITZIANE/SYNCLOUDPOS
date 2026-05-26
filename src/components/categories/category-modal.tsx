"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Image from "next/image"

import { Modal } from "@/components/ui/modal"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CategorySchema } from "@/schemas"
import { createCategory, updateCategory } from "@/actions/categories"
import { useRouter } from "@/i18n/routing"
import { ImageUpload } from "@/components/ui/image-upload"

interface CategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    initialData?: {
        id: string
        name: string
        imageUrl?: string | null
        isArchived?: boolean
        commissionWholesale?: number
        commissionReseller?: number
        commissionRetail?: number
    }
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialData
}) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const title = initialData ? "Edit Category" : "Create Category"
    const description = initialData ? "Edit a category." : "Add a new category"
    const action = initialData ? "Save changes" : "Create"

    const form = useForm<z.infer<typeof CategorySchema>>({
        resolver: zodResolver(CategorySchema) as any,
        defaultValues: {
            name: initialData?.name || "",
            imageUrl: initialData?.imageUrl || "",
            isArchived: initialData?.isArchived ?? false,
            commissionWholesale: initialData?.commissionWholesale ?? 0,
            commissionReseller: initialData?.commissionReseller ?? 0,
            commissionRetail: initialData?.commissionRetail ?? 0,
        },
    })

    const onSubmit = async (values: z.infer<typeof CategorySchema>) => {
        try {
            setLoading(true)
            if (initialData) {
                await updateCategory(initialData.id, values)
            } else {
                await createCategory(values)
            }
            router.refresh()
            onConfirm()
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            title={title}
            description={description}
            isOpen={isOpen}
            onClose={onClose}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Photo Upload */}
                    <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Photo</FormLabel>
                                <FormControl>
                                    <ImageUpload
                                        value={field.value ? [field.value] : []}
                                        disabled={loading}
                                        onChange={(url) => field.onChange(url)}
                                        onRemove={() => field.onChange("")}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input disabled={loading} placeholder="Category name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Archive Toggle */}
                    <FormField
                        control={form.control}
                        name="isArchived"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Archivée</FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                        Cette catégorie ne sera plus visible dans le catalogue
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={loading}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <div className="space-y-2 border-t pt-4">
                        <h4 className="text-sm font-semibold text-muted-foreground">Commissions par Type de Client (%)</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <FormField
                                control={form.control}
                                name="commissionRetail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Détail</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} type="number" min={0} step={0.1} placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="commissionReseller"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Revendeur</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} type="number" min={0} step={0.1} placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="commissionWholesale"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Gros</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} type="number" min={0} step={0.1} placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                        <Button disabled={loading} variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button id="global-save-button" disabled={loading} type="submit">
                            {action}
                            <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
