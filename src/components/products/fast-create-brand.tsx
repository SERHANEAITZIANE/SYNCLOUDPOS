"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { BrandSchema } from "@/schemas"
import { createBrand } from "@/actions/brands"
import { useRouter } from "@/i18n/routing"

interface FastCreateBrandProps {
    onSuccess?: (id: string) => void
}

export const FastCreateBrand = ({ onSuccess }: FastCreateBrandProps) => {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const tCommon = useTranslations("Common")
    const tBrand = useTranslations("Brands.fastCreate")

    const form = useForm<z.infer<typeof BrandSchema>>({
        resolver: zodResolver(BrandSchema) as any,
        defaultValues: { name: "" }
    })

    const onSubmit = async (values: z.infer<typeof BrandSchema>) => {
        try {
            setLoading(true)
            const result = await createBrand(values)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(tBrand("success"))
                form.reset()
                setOpen(false)
                router.refresh()
                if (onSuccess && result.data) onSuccess(result.data.id)
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" type="button" className="h-10 w-10">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{tBrand("title")}</DialogTitle>
                    <DialogDescription>
                        {tBrand("description")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tBrand("nameLabel")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={tBrand("namePlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button disabled={loading} type="submit" className="w-full">
                                {tCommon("save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
