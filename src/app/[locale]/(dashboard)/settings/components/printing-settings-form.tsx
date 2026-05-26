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
import { Printer, FileText, Barcode, ImageIcon, MonitorDot, CheckCircle2, Info, Star } from "lucide-react"
import Bcode from "react-barcode"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

const STORAGE_KEY = "pos_printing_prefs"

export interface PrintingPrefs {
    printerA4: string
    printerReceipt: string
    printerBarcode: string
    barcodeModel: string
    loyaltyCardModel: string
    showBarcodeOnReceipt: boolean
    showLogoOnBL: boolean
}

const defaults: PrintingPrefs = {
    printerA4: "default",
    printerReceipt: "default",
    printerBarcode: "default",
    barcodeModel: "classic",
    loyaltyCardModel: "violet",
    showBarcodeOnReceipt: true,
    showLogoOnBL: true,
}

// ─── Printer presets ───
const getPrintersA4 = (t: any) => [
    { value: "default", label: t("printersOptions.default") },
    { value: "HP LaserJet Pro", label: "HP LaserJet Pro" },
    { value: "HP DeskJet", label: "HP DeskJet" },
    { value: "Canon LBP", label: "Canon LBP" },
    { value: "Brother HL", label: "Brother HL" },
    { value: "Samsung Xpress", label: "Samsung Xpress" },
    { value: "Epson EcoTank", label: "Epson EcoTank" },
    { value: "Gprinter GP-2120TL", label: "Gprinter GP-2120TL" },
    { value: "custom", label: t("printersOptions.custom") },
]

const getPrintersThermal = (t: any) => [
    { value: "default", label: t("printersOptions.default") },
    { value: "Xprinter XP-58IIH", label: "Xprinter XP-58IIH (58mm)" },
    { value: "Xprinter XP-80C", label: "Xprinter XP-80C (80mm)" },
    { value: "Xprinter XP-480B", label: "Xprinter XP-480B" },
    { value: "Gprinter GP-58130", label: "Gprinter GP-58130 (58mm)" },
    { value: "Gprinter GP-80160", label: "Gprinter GP-80160 (80mm)" },
    { value: "Epson TM-T20", label: "Epson TM-T20" },
    { value: "Epson TM-T88", label: "Epson TM-T88" },
    { value: "Star TSP100", label: "Star TSP100" },
    { value: "custom", label: t("printersOptions.custom") },
]

const getPrintersBarcode = (t: any) => [
    { value: "default", label: t("printersOptions.default") },
    { value: "Zebra ZD220", label: "Zebra ZD220" },
    { value: "Zebra ZD421", label: "Zebra ZD421" },
    { value: "Zebra ZP450", label: "Zebra ZP450" },
    { value: "Xprinter XP-480B", label: "Xprinter XP-480B" },
    { value: "Xprinter XP-235B", label: "Xprinter XP-235B" },
    { value: "Gprinter GP-1324D", label: "Gprinter GP-1324D" },
    { value: "Brother QL-820", label: "Brother QL-820" },
    { value: "DYMO LabelWriter", label: "DYMO LabelWriter" },
    { value: "custom", label: t("printersOptions.custom") },
]

// ─── Printer select with optional custom input ───────────────────
const PrinterSelect = ({
    label,
    badge,
    badgeColor,
    hint,
    value,
    onChange,
    options,
    placeholder
}: {
    label: string; badge: string; badgeColor: string; hint: string;
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string
}) => {
    const isCustom = value !== "default" && !options.find(o => o.value === value && o.value !== "custom")
    const selectedInList = options.find(o => o.value === value)
    const selectValue = isCustom ? "custom" : (value || "default")

    return (
        <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", badgeColor)}>{badge}</span>
                {label}
            </Label>
            <Select
                value={selectValue}
                onValueChange={(v) => {
                    if (v === "custom") {
                        onChange("")
                    } else {
                        onChange(v)
                    }
                }}
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {(selectValue === "custom" || isCustom) && (
                <Input
                    placeholder={placeholder}
                    value={value === "" || isCustom ? value : ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="text-sm"
                    autoFocus
                />
            )}
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    )
}

// ─── Barcode Model Preview ────────────────────────────────────────
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
            default: return null
        }
    }

    return (
        <button type="button" onClick={onClick} className={cn(base, selected ? active : inactive, "relative")}>
            {selected && (
                <div className="absolute top-1.5 right-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
                </div>
            )}
            <div className="w-full">{renderModel()}</div>
        </button>
    )
}

const getBarcodeModels = (t: any) => [
    { id: "classic", name: t("barcodeModels.classic") },
    { id: "modern", name: t("barcodeModels.modern") },
    { id: "elegant", name: t("barcodeModels.elegant") },
    { id: "retro", name: t("barcodeModels.retro") },
    { id: "minimal", name: t("barcodeModels.minimal") },
    { id: "bold", name: t("barcodeModels.bold") },
]

// ─── Main Form ───────────────────────────────────────────────────
interface PrintingSettingsFormProps {
    initialBlTemplate: string
}

