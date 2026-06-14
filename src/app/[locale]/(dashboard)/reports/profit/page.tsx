import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getProfitReport } from "@/actions/profit-report"
import { ProfitReportClient } from "./components/profit-client"

export const metadata = {
    title: "Rapport de Rentabilité | SYNCLOUDPOS",
    description: "Analyse des marges bénéficiaires par produit, catégorie et marque"
}

interface PageProps {
    searchParams: Promise<{
        from?: string
        to?: string
        clientType?: string
        categoryId?: string
        brandId?: string
        saleNumber?: string
    }>
}

export default async function ProfitReportPage({ searchParams }: PageProps) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ACCOUNTANT" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    const { from, to, clientType, categoryId, brandId, saleNumber } = await searchParams
    const tenantId = session.user.tenantId

    const data = await getProfitReport({
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        clientType: clientType || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        saleNumber: saleNumber || undefined
    })

    const [categories, brands] = await Promise.all([
        db.category.findMany({
            where: { tenantId, isArchived: false },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        }),
        db.brand.findMany({
            where: { tenantId, isArchived: false },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        })
    ])

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProfitReportClient
                    data={data}
                    categories={categories}
                    brands={brands}
                />
            </div>
        </div>
    )
}
