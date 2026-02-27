import { format } from "date-fns"
import { getLowStockProducts } from "@/actions/products"
import { LowStockClient } from "@/components/products/low-stock-client"
import { ProductColumn } from "@/components/products/columns"

export default async function LowStockPage() {
    const products = await getLowStockProducts()

    const formattedProducts: ProductColumn[] = (products as any[]).map((item) => ({
        id: item.id,
        name: item.name,
        isFeatured: item.isFeatured,
        isArchived: item.isArchived,
        price: Number(item.price).toFixed(2),
        wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice).toFixed(2) : "0.00",
        dealerPrice: item.dealerPrice ? Number(item.dealerPrice).toFixed(2) : "0.00",
        category: item.category?.name || "N/A",
        brand: item.brand?.name || "N/A",
        stock: item.stock,
        minStock: item.minStock,
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <LowStockClient data={formattedProducts} />
            </div>
        </div>
    )
}
