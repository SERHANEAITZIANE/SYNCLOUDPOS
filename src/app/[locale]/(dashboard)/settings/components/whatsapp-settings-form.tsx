"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { getWhatsAppSettings, saveWhatsAppSettings } from "@/actions/whatsapp"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MessageCircle, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const WhatsAppSettingsForm = () => {
    const [token, setToken] = useState("")
    const [phoneId, setPhoneId] = useState("")
    const [phone, setPhone] = useState("")
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [isConfigured, setIsConfigured] = useState(false)

    useEffect(() => {
        const load = async () => {
            const settings = await getWhatsAppSettings()
            if (settings) {
                setToken(settings.whatsappToken || "")
                setPhoneId(settings.whatsappPhoneId || "")
                setPhone(settings.whatsappPhone || "")
                setIsConfigured(!!(settings.whatsappToken && settings.whatsappPhoneId))
            }
            setFetching(false)
        }
        load()
    }, [])

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await saveWhatsAppSettings({ whatsappToken: token, whatsappPhoneId: phoneId, whatsappPhone: phone })
            if (result.error) { toast.error(result.error); return }
            toast.success("Paramètres WhatsApp sauvegardés!")
            setIsConfigured(!!(token && phoneId))
        } catch {
            toast.error("Erreur lors de la sauvegarde.")
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return <div className="animate-pulse h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />

    return (
        <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <div>
                        <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">WhatsApp Business API</h3>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            Envoyez des reçus et rappels de dettes directement sur WhatsApp.
                        </p>
                    </div>
                </div>
                {isConfigured
                    ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Configuré</Badge>
                    : <Badge variant="outline" className="text-amber-600 border-amber-400 gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Non configuré</Badge>
                }
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Access Token (Permanent)</Label>
                    <Input
                        type="password"
                        placeholder="EAAxxxxxx..."
                        className="font-mono text-sm"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                        Générez un token permanent sur{" "}
                        <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">
                            Meta for Developers <ExternalLink className="w-3 h-3" />
                        </a>
                    </p>
                </div>

                <div className="space-y-1.5">
                    <Label>Phone Number ID</Label>
                    <Input
                        type="text"
                        placeholder="123456789012345"
                        className="font-mono text-sm"
                        value={phoneId}
                        onChange={(e) => setPhoneId(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Trouvé dans WhatsApp → Numéros de téléphone</p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                    <Label>Numéro WhatsApp Expéditeur</Label>
                    <Input
                        type="text"
                        placeholder="+213554123456"
                        className="font-mono text-sm max-w-xs"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Format international avec indicatif pays (ex: +213 pour Algérie)</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                    Guide de configuration <ExternalLink className="w-3 h-3" />
                </a>
                <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-36">
                    {loading ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
            </div>
        </div>
    )
}
