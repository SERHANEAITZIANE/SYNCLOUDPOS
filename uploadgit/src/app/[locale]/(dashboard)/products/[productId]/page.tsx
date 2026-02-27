import { getProduct } from "@/actions/products"
import { getCategories } from "@/actions/categories"
import { getBrands } from "@/actions/brands"
import { ProductForm } from "@/components/products/product-form"

const ProductPage = async ({
    params
}: {
    params: Promise<{ productId: string }>
}) => {
    const { productId } = await params

    const isNew = productId === "new"

    // Parallel fetching
    // If new, we don't fetch product, but we still need categories and brands
    const categoriesPromise = getCategories()
    const brandsPromise = getBrands()
    const productPromise = isNew ? Promise.resolve(null) : getProduct(productId)

    const [categories, brands, product] = await Promise.all([
        categoriesPromise,
        brandsPromise,
        productPromise
    ])

    // Serialize Prisma objects (like Decimal) into plain JSON so Next.js Client Components can receive them
    const safeProduct = product ? JSON.parse(JSON.stringify(product)) : null;

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProductForm
                    categories={categories}
                    brands={brands}
                    initialData={safeProduct as any}
                />
            </div>
        </div>
    )
}

export default ProductPage
