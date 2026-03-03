"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { RegisterSchema } from "@/schemas"
import { Link } from "@/i18n/routing"
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
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { useState, useTransition } from "react"
import { register } from "@/actions/register"
import { useTranslations } from "next-intl"

export const RegisterForm = () => {
    const t = useTranslations("Auth");
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof RegisterSchema>>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            email: "",
            password: "",
            name: "",
            phone: "",
        },
    })

    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");

    const onSubmit = (values: z.infer<typeof RegisterSchema>) => {
        setError("");
        setSuccess("");

        startTransition(() => {
            register(values)
                .then((data) => {
                    if (data.error) {
                        setError(data.error);
                    }
                    if (data.success) {
                        setSuccess(data.success);
                    }
                })
        })
    }

    return (
        <Card className="w-full max-w-[400px] shadow-lg">
            <CardHeader>
                <h2 className="text-2xl font-bold text-center">{t("registerTitle")}</h2>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.name")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={isPending} {...field} placeholder={t("fields.namePlaceholder")} />
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
                                        <Input disabled={isPending} {...field} placeholder={t("fields.phonePlaceholder")} type="tel" />
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
                                        <Input disabled={isPending} {...field} placeholder={t("fields.emailPlaceholder")} type="email" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.password")}</FormLabel>
                                    <FormControl>
                                        <Input disabled={isPending} {...field} placeholder={t("fields.passwordPlaceholder")} type="password" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {error && (
                            <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
                                <p>{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-emerald-500">
                                <p>{success}</p>
                            </div>
                        )}
                        <Button disabled={isPending} type="submit" className="w-full">
                            {t("buttons.register")}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                <div className="w-full text-center text-sm">
                    {t("footer.hasAccount")} {" "}
                    <Link href="/login" className="underline hover:text-primary">
                        {t("footer.loginLink")}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    )
}
