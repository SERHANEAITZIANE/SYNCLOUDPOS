import { getCategories } from "@/actions/categories"
import { getBrands } from "@/actions/brands"
import { ProductForm } from "@/components/products/product-form"

export default async function NewProductPage() {
    const categories = await getCategories()
    const brands = await getBrands()

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ProductForm
                    categories={categories}
                    brands={brands}
                    initialData={null}
                />
            </div>
        </div>
    )
}
