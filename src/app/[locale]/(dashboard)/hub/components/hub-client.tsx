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
    Wallet
} from "lucide-react";
import { motion } from "framer-motion";

interface HubClientProps {
    metrics: {
        productsCount: number;
        salesCount: number;
    }
}

export const HubClient: React.FC<HubClientProps> = ({ metrics }) => {
    const t = useTranslations("Sidebar"); // Leverage existing translations if available or create new ones

    // Core Modules
    const modules = [
        {
            title: "Stock & Produits",
            description: "Gérer votre catalogue, les inventaires et les avaries.",
            icon: Package,
            href: "/products",
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            stats: `${metrics.productsCount} Produits`
        },
        {
            title: "Ventes & Caisse",
            description: "Point de vente, commandes clients et devis.",
            icon: ShoppingCart,
            href: "/orders",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            stats: `${metrics.salesCount} Ventes`
        },
        {
            title: "Achats & Fournisseurs",
            description: "Commandes fournisseurs, bons de réception et dépenses.",
            icon: Truck,
            href: "/purchases",
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
            stats: "Gestion B2B"
        },
        {
            title: "Trésorerie & Finances",
            description: "Suivi des caisses, banques et transactions.",
            icon: Wallet,
            href: "/treasury",
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
            borderColor: "border-violet-500/20",
            stats: "Comptabilité"
        },
        {
            title: "Rapports & Fiscalité",
            description: "Tableaux de bord, G50, G12 et statistiques.",
            icon: BarChart3,
            href: "/reports/general",
            color: "text-rose-500",
            bgColor: "bg-rose-500/10",
            borderColor: "border-rose-500/20",
            stats: "Analyses"
        },
        {
            title: "Paramètres & Admin",
            description: "Configuration boutique, utilisateurs et taxes.",
            icon: Settings,
            href: "/settings",
            color: "text-slate-500",
            bgColor: "bg-slate-500/10",
            borderColor: "border-slate-500/20",
            stats: "Système"
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {modules.map((mod) => (
                    <motion.div key={mod.title} variants={item}>
                        <Link
                            href={mod.href}
                            className={`flex flex-col p-6 rounded-2xl border ${mod.borderColor} bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-4 rounded-xl ${mod.bgColor} ${mod.color}`}>
                                    <mod.icon className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                    {mod.stats}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                {mod.title}
                            </h3>
                            <p className="text-muted-foreground text-sm flex-1">
                                {mod.description}
                            </p>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};
