"use client"

import { useState, useEffect } from "react"
import { getAlgerianSettings, updateAlgerianSettings } from "@/actions/algerian-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { Moon, Truck, Calculator, Save, AlertTriangle, Key } from "lucide-react"

export function AlgerianSettingsForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        ramadanMode: false,
        commissionRate: 0,
        taxRegime: "G50",
        ifuRate: 5,
        yalidineApiId: "",
        yalidineApiToken: "",
        dhdApiToken: "",
        hddApiToken: "",
    })

    useEffect(() => {
        getAlgerianSettings().then(data => {
            if (data) setSettings({
                ramadanMode: data.ramadanMode ?? false,
                commissionRate: data.commissionRate ?? 0,
                taxRegime: data.taxRegime ?? "G50",
                ifuRate: data.ifuRate ?? 5,
                yalidineApiId: data.yalidineApiId ?? "",
                yalidineApiToken: data.yalidineApiToken ?? "",
                dhdApiToken: data.dhdApiToken ?? "",
                hddApiToken: data.hddApiToken ?? "",
            })
            setLoading(false)
        })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        const result = await updateAlgerianSettings({
            ...settings,
            commissionRate: Number(settings.commissionRate),
            ifuRate: Number(settings.ifuRate)
        })
        if ("error" in result) toast.error(result.error)
        else toast.success("Paramètres algériens enregistrés ✓")
        setSaving(false)
    }

    if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>

    return (
        <div className="space-y-6">
            {/* Ramadan Mode */}
            <div className="flex items-center justify-between p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-amber-600" />
                    <div>
                        <p className="font-bold text-amber-900 dark:text-amber-100">Mode Ramadan</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">Affiche les horaires de l'Iftar et du Suhoor dans le tableau de bord</p>
                    </div>
                </div>
                <Switch
                    checked={settings.ramadanMode}
                    onCheckedChange={v => setSettings(s => ({ ...s, ramadanMode: v }))}
                />
            </div>

            {/* Commission Rate */}
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-bold">Commissions Vendeurs</h3>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux de commission par défaut (%)</Label>
                    <div className="flex items-center gap-2 max-w-xs">
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={settings.commissionRate}
                            onChange={e => setSettings(s => ({ ...s, commissionRate: Number(e.target.value) }))}
                            className="rounded-xl"
                        />
                        <span className="text-muted-foreground font-bold">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Appliqué automatiquement sur la page Commissions Vendeurs</p>
                </div>
            </div>

            {/* Tax Regime */}
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold">Régime Fiscal</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Régime d'imposition</Label>
                        <Select value={settings.taxRegime} onValueChange={v => setSettings(s => ({ ...s, taxRegime: v }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="G50">G50 — Régime du Réel (TVA)</SelectItem>
                                <SelectItem value="G12">G12 / G12 Bis — IFU (Forfait)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {settings.taxRegime === "G12" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux IFU</Label>
                            <Select value={String(settings.ifuRate)} onValueChange={v => setSettings(s => ({ ...s, ifuRate: Number(v) }))}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5% — Production & vente de biens</SelectItem>
                                    <SelectItem value="12">12% — Services & commerce</SelectItem>
                                    <SelectItem value="0.5">0,5% — Auto-entrepreneur</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Delivery API Keys */}
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5 text-sky-600" />
                    <h3 className="font-bold">Clés API Livraison</h3>
                </div>
                <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <AlertTriangle size={14} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Obtenez vos clés API depuis le portail de votre transporteur (Yalidine → Développement → Tableau de bord)
                    </p>
                </div>
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">🚀 Yalidine API ID</Label>
                            <Input type="password" value={settings.yalidineApiId} onChange={e => setSettings(s => ({ ...s, yalidineApiId: e.target.value }))} placeholder="Yalidine API ID..." className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">🚀 Yalidine API Token</Label>
                            <Input type="password" value={settings.yalidineApiToken} onChange={e => setSettings(s => ({ ...s, yalidineApiToken: e.target.value }))} placeholder="Yalidine API Token..." className="rounded-xl" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">🟡 DHD API Token</Label>
                            <Input type="password" value={settings.dhdApiToken} onChange={e => setSettings(s => ({ ...s, dhdApiToken: e.target.value }))} placeholder="DHD Token..." className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">🔴 HDD API Token</Label>
                            <Input type="password" value={settings.hddApiToken} onChange={e => setSettings(s => ({ ...s, hddApiToken: e.target.value }))} placeholder="HDD Token..." className="rounded-xl" />
                        </div>
                    </div>
                </div>
                <div className="flex items-start gap-2 mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Truck size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                        <strong>Procolis</strong> et <strong>Zr Express</strong> seront configurables ici prochainement. En attendant, les colis sont enregistrés localement.
                    </p>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2 rounded-xl h-11">
                <Save size={16} />
                {saving ? "Enregistrement..." : "Enregistrer les paramètres algériens"}
            </Button>
        </div>
    )
}
