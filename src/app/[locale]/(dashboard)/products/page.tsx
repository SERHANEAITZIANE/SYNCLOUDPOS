import { format } from "date-fns"
import { getProducts } from "@/actions/products"
import { ProductClient } from "@/components/products/client"
import { ProductColumn } from "@/components/products/columns"

const ProductsPage = async () => {
    const products = await getProducts()

    const formattedProducts: ProductColumn[] = (products as any[]).map((item) => ({
        id: item.id,
        name: item.name,
        isFeatured: item.isFeatured,
        isArchived: item.isArchived,
        price: Number(item.price).toFixed(2),
        wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice).toFixed(2) : "0.00",
        dealerPrice: item.dealerPrice ? Number(item.dealerPrice).toFixed(2) : "0.00",
        category: item.category.name,
        brand: item.brand?.name || "N/A", // Handle optional brand
        stock: item.stock,
        minStock: item.minStock,
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProductClient data={formattedProducts} />
            </div>
        </div>
    )
}

export default ProductsPage
