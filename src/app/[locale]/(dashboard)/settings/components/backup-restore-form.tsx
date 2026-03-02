"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { exportTenantData, getDataSummary } from "@/actions/backup"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Download, Upload, Database, Package, Users, Truck, Receipt, CreditCard, Wallet, AlertCircle } from "lucide-react"

interface Summary {
    products: number
    customers: number
    suppliers: number
    sales: number
    purchases: number
    expenses: number
}

export const BackupRestoreForm = () => {
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState<Summary | null>(null)

    useEffect(() => {
        getDataSummary().then(res => {
            if (res.success && res.summary) setSummary(res.summary as Summary)
        })
    }, [])

    const handleExport = async () => {
        try {
            setLoading(true)
            const result = await exportTenantData()
            if (result.error || !result.data) {
                toast.error(result.error || "Erreur export")
                return
            }
            // Download as JSON file
            const blob = new Blob([result.data], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `syncloudpos_backup_${new Date().toISOString().split("T")[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Sauvegarde téléchargée avec succès !")
        } catch {
            toast.error("Erreur lors de l'export.")
        } finally {
            setLoading(false)
        }
    }

    const statCards = summary ? [
        { label: "Produits", value: summary.products, icon: Package, color: "text-orange-500" },
        { label: "Clients", value: summary.customers, icon: Users, color: "text-blue-500" },
        { label: "Fournisseurs", value: summary.suppliers, icon: Truck, color: "text-red-500" },
        { label: "Ventes", value: summary.sales, icon: Receipt, color: "text-indigo-500" },
        { label: "Achats", value: summary.purchases, icon: CreditCard, color: "text-emerald-500" },
        { label: "Dépenses", value: summary.expenses, icon: Wallet, color: "text-amber-500" },
    ] : []

    return (
        <div className="space-y-8">
            {/* Summary */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-semibold">Résumé des Données</h3>
                </div>
                {summary ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {statCards.map(s => (
                            <div key={s.label} className="flex items-center gap-3 bg-muted/40 border rounded-xl p-4">
                                <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
                                <div>
                                    <p className="text-xl font-black">{s.value.toLocaleString("fr-FR")}</p>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
                )}
            </div>

            <Separator />

            {/* Export */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Download className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-base font-semibold">Exporter une Sauvegarde</h3>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 space-y-4">
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        Exportez toutes vos données (produits, clients, ventes, achats, trésorerie…) dans un fichier <strong>.json</strong>.
                        Ce fichier peut être utilisé pour restaurer vos données ou les transférer vers un autre serveur.
                    </p>
                    <Button onClick={handleExport} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? "Export en cours..." : "Télécharger la sauvegarde (.json)"}
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Restore */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Upload className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold">Restaurer une Sauvegarde</h3>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-3 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="text-sm leading-relaxed">
                            <strong>Attention :</strong> La restauration remplacera les données actuelles par celles du fichier de sauvegarde.
                            Faites une sauvegarde avant de restaurer. Cette fonctionnalité nécessite l&apos;accès administrateur serveur.
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Fichier de restauration (.json)</Label>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-900 border border-amber-300 rounded-lg px-4 py-2.5 text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 transition-colors">
                                <Upload className="w-4 h-4" />
                                Choisir un fichier
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            toast.error("La restauration complète nécessite un accès direct au serveur. Contactez votre administrateur système.")
                                        }
                                    }}
                                />
                            </label>
                            <p className="text-xs text-muted-foreground">Uniquement les fichiers .json exportés par cette application</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Preferences Backup */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <h3 className="text-base font-semibold">Sauvegarde des Préférences Locales</h3>
                </div>
                <div className="bg-muted/40 border rounded-xl p-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Exportez vos préférences locales (imprimantes, paramètres POS, modèle code-barre) pour les réimporter sur un autre poste.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const prefs = {
                                    printing: localStorage.getItem("pos_printing_prefs"),
                                    posDefaults: localStorage.getItem("pos_defaults_prefs"),
                                }
                                const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement("a")
                                a.href = url
                                a.download = `syncloudpos_prefs_${new Date().toISOString().split("T")[0]}.json`
                                a.click()
                                URL.revokeObjectURL(url)
                                toast.success("Préférences exportées !")
                            }}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exporter préférences
                        </Button>
                        <label className="cursor-pointer">
                            <Button variant="outline" size="sm" type="button" asChild>
                                <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Importer préférences
                                </span>
                            </Button>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    const reader = new FileReader()
                                    reader.onload = (ev) => {
                                        try {
                                            const prefs = JSON.parse(ev.target?.result as string)
                                            if (prefs.printing) localStorage.setItem("pos_printing_prefs", prefs.printing)
                                            if (prefs.posDefaults) localStorage.setItem("pos_defaults_prefs", prefs.posDefaults)
                                            toast.success("Préférences importées ! Rechargez la page.")
                                        } catch {
                                            toast.error("Fichier invalide.")
                                        }
                                    }
                                    reader.readAsText(file)
                                }}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
