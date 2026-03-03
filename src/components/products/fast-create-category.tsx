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
import { CategorySchema } from "@/schemas"
import { createCategory } from "@/actions/categories"
import { useRouter } from "@/i18n/routing"

interface FastCreateCategoryProps {
    onSuccess?: (id: string) => void
}

export const FastCreateCategory = ({ onSuccess }: FastCreateCategoryProps) => {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const tCommon = useTranslations("Common")
    const tCategory = useTranslations("Categories.fastCreate")

    const form = useForm<z.infer<typeof CategorySchema>>({
        resolver: zodResolver(CategorySchema),
        defaultValues: { name: "" }
    })

    const onSubmit = async (values: z.infer<typeof CategorySchema>) => {
        try {
            setLoading(true)
            const result = await createCategory(values)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(tCategory("success"))
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
                    <DialogTitle>{tCategory("title")}</DialogTitle>
                    <DialogDescription>
                        {tCategory("description")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{tCategory("nameLabel")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} placeholder={tCategory("namePlaceholder")} {...field} />
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
