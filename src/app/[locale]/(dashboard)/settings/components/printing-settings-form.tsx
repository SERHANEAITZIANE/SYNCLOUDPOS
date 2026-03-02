"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { updateSystemSettings } from "@/actions/settings"
import { useRouter } from "@/i18n/routing"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Printer, FileText, Barcode, Image } from "lucide-react"

const STORAGE_KEY = "pos_printing_prefs"

export interface PrintingPrefs {
    paperSize: "A4" | "thermal80" | "thermal58"
    showBarcodeOnReceipt: boolean
    showLogoOnBL: boolean
}

const defaults: PrintingPrefs = {
    paperSize: "thermal80",
    showBarcodeOnReceipt: true,
    showLogoOnBL: true,
}

interface PrintingSettingsFormProps {
    initialBlTemplate: string
}

export const PrintingSettingsForm = ({ initialBlTemplate }: PrintingSettingsFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [blTemplate, setBlTemplate] = useState(initialBlTemplate || "standard")
    const [prefs, setPrefs] = useState<PrintingPrefs>(defaults)

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) setPrefs({ ...defaults, ...JSON.parse(stored) })
        } catch { /* noop */ }
    }, [])

    const handleSave = async () => {
        try {
            setLoading(true)
            // 1. Save local preferences
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))

            // 2. Save BL Template to DB
            const result = await updateSystemSettings({ blTemplate, geminiApiKey: undefined })
            if (result.error) { toast.error(result.error); return }

            toast.success("Paramètres d'impression sauvegardés !")
            router.refresh()
        } catch {
            toast.error("Erreur lors de la sauvegarde.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Paper Size */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Printer className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-semibold">Imprimante & Papier</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div className="space-y-2">
                        <Label>Format papier par défaut</Label>
                        <Select value={prefs.paperSize} onValueChange={(v) => setPrefs(p => ({ ...p, paperSize: v as PrintingPrefs["paperSize"] }))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A4">A4 (Feuille standard)</SelectItem>
                                <SelectItem value="thermal80">Thermique 80mm</SelectItem>
                                <SelectItem value="thermal58">Thermique 58mm</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Appliqué lors de l&apos;impression des reçus et BL depuis ce navigateur.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* BL Template */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <h3 className="text-base font-semibold">Modèle de Bon de Livraison</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div className="space-y-2">
                        <Label>Modèle à utiliser</Label>
                        <Select value={blTemplate} onValueChange={setBlTemplate}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">Standard (Classique)</SelectItem>
                                <SelectItem value="compact">Compact (Thermique)</SelectItem>
                                <SelectItem value="aitee">AITEE (Facture Structurée)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Modèle d&apos;impression utilisé par défaut pour les Bons de Livraison.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Receipt Options */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Barcode className="w-5 h-5 text-purple-500" />
                    <h3 className="text-base font-semibold">Options du Reçu POS</h3>
                </div>
                <div className="space-y-4 bg-muted/40 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Afficher le code-barre sur le reçu</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Imprime un code-barre scannable en bas du reçu POS
                            </p>
                        </div>
                        <Switch
                            checked={prefs.showBarcodeOnReceipt}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showBarcodeOnReceipt: v }))}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <Label>Afficher le logo sur le BL</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Imprime le logo de l&apos;entreprise en haut du Bon de Livraison
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={prefs.showLogoOnBL}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showLogoOnBL: v }))}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={loading} className="min-w-36">
                    {loading ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
            </div>
        </div>
    )
}
