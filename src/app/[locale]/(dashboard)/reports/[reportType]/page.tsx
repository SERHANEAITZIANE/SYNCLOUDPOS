import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Wrench } from "lucide-react";

export default async function ReportPlaceholderPage({
    params
}: {
    params: Promise<{ reportType: string }>
}) {
    const { reportType } = await params;

    const reportNames: Record<string, string> = {
        "sales": "Journal des Ventes",
        "inventory": "État du Stock & Inventaire",
        "customers": "Balance Clients",
        "purchases": "Rapport des Achats",
        "treasury": "Rapport de Trésorerie"
    };

    const title = reportNames[reportType] || "Rapport détaillé";

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title={title}
                        description="Analyse et statistiques"
                    />
                </div>
                <Separator />

                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-slate-50 dark:bg-slate-900 mt-8 rounded-xl border border-dashed">
                    <div className="p-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                        <Wrench className="w-16 h-16" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Module en cours de développement</h2>
                        <p className="text-muted-foreground max-w-lg mx-auto">
                            Le rapport complet pour <b>{title}</b> est actuellement en cours de finalisation par notre équipe technique.
                            Cette fonctionnalité sera disponible très prochainement dans une future mise à jour gratuite.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
