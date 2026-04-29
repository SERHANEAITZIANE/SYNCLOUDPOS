"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { getEmailSettings, saveEmailSettings, testEmailConnection } from "@/actions/email-settings"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Mail, ExternalLink, CheckCircle, AlertCircle, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const EmailSettingsForm = () => {
    const [smtpHost, setSmtpHost] = useState("")
    const [smtpPort, setSmtpPort] = useState("587")
    const [smtpUser, setSmtpUser] = useState("")
    const [smtpPass, setSmtpPass] = useState("")
    const [smtpFrom, setSmtpFrom] = useState("")
    const [loading, setLoading] = useState(false)
    const [testing, setTesting] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [isConfigured, setIsConfigured] = useState(false)

    useEffect(() => {
        const load = async () => {
            const settings = await getEmailSettings()
            if (settings) {
                setSmtpHost(settings.smtpHost || "")
                setSmtpPort(settings.smtpPort || "587")
                setSmtpUser(settings.smtpUser || "")
                setSmtpPass(settings.smtpPass || "")
                setSmtpFrom(settings.smtpFrom || "")
                setIsConfigured(!!(settings.smtpHost && settings.smtpUser && settings.smtpPass))
            }
            setFetching(false)
        }
        load()
    }, [])

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await saveEmailSettings({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })
            if (result.error) { toast.error(result.error); return }
            toast.success(result.success || "Sauvegardé !")
            setIsConfigured(!!(smtpHost && smtpUser && smtpPass))
        } catch {
            toast.error("Erreur lors de la sauvegarde")
        } finally {
            setLoading(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            const result = await testEmailConnection()
            if (result.error) { toast.error(result.error); return }
            toast.success(result.success || "Email de test envoyé !")
        } catch {
            toast.error("Erreur lors du test")
        } finally {
            setTesting(false)
        }
    }

    if (fetching) return <div className="animate-pulse h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />

    return (
        <div className="p-5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-200">Email / SMTP</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            Configurez l&apos;envoi d&apos;emails (factures, BL, devis) à vos clients
                        </p>
                    </div>
                </div>
                {isConfigured
                    ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Configuré</Badge>
                    : <Badge variant="outline" className="text-amber-600 border-amber-400 gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Non configuré</Badge>
                }
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Serveur SMTP</Label>
                    <Input
                        type="text"
                        placeholder="smtp.gmail.com"
                        className="font-mono text-sm"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Gmail: smtp.gmail.com | Outlook: smtp.office365.com
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label>Port SMTP</Label>
                    <Input
                        type="text"
                        placeholder="587"
                        className="font-mono text-sm"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        587 (TLS recommandé) ou 465 (SSL)
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label>Email / Identifiant</Label>
                    <Input
                        type="email"
                        placeholder="votre.email@gmail.com"
                        className="font-mono text-sm"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Votre adresse email complète
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label>Mot de passe / App Password</Label>
                    <Input
                        type="password"
                        placeholder="••••••••••••••••"
                        className="font-mono text-sm"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Gmail: utilisez un{" "}
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                            mot de passe d&apos;application <ExternalLink className="w-3 h-3" />
                        </a>
                    </p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                    <Label>Nom d&apos;expéditeur (optionnel)</Label>
                    <Input
                        type="text"
                        placeholder="Mon Magasin <shop@gmail.com>"
                        className="text-sm max-w-md"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Le nom qui apparaîtra comme expéditeur. Laissez vide pour utiliser l&apos;email.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing || !isConfigured}
                    className="gap-1.5"
                >
                    <Send className="w-3.5 h-3.5" />
                    {testing ? "Envoi en cours..." : "Tester la connexion"}
                </Button>
                <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-36">
                    {loading ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
            </div>
        </div>
    )
}
