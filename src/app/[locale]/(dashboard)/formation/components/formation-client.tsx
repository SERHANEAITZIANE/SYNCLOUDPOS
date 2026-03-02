"use client"

import { useState } from "react"
import {
    BookOpen, Monitor, ShoppingCart, Package, Users, Truck, Wallet, BarChart3,
    Sparkles, Receipt, FileText, Zap, ArrowRight, CheckCircle, Shield, Database
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─────── Reusable sub-components ───────────────────────────────

const FeatureCard = ({ icon: Icon, title, text, iconColor = "text-gray-700" }: {
    icon: React.FC<any>; title: string; text: string; iconColor?: string
}) => (
    <div className="group flex gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all duration-200 hover:border-gray-200">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 group-hover:scale-110 transition-transform", iconColor)}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{text}</p>
        </div>
    </div>
)

const Step = ({ n, title, text, bgColor = "#dbeafe", textColor = "#1d4ed8" }: {
    n: number; title: string; text: string; bgColor?: string; textColor?: string
}) => (
    <div className="flex gap-4">
        <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-black shrink-0 text-sm"
            style={{ backgroundColor: bgColor, color: textColor }}
        >{n}</div>
        <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{text}</p>
        </div>
    </div>
)

const SectionHeader = ({ icon: Icon, title, subtitle, color }: {
    icon: React.FC<any>; title: string; subtitle: string; color: string
}) => (
    <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: color }}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
        </div>
    </div>
)

const PlaceholderImg = ({ label }: { label: string }) => (
    <div className="w-full h-48 md:h-56 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-sm font-medium text-gray-400 bg-gray-50">
        📸 {label}
    </div>
)

// ─────── Tab definitions ─────────────────────────────────────────
const tabs = [
    { value: "dashboard", label: "Tableau de Bord", icon: Monitor, color: "#2563eb" },
    { value: "pos", label: "Caisse POS", icon: ShoppingCart, color: "#059669" },
    { value: "stocks", label: "Catalogue", icon: Package, color: "#ea580c" },
    { value: "sales", label: "Ventes (BL)", icon: Receipt, color: "#4338ca" },
    { value: "purchases", label: "Achats", icon: Truck, color: "#dc2626" },
    { value: "treasury", label: "Trésorerie", icon: Wallet, color: "#0891b2" },
    { value: "contacts", label: "Contacts", icon: Users, color: "#7c3aed" },
    { value: "analytics", label: "Analyses", icon: BarChart3, color: "#334155" },
    { value: "ai", label: "IA", icon: Sparkles, color: "#6d28d9" },
]

