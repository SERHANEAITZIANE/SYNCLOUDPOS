"use client"

import { useTranslations } from "next-intl"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Package, FileText, Wallet } from "lucide-react"
import { useRouter } from "@/i18n/routing"

export const ReportsClient = () => {
    const t = useTranslations("Reports")
    const router = useRouter()

    const reports = [
        {
            title: "Journal des Ventes",
            description: "Analyse détaillée des ventes, devis et factures par période.",
            icon: TrendingUp,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            href: "/reports/sales"
        },
        {
            title: "État du Stock & Inventaire",
            description: "Valorisation du stock, produits en rupture et mouvements.",
            icon: Package,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            href: "/reports/inventory"
        },
        {
            title: "Balance Clients",
            description: "État des créances clients et historique des paiements.",
            icon: Users,
            color: "text-indigo-500",
            bgColor: "bg-indigo-500/10",
            href: "/reports/customers"
        },
        {
            title: "Rapport des Achats",
            description: "Détail des achats fournisseurs et évolution des coûts.",
            icon: FileText,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            href: "/reports/purchases"
        },
        {
            title: "Rapport de Trésorerie",
            description: "Flux de trésorerie, mouvements de caisse et banque.",
            icon: Wallet,
            color: "text-rose-500",
            bgColor: "bg-rose-500/10",
            href: "/reports/treasury"
        },
        {
            title: "Performance Globale",
            description: "Tableau de bord de rentabilité et indicateurs clés.",
            icon: BarChart3,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
            href: "/analytics" // Links to the existing analytics page
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title={t("title")}
                    description={t("subtitle")}
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <Card
                        key={report.title}
                        className="hover:shadow-lg transition-all cursor-pointer group border-gray-200 dark:border-gray-800"
                        onClick={() => router.push(report.href)}
                    >
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className={`p-3 rounded-xl ${report.bgColor}`}>
                                <report.icon className={`h-6 w-6 ${report.color}`} />
                            </div>
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                {report.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-sm">
                                {report.description}
                            </CardDescription>
                            <div className="mt-4 flex items-center text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                Voir le rapport &rarr;
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
