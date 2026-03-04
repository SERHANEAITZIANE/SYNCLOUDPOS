import { format } from "date-fns"
import { getLowStockProducts } from "@/actions/products"
import { LowStockClient } from "@/components/products/low-stock-client"
import { ProductColumn } from "@/components/products/columns"

export default async function LowStockPage() {
    const products = await getLowStockProducts()

    const formattedProducts: ProductColumn[] = (products as any[]).map((item) => {
        const stock = item.storeProducts?.reduce((sum: number, sp: any) => sum + sp.stock, 0) || 0;
        const minStock = item.storeProducts?.reduce((sum: number, sp: any) => sum + sp.minStock, 0) || 0;
        return {
            id: item.id,
            name: item.name,
            isFeatured: item.isFeatured || false,
            isArchived: item.isArchived || false,
            price: Number(item.price || 0).toFixed(2),
            wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice).toFixed(2) : "0.00",
            dealerPrice: item.dealerPrice ? Number(item.dealerPrice).toFixed(2) : "0.00",
            category: item.category?.name || "N/A",
            brand: item.brand?.name || "N/A",
            stock,
            minStock,
            images: item.images || [],
            createdAt: item.createdAt ? format(new Date(item.createdAt), "MMMM do, yyyy") : "",
        };
    })

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <LowStockClient data={formattedProducts} />
            </div>
        </div>
    )
}
