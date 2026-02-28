import { getSpoilages } from "@/actions/spoilage"
import { getProducts } from "@/actions/products"
import { DataTable } from "@/components/avaries/data-table"
import { columns } from "@/components/avaries/columns"

export default async function AvariesPage() {
    const spoilages = await getSpoilages()
    const products = await getProducts()

    // Format data for the table
    const formattedSpoilages = spoilages.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        reason: item.reason,
        date: item.date,
        userName: item.user.name || "Inconnu",
    }))

    const formattedProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: Number(product.quantity),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Gestion des Avaries</h2>
                </div>
                <DataTable
                    columns={columns}
                    data={formattedSpoilages}
                    products={formattedProducts}
                />
            </div>
        </div>
    )
}
