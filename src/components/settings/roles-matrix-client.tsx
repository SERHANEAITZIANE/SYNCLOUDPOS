"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import toast from "react-hot-toast"
import { 
    saveRolePermissions, 
    resetRolePermissions, 
    exportRolePermissionsConfig, 
    importRolePermissionsConfig, 
    TenantRolePermissionsMap
} from "@/actions/roles"
// Type-only: erased at compile time, so importing from a "use server" module is safe.
import type { Module, Action, Permission } from "@/lib/rbac"
import { 
    ShieldCheck, 
    Download, 
    Upload, 
    RotateCcw, 
    Save, 
    Loader2, 
    CheckSquare, 
    Square, 
    Search,
    SlidersHorizontal,
    Sparkles,
    Check,
    X
} from "lucide-react"

// All 30 system modules defined in SYNCLOUDPOS RBAC
// Keys are typed as Module/Action so that `${module}:${action}` narrows to
// Permission instead of widening to `${string}:${string}`.
const ALL_MODULE_CONFIGS: { key: Module; label: string; desc: string; category: string }[] = [
    { key: "pos", label: "Point de Vente (POS)", desc: "Caisse tactile, scannage rapide et tickets de caisse", category: "Ventes & Caisse" },
    { key: "sales", label: "Ventes & Factures", desc: "Consultation, bons de livraison et facturation B2B", category: "Ventes & Caisse" },
    { key: "daily_close", label: "Clôtures de Caisse", desc: "Z de caisse journalier et écarts de caisse", category: "Ventes & Caisse" },
    { key: "reservations", label: "Réservations & Acomptes", desc: "Commandes réservées avec acompte client", category: "Ventes & Caisse" },
    { key: "commissions", label: "Commissions Vendeurs", desc: "Calcul et règlement des commissions sur ventes", category: "Ventes & Caisse" },

    { key: "products", label: "Catalogue Produits & Services", desc: "Articles, prix de vente (Détail/Gros/Revendeur) et tarifs", category: "Produits & Stock" },
    { key: "categories", label: "Catégories de Produits", desc: "Arborescence et familles de produits", category: "Produits & Stock" },
    { key: "brands", label: "Marques & Fabricants", desc: "Gestion des marques associées aux articles", category: "Produits & Stock" },
    { key: "inventory", label: "Stock & Inventaire", desc: "Audit de stock, valorisation PUMP et réapprovisionnement", category: "Produits & Stock" },
    { key: "transfers", label: "Transferts de Stock", desc: "Mouvements de stock inter-magasins / dépôts", category: "Produits & Stock" },
    { key: "spoilage", label: "Avaries & Casses", desc: "Déclaration des pertes et produits détériorés", category: "Produits & Stock" },

    { key: "purchases", label: "Achats & Bons de Commande", desc: "Commandes fournisseurs et réception de stock", category: "Achats & Fournisseurs" },
    { key: "suppliers", label: "Fournisseurs & Retenues", desc: "Fiches fournisseurs, NIF/NIS et retenue à la source", category: "Achats & Fournisseurs" },
    { key: "emprunt_fournisseur", label: "Dettes Fournisseurs", desc: "Suivi des engagements et crédits fournisseurs", category: "Achats & Fournisseurs" },

    { key: "treasury", label: "Trésorerie & Comptes", desc: "Comptes bancaires, caisses physiques et solde", category: "Finances & Comptabilité" },
    { key: "payments", label: "Règlements & Paiements", desc: "Encaissements clients et décaissements", category: "Finances & Comptabilité" },
    { key: "expenses", label: "Dépenses & Charges", desc: "Saisie des frais généraux et catégories de dépenses", category: "Finances & Comptabilité" },
    { key: "cheques", label: "Portefeuille de Chèques", desc: "Chèques clients et fournisseurs à encaisser", category: "Finances & Comptabilité" },
    { key: "recurring_invoices", label: "Factures Récurrentes", desc: "Abonnements et facturation périodique", category: "Finances & Comptabilité" },
    { key: "emprunt", label: "Crédits Clients (Dettes)", desc: "Gestion des créances et rappels de paiement", category: "Finances & Comptabilité" },

    { key: "customers", label: "Fiches Clients & Fidélité", desc: "Coordonnées clients, tarifs spéciaux et points de fidélité", category: "Relations Clients & Services" },
    { key: "promotions", label: "Promotions & Campagnes", desc: "Remises temporaires et règles promotionnelles", category: "Relations Clients & Services" },
    { key: "delivery", label: "Logistique & Livraisons", desc: "Camions, tournées de livraison et livreurs", category: "Relations Clients & Services" },

    { key: "reports", label: "Rapports & Bilan Financier", desc: "Revenus, marge brute, journaux de ventes et rentabilité", category: "Rapports & Analyse" },
    { key: "analytics", label: "Statistiques Avancées", desc: "Tableaux de bord analytiques et graphiques", category: "Rapports & Analyse" },
    { key: "fiscal", label: "Fiscalité Algérienne (G50 / G12)", desc: "Rapports de TVA, IFU, TAP et timbre fiscal", category: "Rapports & Analyse" },

    { key: "users", label: "Gestion de l'Équipe", desc: "Création et modification des comptes collaborateurs", category: "Administration & Système" },
    { key: "settings", label: "Paramètres du Système", desc: "Configuration magasin, tickets, taxes et intégrations", category: "Administration & Système" },
    { key: "audit_log", label: "Journal d'Audit & Traces", desc: "Historique des actions utilisateurs et traçabilité", category: "Administration & Système" },
    { key: "ai", label: "Assistant IA & Analytics", desc: "Prévisions d'achat intelligentes et génération OCR", category: "Administration & Système" },
]

