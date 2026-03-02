"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { updateEnvDatabaseUrl } from "@/actions/system-settings"
import { useRouter } from "@/i18n/routing"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Database, AlertCircle } from "lucide-react"

interface AdvancedSettingsFormProps {
    initialDatabaseUrl: string
}

export const AdvancedSettingsForm = ({ initialDatabaseUrl }: AdvancedSettingsFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [dbUrl, setDbUrl] = useState(initialDatabaseUrl || "")

    const handleSave = async () => {
        if (!dbUrl) { toast.error("L'URL de la base de données est requise."); return }
        try {
            setLoading(true)
            const result = await updateEnvDatabaseUrl(dbUrl)
            if (result.error) { toast.error(result.error); return }
            toast.success(result.success || "URL sauvegardée. Redémarrez le serveur.", { duration: 6000 })
            router.refresh()
        } catch {
            toast.error("Erreur lors de la sauvegarde.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="p-5 bg-red-50/60 dark:bg-red-950/10 border border-red-200 dark:border-red-900 rounded-xl space-y-5">
                <div className="flex items-start gap-3 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-6 h-6 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold">Zone Sensible</h3>
                        <p className="text-sm mt-1">
                            Modifier cette URL changera le point d&apos;accès à la base de données.
                            Une mauvaise configuration empêchera l&apos;application de démarrer.
                            Un <strong>redémarrage du serveur</strong> est nécessaire après modification.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-red-500" />
                        <Label className="text-red-700 dark:text-red-400 font-semibold">Chaîne de connexion (DATABASE_URL)</Label>
                    </div>
                    <Input
                        placeholder="postgresql://user:pass@localhost:5432/dbname"
                        className="font-mono text-sm bg-white dark:bg-zinc-900"
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Exemples: <code>postgresql://user:pass@host/db</code> ou <code>file:./dev.db</code> (SQLite local)
                    </p>
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        variant="destructive"
                        className="min-w-36"
                    >
                        {loading ? "Sauvegarde..." : "Appliquer"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
