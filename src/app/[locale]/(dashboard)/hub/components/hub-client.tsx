"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    Package,
    ShoppingCart,
    Users,
    CreditCard,
    BarChart3,
    Settings,
    Activity,
    Tags,
    Truck,
    Wallet,
    Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

interface HubClientProps {
    metrics: {
        productsCount: number;
        salesCount: number;
    }
}

export const HubClient: React.FC<HubClientProps> = ({ metrics }) => {
    const t = useTranslations("Sidebar");

    const modules = [
        {
            title: "Stock & Produits",
            description: "Gérer votre catalogue, les inventaires et les avaries.",
            icon: Package,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            stats: `${metrics.productsCount} Produits`,
            links: [
                { label: "Produits", href: "/products" },
                { label: "Catégories", href: "/categories" },
                { label: "Avaries", href: "/avaries" },
                { label: "État du Stock", href: "/reports/inventory" }
            ]
        },
        {
            title: "Ventes & Caisse",
            description: "Point de vente, commandes clients et devis.",
            icon: ShoppingCart,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            stats: `${metrics.salesCount} Ventes`,
            links: [
                { label: "Point de Vente (POS)", href: "/pos" },
                { label: "Toutes les Ventes", href: "/sales" },
                { label: "Clients", href: "/customers" },
                { label: "Clôture de Caisse", href: "/cloture" }
            ]
        },
        {
            title: "Achats & Dépenses",
            description: "Commandes fournisseurs, bons de réception et dépenses.",
            icon: Truck,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
            stats: "Gestion B2B",
            links: [
                { label: "Achats", href: "/purchases" },
                { label: "Dépenses", href: "/expenses" },
                { label: "Fournisseurs", href: "/suppliers" },
                { label: "Réapprovisionnement", href: "/reorder" }
            ]
        },
        {
            title: "Trésorerie & Finances",
            description: "Suivi des caisses, banques et transactions.",
            icon: Wallet,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
            borderColor: "border-violet-500/20",
            stats: "Comptabilité",
            links: [
                { label: "Vue d'ensemble", href: "/treasury" },
                { label: "Paiements", href: "/payments" },
                { label: "Emprunts Clients", href: "/emprunt" },
                { label: "Emprunts Fournisseurs", href: "/emprunt-fournisseur" }
            ]
        },
        {
            title: "Rapports & Fiscalité",
            description: "Tableaux de bord, G50, G12 et statistiques.",
            icon: BarChart3,
            color: "text-rose-500",
            bgColor: "bg-rose-500/10",
            borderColor: "border-rose-500/20",
            stats: "Analyses",
            links: [
                { label: "Rapports Généraux", href: "/reports" },
                { label: "Analyses", href: "/analytics" },
                { label: "Déclaration G50 / G12", href: "/fiscal" },
                { label: "Inventaire Annuel", href: "/inventaire-annuel" }
            ]
        },
        {
            title: "Paramètres & Admin",
            description: "Configuration boutique, utilisateurs et taxes.",
            icon: Settings,
            color: "text-slate-500",
            bgColor: "bg-slate-500/10",
            borderColor: "border-slate-500/20",
            stats: "Système",
            links: [
                { label: "Paramètres", href: "/settings" },
                { label: "Mon Entreprise", href: "/company" },
                { label: "Utilisateurs", href: "/users" }
            ]
        },
        {
            title: "Intelligence IA",
            description: "Assistant virtuel, analyse prédictive et outils intelligents.",
            icon: Sparkles,
            color: "text-teal-500",
            bgColor: "bg-teal-500/10",
            borderColor: "border-teal-500/20",
            stats: "Assistant",
            links: [
                { label: "Assistant IA", href: "/ai" },
            ]
        }
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Bienvenue sur SYNCLOUDPOS
                </h1>
                <p className="text-muted-foreground text-lg">
                    Sélectionnez un module pour commencer à travailler.
                </p>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
                {modules.map((mod) => (
                    <motion.div key={mod.title} variants={item}>
                        <div className={`flex flex-col h-full p-6 rounded-2xl border ${mod.borderColor} bg-card shadow-sm hover:shadow-md transition-all duration-300`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-4 rounded-xl ${mod.bgColor} ${mod.color}`}>
                                    <mod.icon className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                    {mod.stats}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-2">
                                {mod.title}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-6 flex-1">
                                {mod.description}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
                                {mod.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-sm px-3 py-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors break-words"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};
