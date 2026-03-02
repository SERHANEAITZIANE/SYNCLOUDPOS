"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { updateSystemSettings } from "@/actions/settings"
import { useRouter } from "@/i18n/routing"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, ExternalLink } from "lucide-react"

interface AiSettingsFormProps {
    initialGeminiApiKey: string | null
}

export const AiSettingsForm = ({ initialGeminiApiKey }: AiSettingsFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [apiKey, setApiKey] = useState(initialGeminiApiKey || "")

    const handleSave = async () => {
        try {
            setLoading(true)
            const result = await updateSystemSettings({ blTemplate: "standard", geminiApiKey: apiKey })
            if (result.error) { toast.error(result.error); return }
            toast.success("Clé API Gemini sauvegardée !")
            router.refresh()
        } catch {
            toast.error("Erreur lors de la sauvegarde.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl space-y-5">
                <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">Google Gemini — OCR & IA</h3>
                        <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                            Utilisé pour numériser automatiquement les factures fournisseurs (OCR) et les fonctions d&apos;intelligence artificielle de l&apos;application.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Clé API Google Gemini</Label>
                    <Input
                        type="password"
                        placeholder="AIzaSy..."
                        className="font-mono text-sm"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Obtenez gratuitement votre clé sur{" "}
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                            Google AI Studio <ExternalLink className="w-3 h-3" />
                        </a>
                    </p>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-36">
                        {loading ? "Sauvegarde..." : "Sauvegarder"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
