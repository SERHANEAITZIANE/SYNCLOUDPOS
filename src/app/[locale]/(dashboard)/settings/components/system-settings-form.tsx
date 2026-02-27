"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { updateSystemSettings } from "@/actions/settings"
import { updateEnvDatabaseUrl } from "@/actions/system-settings"
import { SystemSettingsSchema } from "@/schemas/settings"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "@/i18n/routing"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Database } from "lucide-react"

interface SystemSettingsFormProps {
    initialData: {
        blTemplate: string;
        databaseUrl: string;
    }
}

export const SystemSettingsForm: React.FC<SystemSettingsFormProps> = ({ initialData }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof SystemSettingsSchema>>({
        resolver: zodResolver(SystemSettingsSchema),
        defaultValues: {
            blTemplate: initialData.blTemplate || "standard",
            databaseUrl: initialData.databaseUrl || "",
        }
    })

    const onSubmit = async (values: z.infer<typeof SystemSettingsSchema>) => {
        try {
            setLoading(true)

            // 1. Update Database URL if changed
            if (values.databaseUrl && values.databaseUrl !== initialData.databaseUrl) {
                const envResult = await updateEnvDatabaseUrl(values.databaseUrl);
                if (envResult.error) {
                    toast.error(envResult.error);
                    return;
                } else if (envResult.success) {
                    toast.success(envResult.success, { duration: 5000 });
                }
            }

            // 2. Update System Configs (blTemplate, etc into DB)
            const result = await updateSystemSettings({ blTemplate: values.blTemplate || "standard" });
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.success || "Paramètres système sauvegardés.")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue lors de la sauvegarde du système.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">

                {/* 1. Apparence & Ergonomie */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Apparence & Ergonomie</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="blTemplate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Modèle de Bon de Livraison par défaut</FormLabel>
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
                                            <SelectItem value="compact">Compact (Idéal thermiques 80mm/etc)</SelectItem>
                                            <SelectItem value="aitee">AITEE (Facture Style structuré)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choisit l'apparence par défaut des Bons de Livraison imprimés depuis le POS.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                {/* 2. Base de données */}
                <div>
                    <h3 className="text-lg font-medium mb-4 text-red-500 flex items-center gap-2">
                        <Database className="w-5 h-5" /> Zone Sensible : Base de Données
                    </h3>
                    <div className="p-4 bg-red-50/50 border border-red-200 rounded-lg space-y-4">
                        <div className="flex items-start gap-3 text-red-600 text-sm">
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <p>
                                <strong>Attention :</strong> Modifier cette URL changera complètement le point d'accès de l'application à ses données.
                                Une mauvaise URL empêchera l'application de démarrer correctement. Après modification de cette valeur, un <strong>redémarrage du serveur Node.js (ou VPS)</strong> sera nécessaire pour prendre en compte le nouveau fichier <code>.env</code>.
                            </p>
                        </div>
                        <FormField
                            control={form.control}
                            name="databaseUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-red-700 font-semibold">Chaîne de connexion (DATABASE_URL)</FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={loading}
                                            placeholder="mysql://user:password@localhost:3306/db_name"
                                            className="font-mono text-sm bg-white"
                                            {...field}
                                            value={field.value as string ?? ""}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-red-400">
                                        Exemples : <code>file:./dev.db</code> (SQLite) ou <code>mysql://root:pass@127.0.0.1:3306/pos</code> (MySQL)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                    <Button disabled={loading} className="min-w-32 bg-blue-600 hover:bg-blue-700 text-white" type="submit">
                        {loading ? "Sauvegarde..." : "Appliquer les Paramètres"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
