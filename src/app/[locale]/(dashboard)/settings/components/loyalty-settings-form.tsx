"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "react-hot-toast"
import { Star, Save, Zap } from "lucide-react"

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateLoyaltySettings } from "@/actions/settings"
import { useTranslations } from "next-intl"

const loyaltySchema = z.object({
    loyaltyPointsPerDa: z.coerce.number().min(0, "Must be greater than or equal to 0"),
    loyaltyDaPerPoint: z.coerce.number().min(1, "Must be at least 1"),
})

type LoyaltyFormValues = z.infer<typeof loyaltySchema>

interface LoyaltySettingsFormProps {
    initialData: {
        loyaltyPointsPerDa: number
        loyaltyDaPerPoint: number
    }
}

export const LoyaltySettingsForm = ({ initialData }: LoyaltySettingsFormProps) => {
    const t = useTranslations("Settings.LoyaltySettingsForm")
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof loyaltySchema>>({
        resolver: zodResolver(loyaltySchema) as any,
        defaultValues: {
            loyaltyPointsPerDa: initialData?.loyaltyPointsPerDa ?? 1,
            loyaltyDaPerPoint: initialData?.loyaltyDaPerPoint ?? 100,
        }
    })

    const onSubmit = async (data: LoyaltyFormValues) => {
        setIsLoading(true)
        try {
            const res = await updateLoyaltySettings({
                loyaltyPointsPerDa: data.loyaltyPointsPerDa,
                loyaltyDaPerPoint: data.loyaltyDaPerPoint
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || t("success"))
            }
        } catch (error) {
            toast.error(t("error"))
        } finally {
            setIsLoading(false)
        }
    }

    const currentPointsPerDa = form.watch("loyaltyPointsPerDa")
    const currentDaPerPoint = form.watch("loyaltyDaPerPoint")

    return (
        <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
            <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                        <Star className="h-6 w-6 fill-amber-500" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold">{t("loyaltyProgram")}</CardTitle>
                        <CardDescription className="text-gray-500 mt-1">
                            {t("loyaltyDesc")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                        <Zap className="h-4 w-4" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("earningPoints")}</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="loyaltyPointsPerDa"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">{t("pointsPerDa")}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        disabled={isLoading}
                                                        {...field}
                                                        className="h-11 rounded-xl pr-16 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus-visible:ring-emerald-500"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                                        pts/DA
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                {t("exampleEarn", { val: 1, points: 1000 * (currentPointsPerDa || 1) })}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                                        <Star className="h-4 w-4" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("spendingPoints")}</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="loyaltyDaPerPoint"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">{t("daPerPoint")}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        disabled={isLoading}
                                                        {...field}
                                                        className="h-11 rounded-xl pr-16 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus-visible:ring-amber-500"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                                        pts/DA
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                {t("exampleSpend", { val: 100, points: 10 * (currentDaPerPoint || 100) })}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Summary Widget */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">{t("summaryTitle")}</p>
                                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">{t("summaryDesc")}</p>
                            </div>
                            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg">
                                {Number(((10000 * (currentPointsPerDa || 1)) / (currentDaPerPoint || 100)).toFixed(2))} DA
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {t("saveChanges")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
