"use client"

import { useState, useEffect } from "react"
import { getAlgerianSettings, updateAlgerianSettings } from "@/actions/algerian-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { Moon, Truck, Calculator, Save, AlertTriangle, Key, Stamp, Receipt } from "lucide-react"

export function AlgerianSettingsForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        ramadanMode: false,
        commissionRate: 0,
        commissionMode: "CATEGORY",
        taxRegime: "G50",
        ifuRate: 5,
        tapRate: 2,
        stampTaxEnabled: true,
        posTimbreEnabled: false,
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
                commissionMode: data.commissionMode ?? "CATEGORY",
                taxRegime: data.taxRegime ?? "G50",
                ifuRate: data.ifuRate ?? 5,
                tapRate: data.tapRate ?? 2,
                stampTaxEnabled: data.stampTaxEnabled ?? true,
                posTimbreEnabled: data.posTimbreEnabled ?? false,
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
            ifuRate: Number(settings.ifuRate),
            tapRate: Number(settings.tapRate),
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

            {/* Commission Rate & Mode */}
            <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-bold">Commissions Vendeurs</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode de calcul principal</Label>
                        <Select value={settings.commissionMode} onValueChange={v => setSettings(s => ({ ...s, commissionMode: v }))}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Choisir le mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CATEGORY">Par Catégorie de Produit</SelectItem>
                                <SelectItem value="BRAND">Par Marque (Famille)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Détermine si les taux spécifiques sont appliqués par catégorie ou par marque</p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux de commission par défaut (%)</Label>
                        <div className="flex items-center gap-2">
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
                        <p className="text-xs text-muted-foreground">Taux de secours si aucun taux spécifique n'est défini pour le produit/catégorie/marque</p>
                    </div>
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

            {/* TAP Rate */}
            {settings.taxRegime === "G50" && (
                <div className="p-5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Receipt className="h-5 w-5 text-purple-600" />
                        <h3 className="font-bold">TAP — Taxe sur l'Activité Professionnelle</h3>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux TAP</Label>
                        <Select value={String(settings.tapRate)} onValueChange={v => setSettings(s => ({ ...s, tapRate: Number(v) }))}>
                            <SelectTrigger className="rounded-xl max-w-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1% — Production de biens</SelectItem>
                                <SelectItem value="2">2% — Commerce & Services (défaut)</SelectItem>
                                <SelectItem value="3">3% — Professions libérales</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Calculée sur le CA HT et déclarée mensuellement sur le G50</p>
                    </div>
                </div>
            )}

            {/* Stamp Tax / Timbre Settings */}
            <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Stamp className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold">Droit de Timbre (حقوق الطابع)</h3>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-sm">Timbre sur Factures & BL</p>
                        <p className="text-xs text-muted-foreground">Applique le timbre fiscal sur les factures et bons de livraison (paiements espèce)</p>
                    </div>
                    <Switch
                        checked={settings.stampTaxEnabled}
                        onCheckedChange={v => setSettings(s => ({ ...s, stampTaxEnabled: v }))}
                    />
                </div>

                <div className="flex items-center justify-between border-t border-amber-200 dark:border-amber-700 pt-4">
                    <div>
                        <p className="font-medium text-sm">Timbre sur Ventes POS (Caisse)</p>
                        <p className="text-xs text-muted-foreground">Applique le droit de timbre automatiquement sur les ventes POS en espèce</p>
                    </div>
                    <Switch
                        checked={settings.posTimbreEnabled}
                        onCheckedChange={v => setSettings(s => ({ ...s, posTimbreEnabled: v }))}
                    />
                </div>

                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                    <strong>Barème 2025 :</strong> 1 DA/100 DA (≤30k DA), 1,50 DA/100 DA (30k-100k DA), 2 DA/100 DA (&gt;100k DA). Min 5 DA, Max 10.000 DA. Exonéré pour paiements électroniques.
                </div>
            </div>

            {/* Retenue à la Source */}
            {settings.taxRegime === "G50" && (
                <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        <h3 className="font-bold">Retenue à la Source (حجز من المنبع)</h3>
                    </div>
                    
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        La retenue à la source est calculée automatiquement sur les bons d'achat selon le taux configuré par fournisseur. 
                        Le montant retenu est déclaré sur le G50 et versé à la DGI.
                    </p>

                    <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg space-y-1">
                        <strong>Barème Retenue à la Source :</strong>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                            <li><strong>10%</strong> — Achats de marchandises</li>
                            <li><strong>15%</strong> — Prestations de services (avec RC)</li>
                            <li><strong>24%</strong> — Prestations de services (sans RC)</li>
                            <li><strong>0%</strong> — Fournisseurs exonérés</li>
                        </ul>
                        <p className="mt-1.5 italic">Le taux est configuré par fournisseur dans la fiche fournisseur.</p>
                    </div>
                </div>
            )}

            {/* Credit Note Settings */}
            <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-5 w-5 text-red-600" />
                    <h3 className="font-bold">Avoirs (فاتورة الإلغاء)</h3>
                </div>
                
                <p className="text-xs text-red-700 dark:text-red-300">
                    Les avoirs (factures d'annulation) permettent d'annuler partiellement ou totalement une facture. 
                    Le stock est automatiquement remis et le solde client ajusté. Numérotation séquentielle : AV-{new Date().getFullYear()}/0001
                </p>

                <div className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                    <strong>Conformité :</strong> Les avoirs sont automatiquement pris en compte dans le calcul du G50 (réduction de la TVA collectée). 
                    Le stock est rétabli et le solde client diminué lors de la validation de l'avoir.
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
