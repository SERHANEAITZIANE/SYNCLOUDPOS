import { getAllPromotions } from "@/actions/promotions"
import { getCategories } from "@/actions/categories"
import { getAllProducts } from "@/actions/products"
import { PromotionsClient } from "./components/client"

const PromotionsPage = async () => {
    const [promotions, categories, products] = await Promise.all([
        getAllPromotions(),
        getCategories(),
        getAllProducts()
    ])

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PromotionsClient
                    promotions={promotions.map(p => ({
                        ...p,
                        discountValue: Number(p.discountValue),
                        startsAt: p.startsAt?.toISOString() || null,
                        endsAt: p.endsAt?.toISOString() || null,
                        createdAt: p.createdAt.toISOString()
                    }))}
                    categories={categories.map(c => ({ id: c.id, name: c.name }))}
                    products={products.map(p => ({ id: p.id, name: p.name }))}
                />
            </div>
        </div>
    )
}

export default PromotionsPage
