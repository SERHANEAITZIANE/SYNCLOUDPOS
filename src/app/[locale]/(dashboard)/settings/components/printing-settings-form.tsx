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
import { Input } from "@/components/ui/input"
import { Printer, FileText, Barcode, ImageIcon, MonitorDot, CheckCircle2 } from "lucide-react"
import Bcode from "react-barcode"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "pos_printing_prefs"

export interface PrintingPrefs {
    printerA4: string
    printerReceipt: string
    printerBarcode: string
    barcodeModel: string
    showBarcodeOnReceipt: boolean
    showLogoOnBL: boolean
}

const defaults: PrintingPrefs = {
    printerA4: "",
    printerReceipt: "",
    printerBarcode: "",
    barcodeModel: "classic",
    showBarcodeOnReceipt: true,
    showLogoOnBL: true,
}

// ─────────────────────────────────────────────
// Barcode Model Definitions
// ─────────────────────────────────────────────
const DEMO_VALUE = "1234567890"
const DEMO_NAME = "CASQUE BLUETOOTH"
const DEMO_PRICE = "12 500"

const BarcodeModelPreview = ({ model, selected, onClick }: { model: string; selected: boolean; onClick: () => void }) => {
    const base = "bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center p-3 shadow-sm"
    const active = "border-primary shadow-lg ring-2 ring-primary/30"
    const inactive = "border-gray-200 dark:border-gray-700"

    const renderModel = () => {
        switch (model) {
            case "classic":
                return (
                    <div className="text-center bg-white p-2 w-full">
                        <p className="text-[9px] font-bold uppercase truncate mb-0.5 text-black">{DEMO_NAME}</p>
                        <Bcode value={DEMO_VALUE} height={22} width={1.2} fontSize={8} margin={0} displayValue background="transparent" lineColor="#000" />
                        <p className="text-[10px] font-black mt-0.5 text-black">{DEMO_PRICE} DA</p>
                    </div>
                )
            case "modern":
                return (
                    <div className="bg-gray-900 text-white p-2 rounded-lg w-full text-center">
                        <p className="text-[8px] tracking-widest uppercase opacity-70 mb-0.5">{DEMO_NAME}</p>
                        <Bcode value={DEMO_VALUE} height={20} width={1.1} fontSize={7} margin={0} displayValue={false} background="transparent" lineColor="#fff" />
                        <p className="text-[9px] font-black tracking-widest mt-1">■ {DEMO_PRICE} DA</p>
                    </div>
                )
            case "elegant":
                return (
                    <div className="border border-gray-300 p-2 rounded w-full text-center bg-white">
                        <div className="flex items-center justify-between mb-1 border-b border-gray-200 pb-1">
                            <p className="text-[8px] font-semibold text-gray-700 truncate">{DEMO_NAME}</p>
                            <p className="text-[9px] font-black text-gray-900 shrink-0 ml-1">{DEMO_PRICE}</p>
                        </div>
                        <Bcode value={DEMO_VALUE} height={18} width={1} fontSize={6} margin={0} displayValue={false} background="transparent" lineColor="#333" />
                        <p className="text-[6px] text-gray-400 mt-0.5 tracking-widest">{DEMO_VALUE}</p>
                    </div>
                )
            case "retro":
                return (
                    <div className="bg-amber-50 border border-amber-300 p-2 rounded-lg w-full text-center">
                        <div className="font-serif text-[8px] text-amber-900 font-bold uppercase tracking-wider mb-0.5">{DEMO_NAME}</div>
                        <Bcode value={DEMO_VALUE} height={22} width={1.2} fontSize={8} margin={0} displayValue background="transparent" lineColor="#78350f" />
                        <p className="text-[10px] font-black text-amber-800">{DEMO_PRICE} DA</p>
                    </div>
                )
            case "minimal":
                return (
                    <div className="bg-white w-full text-center p-1">
                        <Bcode value={DEMO_VALUE} height={28} width={1.3} fontSize={9} margin={0} displayValue background="transparent" lineColor="#000" />
                        <div className="flex justify-between items-center mt-0.5 px-1">
                            <p className="text-[8px] text-gray-500 truncate">{DEMO_NAME}</p>
                            <p className="text-[9px] font-black text-black">{DEMO_PRICE}</p>
                        </div>
                    </div>
                )
            case "bold":
                return (
                    <div className="bg-white w-full text-center border-t-4 border-black p-2">
                        <p className="text-[10px] font-black uppercase text-black mb-1 tracking-tighter">{DEMO_NAME}</p>
                        <Bcode value={DEMO_VALUE} height={18} width={1} fontSize={6} margin={0} displayValue={false} background="transparent" lineColor="#000" />
                        <div className="bg-black text-white mt-1 py-0.5 rounded-sm">
                            <p className="text-[11px] font-black tracking-wider">{DEMO_PRICE} DA</p>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(base, selected ? active : inactive, "relative")}
        >
            {selected && (
                <div className="absolute top-1.5 right-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
                </div>
            )}
            <div className="w-full">{renderModel()}</div>
        </button>
    )
}

const BARCODE_MODELS = [
    { id: "classic", name: "Classique" },
    { id: "modern", name: "Moderne (Dark)" },
    { id: "elegant", name: "Élégant" },
    { id: "retro", name: "Rétro" },
    { id: "minimal", name: "Minimaliste" },
    { id: "bold", name: "Bold" },
]

// ─────────────────────────────────────────────
// Main Form
// ─────────────────────────────────────────────
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
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
            {/* ── 1. Printer Assignments ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Printer className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-semibold">Imprimantes</h3>
                    <span className="text-xs text-muted-foreground ml-1">— Entrez les noms exactes de vos imprimantes</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-5 rounded-xl border">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md px-2 py-0.5 text-xs font-bold">A4</span>
                            Imprimante A4
                        </Label>
                        <Input
                            placeholder="Ex: HP LaserJet Pro"
                            value={prefs.printerA4}
                            onChange={(e) => setPrefs(p => ({ ...p, printerA4: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Utilisée pour les Bons de Livraison A4</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md px-2 py-0.5 text-xs font-bold">REÇU</span>
                            Imprimante Reçu
                        </Label>
                        <Input
                            placeholder="Ex: Xprinter XP-80C"
                            value={prefs.printerReceipt}
                            onChange={(e) => setPrefs(p => ({ ...p, printerReceipt: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Imprimante thermique pour les reçus POS</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <span className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-md px-2 py-0.5 text-xs font-bold">CB</span>
                            Imprimante Code-Barre
                        </Label>
                        <Input
                            placeholder="Ex: Zebra ZD220"
                            value={prefs.printerBarcode}
                            onChange={(e) => setPrefs(p => ({ ...p, printerBarcode: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Imprimante dédiée aux étiquettes</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 px-1">
                    💡 Ces noms sont sauvegardés sur cet appareil. L&apos;impression utilisera automatiquement la bonne imprimante pour chaque type de document.
                </p>
            </div>

            <Separator />

            {/* ── 2. Barcode Label Model ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Barcode className="w-5 h-5 text-orange-500" />
                    <h3 className="text-base font-semibold">Modèle d&apos;étiquette code-barre</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {BARCODE_MODELS.map((m) => (
                        <div key={m.id} className="space-y-2">
                            <BarcodeModelPreview
                                model={m.id}
                                selected={prefs.barcodeModel === m.id}
                                onClick={() => setPrefs(p => ({ ...p, barcodeModel: m.id }))}
                            />
                            <p className={cn(
                                "text-xs text-center font-semibold transition-colors",
                                prefs.barcodeModel === m.id ? "text-primary" : "text-muted-foreground"
                            )}>
                                {m.name}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <Separator />

            {/* ── 3. BL Template ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-green-500" />
                    <h3 className="text-base font-semibold">Modèle de Bon de Livraison</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border">
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
                    </div>
                </div>
            </div>

            <Separator />

            {/* ── 4. Options ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <MonitorDot className="w-5 h-5 text-purple-500" />
                    <h3 className="text-base font-semibold">Options d&apos;affichage</h3>
                </div>
                <div className="space-y-4 bg-muted/40 p-4 rounded-xl border">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Code-barre sur le reçu POS</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Imprime un code-barre scannable en bas du reçu</p>
                        </div>
                        <Switch
                            checked={prefs.showBarcodeOnReceipt}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showBarcodeOnReceipt: v }))}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <Label>Logo sur le Bon de Livraison</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">Imprime le logo en haut du BL</p>
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
                    {loading ? "Sauvegarde..." : "Sauvegarder les préférences"}
                </Button>
            </div>
        </div>
    )
}
