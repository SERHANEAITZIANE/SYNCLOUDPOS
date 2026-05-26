import { getCatalogData } from "@/actions/catalog"
import { CatalogClient } from "./components/catalog-client"

export const metadata = {
    title: "Catalogue de Vente | SYNCLOUDPOS",
    description: "Catalogue de vente interactif et mobile-friendly pour les commerciaux."
}

export default async function CatalogPage() {
    const data = await getCatalogData()

    if ("error" in data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#0d0d12] rounded-2xl border border-white/5 shadow-2xl">
                <h2 className="text-xl font-bold text-red-500 mb-2">Erreur de chargement</h2>
                <p className="text-white/60">{data.error}</p>
            </div>
        )
    }

    return (
        <CatalogClient initialBrands={data.brands} initialProducts={data.products} />
    )
}