const ACTION_CONFIGS: { key: Action; label: string; desc: string }[] = [
    { key: "read", label: "Lecture", desc: "Consulter & Afficher" },
    { key: "create", label: "Création", desc: "Ajouter de nouveaux éléments" },
    { key: "update", label: "Modification", desc: "Editer les fiches existantes" },
    { key: "delete", label: "Suppression", desc: "Supprimer définitivement" },
    { key: "export", label: "Exportation", desc: "Télécharger en Excel / PDF / JSON" }
]

const ROLES_LIST = [
    { key: "MANAGER", label: "Gérant", desc: "Gestion globale de l'établissement", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300" },
    { key: "PURCHASE_MANAGER", label: "Gestionnaire Achat", desc: "Supervision des approvisionnements & fournisseurs", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" },
    { key: "SALES_MANAGER", label: "Gestionnaire Vente", desc: "Supervision des ventes, POS & livreurs", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
    { key: "CASHIER", label: "Caissier", desc: "Encaissement au POS et clôture", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
    { key: "VENDEUR", label: "Vendeur", desc: "Vente directe et suivi des commissions", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300" },
    { key: "ACCOUNTANT", label: "Comptable", desc: "Suivi financier, fiscalité G50/G12 et rapports", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300" },
    { key: "STOCK_MANAGER", label: "Magasinier", desc: "Entrées/sorties de stock et inventaire", color: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300" }
]

const DEFAULT_ROLE_PERMISSIONS_FALLBACK: Record<string, Permission[]> = {
    MANAGER: [
        "pos:*", "sales:*", "purchases:*", "expenses:*", "products:read", "products:create", "products:update", "products:export",
        "categories:*", "brands:*", "promotions:*", "customers:*", "suppliers:*", "treasury:read", "treasury:create", "treasury:export",
        "analytics:read", "analytics:export", "reports:read", "reports:export", "delivery:*", "commissions:*", "reservations:*",
        "inventory:*", "recurring_invoices:*", "payments:*", "spoilage:*", "transfers:*", "cheques:*", "daily_close:*", "emprunt:*", "emprunt_fournisseur:*"
    ],
    CASHIER: ["pos:read", "pos:create", "sales:read", "sales:create", "products:read", "customers:read", "customers:create", "payments:read", "payments:create", "daily_close:read", "daily_close:create"],
    VENDEUR: ["pos:read", "pos:create", "sales:read", "sales:create", "products:read", "customers:read", "customers:create", "payments:read", "payments:create", "daily_close:read", "daily_close:create", "commissions:read"],
    ACCOUNTANT: ["sales:read", "sales:export", "purchases:read", "purchases:export", "expenses:read", "expenses:create", "expenses:update", "expenses:export", "customers:read", "suppliers:read", "treasury:read", "treasury:create", "treasury:export", "analytics:read", "reports:read", "reports:export", "fiscal:*", "payments:read", "payments:create", "cheques:*", "emprunt:read", "emprunt_fournisseur:read"],
    STOCK_MANAGER: ["purchases:read", "purchases:create", "purchases:update", "products:read", "products:create", "products:update", "categories:read", "brands:read", "suppliers:read", "inventory:*", "spoilage:*", "transfers:*"],
    PURCHASE_MANAGER: ["purchases:*", "products:read", "products:create", "products:update", "categories:*", "brands:*", "suppliers:*", "inventory:*", "transfers:*", "spoilage:*", "emprunt_fournisseur:*"],
    SALES_MANAGER: ["pos:*", "sales:*", "products:read", "customers:*", "payments:*", "delivery:*", "commissions:*", "cheques:*", "daily_close:*", "reservations:*"]
}

export function RolesMatrixClient({ initialPermissions }: { initialPermissions: TenantRolePermissionsMap }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeRole, setActiveRole] = useState<string>("MANAGER")
    const [searchQuery, setSearchQuery] = useState<string>("")
    
    // State of permissions map per role
    const [permissionsMap, setPermissionsMap] = useState<TenantRolePermissionsMap>(() => {
        const merged: TenantRolePermissionsMap = {}
        ROLES_LIST.forEach(r => {
            merged[r.key] = initialPermissions[r.key] || DEFAULT_ROLE_PERMISSIONS_FALLBACK[r.key] || []
        })
        return merged
    })

    const currentPermissions = permissionsMap[activeRole] || []

    const filteredModules = useMemo(() => {
        if (!searchQuery.trim()) return ALL_MODULE_CONFIGS
        const q = searchQuery.toLowerCase()
        return ALL_MODULE_CONFIGS.filter(m => 
            m.label.toLowerCase().includes(q) || 
            m.key.toLowerCase().includes(q) || 
            m.desc.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q)
        )
    }, [searchQuery])

    const hasPerm = (module: Module, action: Action) => {
        if (currentPermissions.includes("*:*")) return true
        if (currentPermissions.includes(`${module}:*`)) return true
        return currentPermissions.includes(`${module}:${action}`)
    }

    const togglePermission = (module: Module, action: Action) => {
        const target: Permission = `${module}:${action}`
        let next: Permission[] = []

        if (hasPerm(module, action)) {
            next = currentPermissions.filter(p => p !== "*:*" && p !== `${module}:*` && p !== target)
            if (currentPermissions.includes(`${module}:*`)) {
                ACTION_CONFIGS.forEach(a => {
                    if (a.key !== action) next.push(`${module}:${a.key}`)
                })
            }
        } else {
            next = [...currentPermissions, target]
        }

        setPermissionsMap(prev => ({
            ...prev,
            [activeRole]: Array.from(new Set(next))
        }))
    }

    const toggleColumnAction = (action: Action) => {
        const allChecked = filteredModules.every(m => hasPerm(m.key, action))
        let next = [...currentPermissions]

        filteredModules.forEach(m => {
            const target: Permission = `${m.key}:${action}`
            if (allChecked) {
                next = next.filter(p => p !== "*:*" && p !== `${m.key}:*` && p !== target)
            } else {
                next.push(target)
            }
        })

        setPermissionsMap(prev => ({
            ...prev,
            [activeRole]: Array.from(new Set(next))
        }))
    }

    const toggleRowModule = (module: Module) => {
        const allActionsChecked = ACTION_CONFIGS.every(a => hasPerm(module, a.key))
        const next = currentPermissions.filter(p => p !== "*:*" && p !== `${module}:*` && !p.startsWith(`${module}:`))

        if (!allActionsChecked) {
            next.push(`${module}:*`)
        }

        setPermissionsMap(prev => ({
            ...prev,
            [activeRole]: Array.from(new Set(next))
        }))
    }

    const selectAllForRole = () => {
        const all: Permission[] = []
        ALL_MODULE_CONFIGS.forEach(m => {
            all.push(`${m.key}:*`)
        })
        setPermissionsMap(prev => ({ ...prev, [activeRole]: all }))
    }

    const unselectAllForRole = () => {
        setPermissionsMap(prev => ({ ...prev, [activeRole]: [] }))
    }

    const handleResetRole = async () => {
        startTransition(async () => {
            const defaults = DEFAULT_ROLE_PERMISSIONS_FALLBACK[activeRole] || []
            setPermissionsMap(prev => ({ ...prev, [activeRole]: defaults }))
            const res = await resetRolePermissions(activeRole)
            if (res.success) {
                toast.success(`Le rôle ${activeRole} a été réinitialisé aux valeurs par défaut`)
                router.refresh()
            } else {
                toast.error(res.error || "Erreur lors de la réinitialisation")
            }
        })
    }

    const handleSaveRole = async () => {
        startTransition(async () => {
            const rolePerms = permissionsMap[activeRole] || []
            const res = await saveRolePermissions(activeRole, rolePerms as any)
            if (res.success) {
                toast.success(`Permissions du rôle ${activeRole} enregistrées !`)
                router.refresh()
            } else {
                toast.error(res.error || "Erreur d'enregistrement")
            }
        })
    }

    const handleExport = async () => {
        startTransition(async () => {
            const res = await exportRolePermissionsConfig()
            if (res.success && res.jsonString) {
                const blob = new Blob([res.jsonString], { type: "application/json" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `syncloudpos-roles-config-${new Date().toISOString().slice(0, 10)}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success("Configuration des rôles exportée en JSON !")
            } else {
                toast.error(res.error || "Erreur d'exportation")
            }
        })
    }

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const content = event.target?.result as string
            if (!content) return

            startTransition(async () => {
                const res = await importRolePermissionsConfig(content)
                if (res.success) {
                    toast.success("Configuration des rôles importée avec succès !")
                    router.refresh()
                } else {
                    toast.error(res.error || "Fichier JSON invalide")
                }
            })
        }
        reader.readAsText(file)
    }

    const activeRoleInfo = ROLES_LIST.find(r => r.key === activeRole)

    return (
        <div className="w-full space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black tracking-tight">Matrice Intégrale des Permissions</h3>
                            <Badge className="bg-indigo-500 text-white font-bold text-[10px]">30 Modules Système</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Personnalisez minutieusement chaque droit d'accès pour chaque rôle de votre entreprise.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100 text-xs font-bold gap-2 h-9">
                        <Download className="h-4 w-4 text-emerald-400" />
                        <span>Exporter JSON</span>
                    </Button>

                    <label className="cursor-pointer">
                        <input type="file" accept=".json" onChange={handleImportFile} className="hidden" disabled={isPending} />
                        <div className="inline-flex items-center justify-center h-9 px-3 text-xs font-bold transition-colors border rounded-md border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 gap-2">
                            <Upload className="h-4 w-4 text-indigo-400" />
                            <span>Importer JSON</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Role Selection Tabs (Full width) */}
            <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full space-y-4">
                <TabsList className="flex flex-wrap w-full h-auto p-1.5 bg-slate-100 dark:bg-slate-900/80 gap-1.5 rounded-2xl border">
                    {ROLES_LIST.map(r => (
                        <TabsTrigger 
                            key={r.key} 
                            value={r.key}
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md transition-all"
                        >
                            <span>{r.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {ROLES_LIST.map(r => (
                    <TabsContent key={r.key} value={r.key} className="space-y-4 pt-2">
                        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md">
                            {/* Role Header & Actions */}
                            <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b bg-slate-50/80 dark:bg-slate-900/40">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <CardTitle className="text-xl font-black">{r.label}</CardTitle>
                                        <Badge className={r.color}>{r.key}</Badge>
                                    </div>
                                    <CardDescription className="text-xs mt-1 font-medium text-slate-500">
                                        {r.desc} — cochez les modules et actions autorisés.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative min-w-[200px]">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Filtrer un module..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-9 text-xs bg-white dark:bg-slate-950"
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={selectAllForRole} className="text-xs font-bold gap-1.5 h-9">
                                        <CheckSquare className="h-4 w-4 text-emerald-600" /> Tout cocher
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={unselectAllForRole} className="text-xs font-bold gap-1.5 h-9">
                                        <Square className="h-4 w-4 text-slate-400" /> Tout décocher
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleResetRole} disabled={isPending} className="text-xs font-bold gap-1.5 h-9 text-amber-600 dark:text-amber-400">
                                        <RotateCcw className="h-4 w-4" /> Réinitialiser
                                    </Button>
                                </div>
                            </CardHeader>

                            {/* Full Page Matrix Table */}
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b shadow-sm">
                                        <tr className="text-slate-700 dark:text-slate-200">
                                            <th className="p-4 font-black text-sm min-w-[280px]">
                                                Module & Description ({filteredModules.length})
                                            </th>
                                            {ACTION_CONFIGS.map(act => {
                                                const allColumnChecked = filteredModules.length > 0 && filteredModules.every(m => hasPerm(m.key, act.key))
                                                return (
                                                    <th key={act.key} className="p-4 font-bold text-center w-36">
                                                        <div 
                                                            onClick={() => toggleColumnAction(act.key)}
                                                            className="flex flex-col items-center justify-center cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors group"
                                                            title={`Cliquer pour cocher/décocher ${act.label} sur tous les modules`}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-extrabold text-xs">{act.label}</span>
                                                                <Checkbox 
                                                                    checked={allColumnChecked} 
                                                                    onCheckedChange={() => toggleColumnAction(act.key)} 
                                                                    className="h-3.5 w-3.5"
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-normal mt-0.5">{act.desc}</span>
                                                        </div>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {filteredModules.map(mod => {
                                            const allRowChecked = ACTION_CONFIGS.every(a => hasPerm(mod.key, a.key))
                                            return (
                                                <tr key={mod.key} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex items-start gap-2.5">
                                                            <Checkbox 
                                                                checked={allRowChecked} 
                                                                onCheckedChange={() => toggleRowModule(mod.key)} 
                                                                className="mt-1 h-4 w-4 rounded"
                                                                title="Cocher/décocher toutes les actions de ce module"
                                                            />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-sm text-slate-900 dark:text-slate-100">{mod.label}</span>
                                                                    <Badge variant="outline" className="text-[9px] font-mono text-slate-500 border-slate-300">
                                                                        {mod.category}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">{mod.desc}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {ACTION_CONFIGS.map(act => {
                                                        const checked = hasPerm(mod.key, act.key)
                                                        return (
                                                            <td key={act.key} className="p-4 text-center">
                                                                <div className="flex items-center justify-center">
                                                                    <Checkbox 
                                                                        checked={checked} 
                                                                        onCheckedChange={() => togglePermission(mod.key, act.key)}
                                                                        className="h-5 w-5 rounded-md border-slate-300 dark:border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                                    />
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}

                                        {filteredModules.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                    Aucun module correspondant à votre recherche.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* Sticky Footer Save Action */}
                        <div className="sticky bottom-4 z-20 flex justify-end pt-2">
                            <Button 
                                onClick={handleSaveRole} 
                                disabled={isPending} 
                                size="lg" 
                                className="gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-6 h-12 shadow-2xl rounded-xl border border-indigo-400/40"
                            >
                                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                Enregistrer la matrice de permissions ({r.label})
                            </Button>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
