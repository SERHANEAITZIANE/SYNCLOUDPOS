import { format } from "date-fns"
import { CategoryClient } from "@/components/categories/client"
import { CategoryColumn } from "@/components/categories/columns"
import { getCategories } from "@/actions/categories"

const CategoriesPage = async () => {
    const categories = await getCategories()

    const formattedCategories: CategoryColumn[] = categories.map((item) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        isArchived: item.isArchived,
        commissionWholesale: item.commissionWholesale,
        commissionReseller: item.commissionReseller,
        commissionRetail: item.commissionRetail,
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CategoryClient data={formattedCategories} />
            </div>
        </div>
    )
}

export default CategoriesPage
