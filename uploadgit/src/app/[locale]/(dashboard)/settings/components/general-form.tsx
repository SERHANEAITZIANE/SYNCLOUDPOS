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
} from "@/components/ui/form"
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
    }
}

export const GeneralForm: React.FC<GeneralFormProps> = ({ initialData }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

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
        }
    })

    const onSubmit = async (values: z.infer<typeof SettingsSchema>) => {
        try {
            setLoading(true)
            const result = await updateTenantSettings(values);
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.success || "Paramètres sauvegardés.")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue.")
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
                            <Field name="ownerName" label="Nom" placeholder="Nom du propriétaire" />
                            <Field name="name" label="Société" placeholder="Nom de l'entreprise" />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm text-muted-foreground">Adresse</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder="Adresse complète"
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
                                    <FormLabel className="text-sm text-muted-foreground">Activité</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder="Secteur d'activité"
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
                            <Field name="wilaya" label="Wilaya" placeholder="Ex. ALGER" />
                            <Field name="commune" label="Commune" placeholder="Ex. DAR EL BEIDA" />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <Field name="phone" label="Téléphone" placeholder="0696 92 82 27" />
                            <Field name="fax" label="Fax" placeholder="023 83 11 25" />
                        </div>

                        <Field name="email" label="E-Mail" placeholder="contact@entreprise.com" />

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <Field name="nif" label="Nif" placeholder="191441002919..." />
                            <Field name="rc" label="N° Rc" placeholder="16/00-3853278 A15" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field name="artImposition" label="Article d'imposition" placeholder="16204594504" />
                            <Field name="nis" label="NIS" placeholder="199144100291916" />
                        </div>

                        <Field name="bankAccount" label="Compte bancaire" placeholder="001002680300001520/32" />
                    </div>

                    {/* Right Column: Logo + Header */}
                    <div className="w-72 flex-shrink-0 flex flex-col gap-6">
                        <div className="space-y-2">
                            <FormLabel className="text-sm text-muted-foreground">Photo / Logo</FormLabel>
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
                                    <FormLabel className="text-sm text-muted-foreground">Entête</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={loading}
                                            placeholder="Texte d'en-tête à imprimer sur les documents..."
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
                                    <FormLabel className="text-sm text-muted-foreground">Modèle de Bon de Livraison</FormLabel>
                                    <Select
                                        disabled={loading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner le modèle" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard (Classique)</SelectItem>
                                            <SelectItem value="compact">Compact (Sans Entête)</SelectItem>
                                            <SelectItem value="aitee">AITEE (Facture Style)</SelectItem>
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
                        {loading ? "Sauvegarde..." : "Valider"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
