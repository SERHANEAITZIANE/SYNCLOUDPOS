import { getCategories } from "@/actions/categories"
import { getBrands } from "@/actions/brands"
import { ProductForm } from "@/components/products/product-form"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { db } from "@/lib/db"

export default async function NewProductPage() {
    const tenantId = await getActiveTenantId()
    const tenant = tenantId ? await db.tenant.findUnique({ where: { id: tenantId } }) : null
    const tvaEnabled = tenant?.tvaEnabled ?? false

    const categories = await getCategories()
    const brands = await getBrands()

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProductForm
                    categories={categories}
                    brands={brands}
                    initialData={null}
                    tvaEnabled={tvaEnabled}
                    tenantName={tenant?.name || ""}
                    tenantPhone={tenant?.phone || ""}
                />
            </div>
        </div>
    )
}
