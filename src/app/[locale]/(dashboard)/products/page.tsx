import { format } from "date-fns"
import { getProducts } from "@/actions/products"
import { ProductClient } from "@/components/products/client"
import { ProductColumn } from "@/components/products/columns"

const ProductsPage = async ({
    searchParams
}: {
    searchParams: Promise<{ page?: string, name?: string }>
}) => {
    const params = await searchParams
    const page = Number(params.page) || 1
    const pageSize = 20
    const search = params.name || ""

    // Explicitly destructure items and totalCount from the updated action
    const { items: products, totalCount } = await getProducts(page, pageSize, search) as { items: any[], totalCount: number }

    const formattedProducts: ProductColumn[] = (products || []).map((item) => ({
        id: item.id,
        name: item.name,
        isFeatured: item.isFeatured || false,
        isArchived: item.isArchived || false,
        price: Number(item.price || 0).toFixed(2),
        wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice).toFixed(2) : "0.00",
        dealerPrice: item.dealerPrice ? Number(item.dealerPrice).toFixed(2) : "0.00",
        category: item.category?.name || "Uncategorized",
        brand: item.brand?.name || "N/A", // Handle optional brand
        stock: item.stock || 0,
        minStock: item.minStock || 0,
        createdAt: item.createdAt ? format(new Date(item.createdAt), "MMMM do, yyyy") : "",
    }))

    const pageCount = Math.ceil(totalCount / pageSize)

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProductClient
                    data={formattedProducts}
                    totalCount={totalCount}
                    pageCount={pageCount}
                    currentPage={page}
                />
            </div>
        </div>
    )
}

export default ProductsPage
