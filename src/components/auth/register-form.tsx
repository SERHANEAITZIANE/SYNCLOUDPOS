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
import { useState, useTransition, useRef, useEffect } from "react"
import { register } from "@/actions/register"
import { sendWhatsAppOTP, verifyWhatsAppOTP } from "@/actions/verify-otp"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, MessageSquare } from "lucide-react"

type Step = "form" | "otp"

export const RegisterForm = () => {
    const t = useTranslations("Auth");
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isGooglePending, setIsGooglePending] = useState(false);
    const [step, setStep] = useState<Step>("form");
    const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [normalizedPhone, setNormalizedPhone] = useState("");
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const form = useForm<z.infer<typeof RegisterSchema>>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: { email: "", password: "", name: "", phone: "" },
    })

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const onSendOTP = async () => {
        const phone = form.getValues("phone");
        if (!phone) {
            form.setError("phone", { message: "Requis pour vérifier" });
            return;
        }
        setOtpLoading(true);
        setOtpError("");
        try {
            const result = await sendWhatsAppOTP(phone);
            if (result.error) {
                setOtpError(result.error);
            } else {
                setNormalizedPhone(result.phone || phone);
                setStep("otp");
                setCountdown(60);
                setOtpValues(["", "", "", "", "", ""]);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            }
        } finally {
            setOtpLoading(false);
        }
    }

    const onOtpChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const next = [...otpValues];
        next[index] = value;
        setOtpValues(next);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    }

    const onOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }

    const onVerifyOTP = async () => {
        const code = otpValues.join("");
        if (code.length !== 6) { setOtpError("Entrez les 6 chiffres"); return; }
        setOtpLoading(true);
        setOtpError("");
        try {
            const result = await verifyWhatsAppOTP(normalizedPhone, code);
            if (result.error) {
                setOtpError(result.error);
            } else {
                setOtpVerified(true);
                setStep("form");
            }
        } finally {
            setOtpLoading(false);
        }
    }

    const onSubmit = (values: z.infer<typeof RegisterSchema>) => {
        if (!otpVerified) {
            setError("Veuillez d'abord vérifier votre numéro WhatsApp");
            return;
        }
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

    // OTP Step UI
    if (step === "otp") {
        return (
            <div className="w-full">
                <div className="mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}>
                        <MessageSquare className="w-7 h-7" style={{ color: "#25d366" }} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Vérification WhatsApp</h2>
                    <p className="text-sm" style={{ color: "#6b7280" }}>
                        Un code à 6 chiffres a été envoyé sur{" "}
                        <span className="text-white font-medium">{normalizedPhone}</span>
                    </p>
                </div>

                {/* 6-digit OTP input */}
                <div className="flex gap-2 justify-center mb-6">
                    {otpValues.map((v, i) => (
                        <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={v}
                            onChange={e => onOtpChange(i, e.target.value)}
                            onKeyDown={e => onOtpKeyDown(i, e)}
                            className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
                            style={{
                                background: v ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                                border: v ? "2px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.1)",
                                color: "white",
                            }}
                        />
                    ))}
                </div>

                {otpError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-400">{otpError}</p>
                    </div>
                )}

                <button
                    onClick={onVerifyOTP}
                    disabled={otpLoading || otpValues.join("").length !== 6}
                    className="w-full h-12 rounded-xl font-semibold text-sm text-white mb-4 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    style={{
                        background: otpLoading || otpValues.join("").length !== 6
                            ? "rgba(124,58,237,0.3)"
                            : "linear-gradient(135deg, #7c3aed, #2563eb)"
                    }}
                >
                    {otpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Vérifier le code
                </button>

                <div className="flex items-center justify-between">
                    <button onClick={() => setStep("form")} className="text-sm cursor-pointer hover:text-white transition-colors" style={{ color: "#6b7280" }}>
                        ← Retour
                    </button>
                    {countdown > 0 ? (
                        <span className="text-sm" style={{ color: "#6b7280" }}>
                            Renvoyer dans {countdown}s
                        </span>
                    ) : (
                        <button onClick={onSendOTP} disabled={otpLoading} className="text-sm cursor-pointer hover:text-purple-300 transition-colors" style={{ color: "#a78bfa" }}>
                            Renvoyer le code
                        </button>
                    )}
                </div>
            </div>
        )
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

                    {/* Phone with OTP verify button */}
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium" style={{ color: "#9ca3af" }}>
                                {t("fields.phone")}
                                {otpVerified && <span className="ml-2 text-emerald-400 text-xs inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Vérifié</span>}
                            </FormLabel>
                            <FormControl>
                                <div className="flex gap-2">
                                    <Input disabled={isPending || otpVerified} {...field} placeholder={t("fields.phonePlaceholder")} type="tel"
                                        className="h-12 rounded-xl border text-white placeholder:text-gray-600 bg-transparent focus-visible:ring-1 focus-visible:ring-purple-500"
                                        style={{ background: "rgba(255,255,255,0.04)", borderColor: otpVerified ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)" }}
                                    />
                                    {!otpVerified && (
                                        <button type="button" onClick={onSendOTP} disabled={otpLoading || isPending}
                                            className="h-12 px-3 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                                            style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d366" }}>
                                            {otpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                                            Vérifier
                                        </button>
                                    )}
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