export const PrintingSettingsForm = ({ initialBlTemplate }: PrintingSettingsFormProps) => {
    const router = useRouter()
    const t = useTranslations("Settings.PrintingSettingsForm")
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
            toast.success(t("success"))
            router.refresh()
        } catch {
            toast.error(t("error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Info Banner */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <span dangerouslySetInnerHTML={{ __html: t.raw("infoBanner") }} />
            </div>

            {/* ── 1. Printer Assignments ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Printer className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-semibold">{t("printers")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-muted/40 p-5 rounded-xl border">
                    <PrinterSelect
                        label={t("printerA4.label")}
                        badge="A4" badgeColor="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        hint={t("printerA4.hint")}
                        value={prefs.printerA4}
                        onChange={(v) => setPrefs(p => ({ ...p, printerA4: v }))}
                        options={getPrintersA4(t)}
                        placeholder={t("printersOptions.customPlaceholder")}
                    />
                    <PrinterSelect
                        label={t("printerReceipt.label")}
                        badge="REÇU" badgeColor="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                        hint={t("printerReceipt.hint")}
                        value={prefs.printerReceipt}
                        onChange={(v) => setPrefs(p => ({ ...p, printerReceipt: v }))}
                        options={getPrintersThermal(t)}
                        placeholder={t("printersOptions.customPlaceholder")}
                    />
                    <PrinterSelect
                        label={t("printerBarcode.label")}
                        badge="CB" badgeColor="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                        hint={t("printerBarcode.hint")}
                        value={prefs.printerBarcode}
                        onChange={(v) => setPrefs(p => ({ ...p, printerBarcode: v }))}
                        options={getPrintersBarcode(t)}
                        placeholder={t("printersOptions.customPlaceholder")}
                    />
                </div>
            </div>

            <Separator />

            {/* ── 2. Barcode Label Model ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Barcode className="w-5 h-5 text-orange-500" />
                    <h3 className="text-base font-semibold">{t("barcodeModel")}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {getBarcodeModels(t).map((m) => (
                        <div key={m.id} className="space-y-2">
                            <BarcodeModelPreview
                                model={m.id}
                                selected={prefs.barcodeModel === m.id}
                                onClick={() => setPrefs(p => ({ ...p, barcodeModel: m.id }))}
                            />
                            <p className={cn("text-xs text-center font-semibold transition-colors", prefs.barcodeModel === m.id ? "text-primary" : "text-muted-foreground")}>
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
                    <h3 className="text-base font-semibold">{t("blTemplate.title")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border">
                    <div className="space-y-2">
                        <Label>{t("blTemplate.label")}</Label>
                        <Select value={blTemplate} onValueChange={setBlTemplate}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">{t("blTemplate.options.standard", { fallback: "Standard" })}</SelectItem>
                                <SelectItem value="compact">{t("blTemplate.options.compact", { fallback: "Compact" })}</SelectItem>
                                <SelectItem value="aitee">{t("blTemplate.options.aitee", { fallback: "AITEE" })}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Separator />

            {/* ── 3b. Loyalty Card Model ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold">Modèle Carte Fidélité</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { id: "violet", name: "Violet", bg: "linear-gradient(135deg,#1e0e3e,#5b21b6)", accent: "#ffd700" },
                        { id: "dark", name: "Noir Premium", bg: "linear-gradient(135deg,#0f0f0f,#1a1a2e)", accent: "#60a5fa" },
                        { id: "ocean", name: "Océan", bg: "linear-gradient(135deg,#0c4a6e,#0ea5e9)", accent: "#fbbf24" },
                    ].map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setPrefs(p => ({ ...p, loyaltyCardModel: m.id }))}
                            className={cn(
                                "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 border-2 p-0",
                                prefs.loyaltyCardModel === m.id
                                    ? "border-primary shadow-lg ring-2 ring-primary/30"
                                    : "border-gray-200 dark:border-gray-700"
                            )}
                        >
                            {prefs.loyaltyCardModel === m.id && (
                                <div className="absolute top-2 right-2 z-10">
                                    <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                                </div>
                            )}
                            <div
                                style={{ background: m.bg, height: 100 }}
                                className="flex flex-col justify-between p-3 text-white text-left"
                            >
                                <div>
                                    <div className="text-[7px] font-bold tracking-widest uppercase opacity-60">BOUTIQUE</div>
                                    <div className="text-[8px] mt-0.5">⭐⭐⭐</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black">NOM DU CLIENT</div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span style={{ color: m.accent }} className="text-[8px]">★</span>
                                        <span style={{ color: m.accent }} className="text-[9px] font-black">1 000</span>
                                        <span style={{ color: m.accent }} className="text-[6px] uppercase opacity-70">pts</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 mt-2">
                    {["Violet", "Noir Premium", "Océan"].map((name, i) => (
                        <p key={i} className={cn("text-xs text-center font-semibold flex-1 transition-colors", prefs.loyaltyCardModel === ["violet","dark","ocean"][i] ? "text-primary" : "text-muted-foreground")}>{name}</p>
                    ))}
                </div>
            </div>

            <Separator />

            {/* ── 4. Display Options ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <MonitorDot className="w-5 h-5 text-purple-500" />
                    <h3 className="text-base font-semibold">{t("displayOptions")}</h3>
                </div>
                <div className="space-y-4 bg-muted/40 p-4 rounded-xl border">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t("showBarcodeOnReceipt.label")}</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">{t("showBarcodeOnReceipt.hint")}</p>
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
                                <Label>{t("showLogoOnBL.label")}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">{t("showLogoOnBL.hint")}</p>
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
                    {loading ? t("saving") : t("submit")}
                </Button>
            </div>
        </div>
    )
}
