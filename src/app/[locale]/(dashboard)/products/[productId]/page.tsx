import { getProduct } from "@/actions/products"
import { getCategories } from "@/actions/categories"
import { getBrands } from "@/actions/brands"
import { ProductForm } from "@/components/products/product-form"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { db } from "@/lib/db"

const ProductPage = async ({
    params
}: {
    params: Promise<{ productId: string }>
}) => {
    const { productId } = await params

    const isNew = productId === "new"

    const tenantId = await getActiveTenantId()
    const tenant = tenantId ? await db.tenant.findUnique({ where: { id: tenantId } }) : null
    const tvaEnabled = tenant?.tvaEnabled ?? false

    // Parallel fetching — exclude archived categories/brands from dropdowns
    const categoriesPromise = getCategories(false)
    const brandsPromise = getBrands(false)
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
                    tvaEnabled={tvaEnabled}
                    tenantName={tenant?.name || ""}
                    tenantPhone={tenant?.phone || ""}
                />
            </div>
        </div>
    )
}

export default ProductPage
