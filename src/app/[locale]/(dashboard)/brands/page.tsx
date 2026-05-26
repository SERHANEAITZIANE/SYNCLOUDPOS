import { format } from "date-fns"
import { BrandClient } from "@/components/brands/client"
import { BrandColumn } from "@/components/brands/columns"
import { getBrands } from "@/actions/brands"

const BrandsPage = async () => {
    const brands = await getBrands()

    const formattedBrands: BrandColumn[] = brands.map((item) => ({
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
                <BrandClient data={formattedBrands} />
            </div>
        </div>
    )
}

export default BrandsPage