// ─────── Main Component ──────────────────────────────────────────
export const FormationClient = () => {
    const [activeTab, setActiveTab] = useState("dashboard")

    return (
        <div className="min-h-screen pb-16" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>

            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-8 md:p-12 mb-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #3b82f6 0%, transparent 60%)' }} />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
                        <BookOpen className="w-4 h-4" />
                        Guide de Formation
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">
                        SynCloud<span className="text-blue-400">POS</span> ERP
                    </h1>
                    <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
                        Découvrez toutes les fonctionnalités de votre logiciel de gestion. Ce guide couvre chaque module avec des exemples pratiques.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-6">
                        {["Caisse POS", "Stocks", "BL / Factures", "Trésorerie", "IA Chat"].map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 text-sm bg-white/10 border border-white/15 rounded-full px-3 py-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Layout: Sidebar + Content */}
            <div className="flex flex-col md:flex-row gap-6">

                {/* ── Sidebar nav (plain buttons, inline style for active color) ── */}
                <div className="md:w-56 shrink-0 md:sticky md:top-24 md:h-min">
                    <nav className="flex flex-row md:flex-col bg-white border border-gray-100 rounded-2xl p-2 shadow-sm gap-1 overflow-x-auto md:overflow-visible w-full">
                        {tabs.map(t => {
                            const isActive = activeTab === t.value
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setActiveTab(t.value)}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-xl text-sm font-semibold px-3 py-2.5 transition-all whitespace-nowrap w-full text-left shrink-0",
                                        isActive ? "text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                                    )}
                                    style={isActive ? { backgroundColor: t.color } : {}}
                                >
                                    <t.icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{t.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* ── Content panels ── */}
                <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">

                    {/* DASHBOARD */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Monitor} title="Tableau de Bord" subtitle="L'aperçu global de votre commerce en temps réel." color="#2563eb" />
                            <PlaceholderImg label="Tableau de Bord principal" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FeatureCard icon={BarChart3} title="Chiffres Clés" iconColor="text-blue-500"
                                    text="CA journalier/mensuel, nombre de ventes, marge brute — tout visible d'un coup d'œil." />
                                <FeatureCard icon={Package} title="Alertes Stock" iconColor="text-orange-500"
                                    text="Produits sous le seuil d'alerte listés pour passer commande sans délai." />
                                <FeatureCard icon={Users} title="Clients Endettés" iconColor="text-red-500"
                                    text="Récapitulatif des clients avec balance négative pour faciliter le recouvrement." />
                                <FeatureCard icon={Zap} title="Raccourcis Rapides" iconColor="text-amber-500"
                                    text="Accès direct au POS, création de commande ou saisie de dépense depuis le tableau." />
                            </div>
                        </div>
                    )}

                    {/* POS */}
                    {activeTab === "pos" && (
                        <div className="space-y-8">
                            <SectionHeader icon={ShoppingCart} title="Caisse (POS)" subtitle="Réalisez vos ventes de détail rapidement. Optimisé pour écrans tactiles et douchettes." color="#059669" />
                            <PlaceholderImg label="Interface POS en action" />
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Les 3 étapes d&apos;une vente</h3>
                                <div className="space-y-5">
                                    <Step n={1} title="Ajouter les produits" bgColor="#d1fae5" textColor="#065f46"
                                        text="Scannez le code-barre, recherchez par nom, ou cliquez sur les catégories. Ajustez prix, quantité ou remise. Quantité négative = retour marchandise." />
                                    <Step n={2} title="Valider le paiement [F9]" bgColor="#d1fae5" textColor="#065f46"
                                        text="Cliquez Paiement ou appuyez F9. Choisissez le mode (Espèces, Virement, Chèque, Terme). La monnaie à rendre est calculée automatiquement." />
                                    <Step n={3} title="Imprimer le ticket" bgColor="#d1fae5" textColor="#065f46"
                                        text="Un reçu thermique avec code-barre scannable est généré. Le ticket peut être re-scanné pour modifier la vente." />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FeatureCard icon={Users} title="Multi-Sessions" iconColor="text-emerald-600"
                                    text="Gérez plusieurs caisses simultanément (onglets). Passez d'un client à l'autre sans perdre le panier." />
                                <FeatureCard icon={Shield} title="Mode Grossiste" iconColor="text-blue-600"
                                    text="Prix automatiquement ajusté (détail, gros, revendeur) selon le type du client sélectionné." />
                                <FeatureCard icon={Receipt} title="Ticket Scannable" iconColor="text-purple-600"
                                    text="Le code-barre du reçu peut être re-scanné pour recharger la commande et la modifier." />
                            </div>
                        </div>
                    )}

                    {/* STOCKS */}
                    {activeTab === "stocks" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Package} title="Catalogue & Stocks" subtitle="Gérez vos produits, codes-barres, tarifs et faites imprimer des étiquettes." color="#ea580c" />
                            <PlaceholderImg label="Liste des Produits" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FeatureCard icon={Database} title="Fiche Produit Complète" iconColor="text-orange-600"
                                    text="Prix d'achat · Prix détail · Prix gros · Prix revendeur · TVA · Stock · Seuil d'alerte · Code-barres." />
                                <FeatureCard icon={FileText} title="Catalogue PDF / WhatsApp" iconColor="text-orange-500"
                                    text="Exportez votre liste de prix filtrée par catégorie et type de client (Grossiste, Revendeur)." />
                                <FeatureCard icon={Sparkles} title="Étiquettes Code-barre" iconColor="text-amber-500"
                                    text="Sélectionnez un modèle d'étiquette (classique, moderne, élégant…) et imprimez en masse." />
                                <FeatureCard icon={Zap} title="6 Modèles d'Étiquettes" iconColor="text-red-500"
                                    text="Configurez dans Paramètres > Impression le modèle préféré, appliqué à chaque impression." />
                            </div>
                        </div>
                    )}

                    {/* VENTES */}
                    {activeTab === "sales" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Receipt} title="Ventes (Bons de Livraison)" subtitle="Pour les commandes B2B nécessitant des factures A4 officielles et un suivi crédit." color="#4338ca" />
                            <PlaceholderImg label="Liste des Bons de Livraison" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FeatureCard icon={FileText} title="BL (Bon de Livraison)" iconColor="text-indigo-600"
                                    text="Document A4 officiel. Diminue le stock. Si montant payé < total, la différence va dans le crédit du client." />
                                <FeatureCard icon={ArrowRight} title="Facture Proforma / Devis" iconColor="text-indigo-400"
                                    text="Pré-vente client. N'affecte PAS le stock. Convertible en BL définitif après confirmation." />
                                <FeatureCard icon={Shield} title="Timbre Fiscal" iconColor="text-indigo-700"
                                    text="Le Droit de Timbre est calculé automatiquement sur les factures payées en espèces." />
                                <FeatureCard icon={Users} title="Suivi Crédit Client" iconColor="text-purple-600"
                                    text="Chaque vente à crédit crée ou augmente la dette du client. Consultable dans la fiche client." />
                            </div>
                        </div>
                    )}

                    {/* ACHATS */}
                    {activeTab === "purchases" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Truck} title="Achats & Dépenses" subtitle="Gérez vos entrées de stock, commandes fournisseurs et charges courantes." color="#dc2626" />
                            <PlaceholderImg label="Bons d'Achats Fournisseurs" />
                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <Sparkles className="w-6 h-6" />
                                    <h3 className="text-lg font-bold">OCR IA — Saisie Automatique</h3>
                                </div>
                                <p className="text-white/90 mb-4 leading-relaxed">
                                    Photographiez votre bon fournisseur papier. L&apos;IA détecte le fournisseur, liste les produits, remplit les quantités et prix en quelques secondes.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {["Fournisseur auto-détecté", "Produits listés", "Prix remplis", "Stock mis à jour"].map(f => (
                                        <span key={f} className="bg-white/15 border border-white/20 rounded-full text-xs px-3 py-1 flex items-center gap-1.5">
                                            <CheckCircle className="w-3 h-3 text-emerald-300" /> {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FeatureCard icon={Package} title="Entrée de Stock" iconColor="text-red-600"
                                    text="Chaque bon d'achat validé incrémente automatiquement le stock des produits concernés." />
                                <FeatureCard icon={Wallet} title="Dépenses (Charges)" iconColor="text-red-400"
                                    text="Loyer, électricité, salaires… Créez des catégories pour analyser vos charges en détail." />
                            </div>
                        </div>
                    )}

                    {/* TRÉSORERIE */}
                    {activeTab === "treasury" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Wallet} title="Trésorerie & Comptes" subtitle="Le centre névralgique de tous vos liquidités, caisses et comptes bancaires." color="#0891b2" />
                            <PlaceholderImg label="Gestion des Comptes de Trésorerie" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FeatureCard icon={Wallet} title="Multi-Comptes" iconColor="text-cyan-600"
                                    text="Caisse principale, Banque CPA, CCP, etc. Chaque mouvement est rattaché à un compte précis." />
                                <FeatureCard icon={ArrowRight} title="Virements Internes" iconColor="text-cyan-500"
                                    text="Transférez des fonds entre vos comptes (ex: caisse → banque) avec traçabilité complète." />
                                <FeatureCard icon={BarChart3} title="Historique" iconColor="text-cyan-700"
                                    text="Consultez tout l'historique des mouvements de chaque compte avec soldes avant/après." />
                            </div>
                        </div>
                    )}

                    {/* CONTACTS */}
                    {activeTab === "contacts" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Users} title="Clients & Fournisseurs" subtitle="Gérez votre répertoire et le suivi des dettes et recouvrements." color="#7c3aed" />
                            <PlaceholderImg label="Fiche Client avec Balance" />
                            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6">
                                <h3 className="font-bold text-purple-900 text-lg mb-5 flex items-center gap-2">
                                    <Shield className="w-5 h-5" /> Comment fonctionnent les Balances (Dettes) ?
                                </h3>
                                <div className="space-y-5">
                                    <Step n={1} title="Génération de la dette" bgColor="#ede9fe" textColor="#5b21b6"
                                        text="Vente à crédit ou paiement partiel → la balance du client devient négative (il vous doit de l'argent)." />
                                    <Step n={2} title="Recouvrement client" bgColor="#ede9fe" textColor="#5b21b6"
                                        text="Le client revient payer → Clients > Remboursement Client. Vous encaissez. La balance remonte vers zéro." />
                                    <Step n={3} title="Dettes Fournisseur" bgColor="#ede9fe" textColor="#5b21b6"
                                        text="Même principe. Balance fournisseur négative = vous lui devez de l'argent." />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS */}
                    {activeTab === "analytics" && (
                        <div className="space-y-8">
                            <SectionHeader icon={BarChart3} title="Rapports & Analyses" subtitle="Les mathématiques de votre commerce, en temps réel." color="#334155" />
                            <PlaceholderImg label="Page Analyses et Rapports" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FeatureCard icon={Package} title="Valeur du Stock" iconColor="text-slate-600"
                                    text="Capitaux immobilisés dans vos rayons (basé sur prix d'achat)." />
                                <FeatureCard icon={ArrowRight} title="Bénéfice Brut" iconColor="text-emerald-600"
                                    text="Ventes Totales − Coût des marchandises vendues = Marge commerciale." />
                                <FeatureCard icon={Zap} title="Bénéfice Net" iconColor="text-amber-500"
                                    text="Bénéfice Brut − Dépenses (loyer, factures…) = votre vrai gain." />
                                <FeatureCard icon={BarChart3} title="Top Produits & Clients" iconColor="text-blue-600"
                                    text="Visualisez les produits et clients qui génèrent le plus de CA." />
                            </div>
                        </div>
                    )}

                    {/* IA */}
                    {activeTab === "ai" && (
                        <div className="space-y-8">
                            <SectionHeader icon={Sparkles} title="Intelligence Artificielle" subtitle="Posez des questions sur vos finances à une IA qui connaît toutes vos données." color="#6d28d9" />
                            <PlaceholderImg label="Chat IA intégré" />
                            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-6">
                                <h3 className="font-bold text-violet-900 text-lg mb-4">Ce que l&apos;IA sait faire pour vous</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        "Lister les produits en rupture de stock",
                                        "Calculer votre bénéfice net du mois",
                                        "Identifier les clients qui vous doivent de l'argent",
                                        "Comparer vos dépenses vs vos revenus",
                                        "Recommander quels produits commander",
                                        "Analyser votre top 10 des ventes",
                                    ].map(item => (
                                        <div key={item} className="flex items-center gap-2 text-sm text-violet-800">
                                            <CheckCircle className="w-4 h-4 text-violet-500 shrink-0" /> {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FeatureCard icon={Sparkles} title="Modèles au Choix" iconColor="text-violet-600"
                                    text="Google Gemini, OpenAI GPT, Claude, Kimi. Entrez votre propre clé API, elle reste dans votre navigateur." />
                                <FeatureCard icon={Shield} title="Données Privées" iconColor="text-violet-400"
                                    text="Vos clés API ne sont jamais envoyées au serveur. Elles restent sauvegardées localement sur votre appareil." />
                            </div>
                        </div>
                    )}

                </div>{/* end content area */}
            </div>{/* end layout */}
        </div>
    )
}
