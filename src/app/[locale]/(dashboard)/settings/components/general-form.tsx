"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { updateTenantSettings } from "@/actions/settings"
import { SettingsSchema } from "@/schemas/settings"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "@/i18n/routing"
import { ImageUpload } from "@/components/ui/image-upload"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

interface GeneralFormProps {
    initialData: {
        name: string;
        ownerName: string | null;
        activity: string | null;
        address: string | null;
        wilaya: string | null;
        commune: string | null;
        phone: string | null;
        fax: string | null;
        email: string | null;
        nif: string | null;
        rc: string | null;
        artImposition: string | null;
        nis: string | null;
        bankAccount: string | null;
        logo: string | null;
        headerText: string | null;
        blTemplate: string;
        isElectronics: boolean;
    }
}

export const GeneralForm: React.FC<GeneralFormProps> = ({ initialData }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const t = useTranslations("Settings.GeneralForm")

    const form = useForm<z.infer<typeof SettingsSchema>>({
        resolver: zodResolver(SettingsSchema),
        defaultValues: {
            name: initialData.name || "",
            ownerName: initialData.ownerName || "",
            activity: initialData.activity || "",
            address: initialData.address || "",
            wilaya: initialData.wilaya || "",
            commune: initialData.commune || "",
            phone: initialData.phone || "",
            fax: initialData.fax || "",
            email: initialData.email || "",
            nif: initialData.nif || "",
            rc: initialData.rc || "",
            artImposition: initialData.artImposition || "",
            nis: initialData.nis || "",
            bankAccount: initialData.bankAccount || "",
            logo: initialData.logo || "",
            headerText: initialData.headerText || "",
            blTemplate: initialData.blTemplate || "standard",
            isElectronics: initialData.isElectronics || false,
        }
    })

    const onSubmit = async (values: z.infer<typeof SettingsSchema>) => {
        try {
            setLoading(true)
            const result = await updateTenantSettings(values);
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.success || t("success"))
                router.refresh()
            }
        } catch {
            toast.error(t("error"))
        } finally {
            setLoading(false)
        }
    }

    const Field = ({ name, label, placeholder }: { name: keyof z.infer<typeof SettingsSchema>, label: string, placeholder?: string }) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">{label}</FormLabel>
                    <FormControl>
                        <Input
                            disabled={loading}
                            placeholder={placeholder || ""}
                            {...field}
                            value={field.value as string ?? ""}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    )

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
                <div className="flex gap-8">
                    {/* Left Column: Form Fields */}
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field name="ownerName" label={t("ownerName.label")} placeholder={t("ownerName.placeholder")} />
                            <Field name="name" label={t("name.label")} placeholder={t("name.placeholder")} />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm text-muted-foreground">{t("address.label")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder={t("address.placeholder")}
                                            rows={3}
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="activity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm text-muted-foreground">{t("activity.label")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder={t("activity.placeholder")}
                                            rows={3}
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Field name="wilaya" label={t("wilaya.label")} placeholder={t("wilaya.placeholder")} />
                            <Field name="commune" label={t("commune.label")} placeholder={t("commune.placeholder")} />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <Field name="phone" label={t("phone.label")} placeholder={t("phone.placeholder")} />
                            <Field name="fax" label={t("fax.label")} placeholder={t("fax.placeholder")} />
                        </div>

                        <Field name="email" label={t("email.label")} placeholder={t("email.placeholder")} />

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <Field name="nif" label={t("nif.label")} placeholder={t("nif.placeholder")} />
                            <Field name="rc" label={t("rc.label")} placeholder={t("rc.placeholder")} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field name="artImposition" label={t("artImposition.label")} placeholder={t("artImposition.placeholder")} />
                            <Field name="nis" label={t("nis.label")} placeholder={t("nis.placeholder")} />
                        </div>

                        <Field name="bankAccount" label={t("bankAccount.label")} placeholder={t("bankAccount.placeholder")} />

                        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 mt-6">
                            <FormField
                                control={form.control}
                                name="isElectronics"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between space-y-0 gap-4">
                                        <div className="space-y-1">
                                            <FormLabel className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                🔌 Boutique Électronique / Matériel
                                            </FormLabel>
                                            <FormDescription className="text-xs text-muted-foreground">
                                                Activez cette option pour activer la gestion des numéros de série (S/N), bons de garantie automatiques et traçabilité avancée.
                                            </FormDescription>
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
                        </div>
                    </div>

                    {/* Right Column: Logo + Header */}
                    <div className="w-72 flex-shrink-0 flex flex-col gap-6">
                        <div className="space-y-2">
                            <FormLabel className="text-sm text-muted-foreground">{t("logo.label")}</FormLabel>
                            <FormField
                                control={form.control}
                                name="logo"
                                render={({ field }) => (
                                    <FormItem>
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
                        </div>

                        <FormField
                            control={form.control}
                            name="headerText"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="text-sm text-muted-foreground">{t("headerText.label")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder={t("headerText.placeholder")}
                                            className="h-48 resize-none"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="blTemplate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm text-muted-foreground">{t("blTemplate.label")}</FormLabel>
                                    <Select
                                        disabled={loading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("blTemplate.placeholder")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="standard">{t("blTemplate.options.standard")}</SelectItem>
                                            <SelectItem value="compact">{t("blTemplate.options.compact")}</SelectItem>
                                            <SelectItem value="aitee">{t("blTemplate.options.aitee")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                    <Button disabled={loading} className="min-w-32" type="submit">
                        {loading ? t("saving") : t("submit")}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
