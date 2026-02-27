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
import { BrandSchema } from "@/schemas"
import { createBrand, updateBrand } from "@/actions/brands"
import { useRouter } from "@/i18n/routing"

interface BrandModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    initialData?: {
        id: string
        name: string
    }
}

export const BrandModal: React.FC<BrandModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialData
}) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const title = initialData ? "Edit Brand" : "Create Brand"
    const description = initialData ? "Edit a brand." : "Add a new brand"
    const action = initialData ? "Save changes" : "Create"

    const form = useForm<z.infer<typeof BrandSchema>>({
        resolver: zodResolver(BrandSchema),
        defaultValues: initialData || {
            name: "",
        },
    })

    const onSubmit = async (values: z.infer<typeof BrandSchema>) => {
        try {
            setLoading(true)
            if (initialData) {
                await updateBrand(initialData.id, values)
            } else {
                await createBrand(values)
            }
            router.refresh()
            onConfirm()
            onClose() // Ensure modal closes
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
                                    <Input disabled={loading} placeholder="Brand name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                        <Button disabled={loading} variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button disabled={loading} type="submit">
                            {action}
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
