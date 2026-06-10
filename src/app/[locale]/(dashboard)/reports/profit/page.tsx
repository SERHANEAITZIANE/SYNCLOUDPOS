import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfitReport } from "@/actions/profit-report"
import { ProfitReportClient } from "./components/profit-client"

export const metadata = {
    title: "Rapport de Rentabilité | SYNCLOUDPOS",
    description: "Analyse des marges bénéficiaires par produit, catégorie et marque"
}

export default async function ProfitReportPage({
    searchParams
}: {
    searchParams: Promise<{ from?: string; to?: string; clientType?: string }>
}) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    const { from, to, clientType } = await searchParams

    const data = await getProfitReport({
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        clientType: clientType || undefined
    })

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProfitReportClient data={data} />
            </div>
        </div>
    )
}
