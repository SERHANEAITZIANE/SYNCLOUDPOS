"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "react-hot-toast"
import {
    Building2,
    MapPin,
    Phone,
    FileText,
    CreditCard,
    Image as ImageIcon,
    Layout
} from "lucide-react"

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
import { useRouter } from "@/i18n/routing"
import { ImageUpload } from "@/components/ui/image-upload"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface CompanyFormProps {
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
    }
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ initialData }) => {
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
        }
    })

    const onSubmit = async (values: z.infer<typeof SettingsSchema>) => {
        try {
            setLoading(true)
            const result = await updateTenantSettings(values);
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.success || "Informations de l'entreprise mises à jour.")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Identity Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Identité</CardTitle>
                                <CardDescription>Nom et activité principale</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nom de la Société</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="SynCloud Solutions" {...field} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ownerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nom du Propriétaire</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="John Doe" {...field} className="bg-white/50 dark:bg-black/20" />
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
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Activité</FormLabel>
                                        <FormControl>
                                            <Textarea disabled={loading} placeholder="Décrivez votre activité..." className="resize-none bg-white/50 dark:bg-black/20" rows={4} {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Logo Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Logo & Marque</CardTitle>
                                <CardDescription>Identité visuelle</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center pt-4">
                            <FormField
                                control={form.control}
                                name="logo"
                                render={({ field }) => (
                                    <FormItem className="w-full flex flex-col items-center">
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
                            <p className="text-[10px] text-muted-foreground mt-4 text-center uppercase tracking-wider font-bold">
                                Recommandé: PNG/JPG 512x512px
                            </p>
                        </CardContent>
                    </Card>

                    {/* Contact Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Phone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Contact</CardTitle>
                                <CardDescription>Comment vous joindre</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Téléphone</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="+213..." {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
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
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">E-mail</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="contact@example.com" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fax"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fax</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="N° de Fax" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Location Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Localisation</CardTitle>
                                <CardDescription>Adresse physique</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="wilaya"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Wilaya</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} placeholder="Ex. Alger" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="commune"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Commune</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} placeholder="Ex. Bab Ezzouar" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Adresse complète</FormLabel>
                                        <FormControl>
                                            <Textarea disabled={loading} placeholder="N°, Rue..." className="resize-none bg-white/50 dark:bg-black/20" rows={3} {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Legal Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm lg:col-span-2">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Fiscalité & Législation</CardTitle>
                                <CardDescription>Identifiants officiels de l{"'"}entreprise</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <FormField
                                control={form.control}
                                name="nif"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">NIF (Identifiant Fiscale)</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="N° NIF" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="rc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">RC (Registre Commerce)</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="N° RC" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="nis"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">NIS (Identifiant Statistique)</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="N° NIS" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="artImposition"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Article d{"'"}Imposition</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="N° AI" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Finance Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Banque</CardTitle>
                                <CardDescription>Compte bancaire principal (RIB)</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="bankAccount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Numéro de Compte / RIB</FormLabel>
                                        <FormControl>
                                            <Input disabled={loading} placeholder="Saisir le RIB complet" {...field} value={field.value ?? ""} className="bg-white/50 dark:bg-black/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Branding Card */}
                    <Card className="shadow-md border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm lg:col-span-3">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                <Layout className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Personnalisation des Documents</CardTitle>
                                <CardDescription>Ce texte apparaîtra sur vos bons et factures</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="headerText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Entête / Pied de page additionnel</FormLabel>
                                        <FormControl>
                                            <Textarea disabled={loading} placeholder="Slogan, conditions générales courtes, remerciements..." className="h-32 resize-none bg-white/50 dark:bg-black/20" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                </div>

                <div className="flex justify-end pt-4">
                    <Button disabled={loading} className="rounded-xl h-12 px-12 text-md font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" type="submit">
                        {loading ? "Sauvegarde en cours..." : "Enregistrer les modifications"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
