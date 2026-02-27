"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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
import { CategorySchema } from "@/schemas"
import { createCategory, updateCategory } from "@/actions/categories"
import { useRouter } from "@/i18n/routing"

interface CategoryModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    initialData?: {
        id: string
        name: string
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
        resolver: zodResolver(CategorySchema),
        defaultValues: initialData || {
            name: "",
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
