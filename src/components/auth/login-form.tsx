"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { LoginSchema } from "@/schemas"
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
import { login } from "@/actions/login"
import { useTranslations } from "next-intl"

export const LoginForm = () => {
    const t = useTranslations("Auth");
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");

    const onSubmit = (values: z.infer<typeof LoginSchema>) => {
        setError("");
        setSuccess("");

        startTransition(() => {
            login(values)
                .then((data) => {
                    if (data?.error) {
                        setError(data.error);
                    }
                })
        })
    }

    return (
        <Card className="w-[400px] shadow-lg">
            <CardHeader>
                <h2 className="text-2xl font-bold text-center">{t("loginTitle")}</h2>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <Button disabled={isPending} type="submit" className="w-full">
                            {t("buttons.login")}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                <div className="w-full text-center text-sm">
                    {t("footer.noAccount")} {" "}
                    <Link href="/register" className="underline hover:text-primary">
                        {t("footer.registerLink")}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    )
}
