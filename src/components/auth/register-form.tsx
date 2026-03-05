"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { RegisterSchema } from "@/schemas"
import { Link } from "@/i18n/routing"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState, useTransition } from "react"
import { register } from "@/actions/register"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react"

export const RegisterForm = () => {
    const t = useTranslations("Auth");
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isGooglePending, setIsGooglePending] = useState(false);

    const form = useForm<z.infer<typeof RegisterSchema>>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: { email: "", password: "", name: "", phone: "" },
    })

    const onSubmit = (values: z.infer<typeof RegisterSchema>) => {
        setError("");
        setSuccess("");
        startTransition(() => {
            register(values).then((data) => {
                if (data.error) setError(data.error);
                if (data.success) setSuccess(data.success);
            })
        })
    }

    const onGoogleSignIn = async () => {
        setIsGooglePending(true);
        await signIn("google", { callbackUrl: "/fr/dashboard" });
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Créer un compte</h2>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                    7 jours gratuits, aucune carte requise
                </p>
            </div>

            {/* Google Button */}
            <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isGooglePending || isPending}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-6 cursor-pointer"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e5e7eb",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
                {isGooglePending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                )}
                Continuer avec Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs" style={{ color: "#4b5563" }}>ou</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium" style={{ color: "#9ca3af" }}>{t("fields.name")}</FormLabel>
                            <FormControl>
                                <Input disabled={isPending} {...field} placeholder={t("fields.namePlaceholder")}
                                    className="h-12 rounded-xl border text-white placeholder:text-gray-600 bg-transparent focus-visible:ring-1 focus-visible:ring-purple-500"
                                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                                />
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                    )} />

                    {/* Phone - Verified logic removed */}
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium" style={{ color: "#9ca3af" }}>
                                {t("fields.phone")}
                            </FormLabel>
                            <FormControl>
                                <div className="flex gap-2">
                                    <Input disabled={isPending} {...field} placeholder={t("fields.phonePlaceholder")} type="tel"
                                        className="h-12 rounded-xl border text-white placeholder:text-gray-600 bg-transparent focus-visible:ring-1 focus-visible:ring-purple-500"
                                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium" style={{ color: "#9ca3af" }}>{t("fields.email")}</FormLabel>
                            <FormControl>
                                <Input disabled={isPending} {...field} placeholder={t("fields.emailPlaceholder")} type="email"
                                    className="h-12 rounded-xl border text-white placeholder:text-gray-600 bg-transparent focus-visible:ring-1 focus-visible:ring-purple-500"
                                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                                />
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium" style={{ color: "#9ca3af" }}>{t("fields.password")}</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input disabled={isPending} {...field} placeholder={t("fields.passwordPlaceholder")}
                                        type={showPassword ? "text" : "password"}
                                        className="h-12 rounded-xl border text-white placeholder:text-gray-600 bg-transparent focus-visible:ring-1 focus-visible:ring-purple-500 pr-10"
                                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                    )} />

                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <p className="text-sm text-emerald-400">{success}</p>
                        </div>
                    )}

                    <button disabled={isPending} type="submit"
                        className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
                        style={{ background: isPending ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("buttons.register")}
                    </button>
                </form>
            </Form>

            <p className="text-center text-sm mt-6" style={{ color: "#6b7280" }}>
                {t("footer.hasAccount")}{" "}
                <Link href="/login" className="font-medium hover:text-purple-300 transition-colors" style={{ color: "#a78bfa" }}>
                    {t("footer.loginLink")}
                </Link>
            </p>
        </div>
    )
}
