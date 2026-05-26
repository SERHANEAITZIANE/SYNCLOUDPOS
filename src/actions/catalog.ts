"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getCatalogData() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    try {
        // Fetch all active brands under this tenant having at least one in-stock product
        const brands = await db.brand.findMany({
            where: {
                tenantId,
                isArchived: false,
                products: {
                    some: {
                        tenantId,
                        stock: { gt: 0 },
                        isArchived: false
                    }
                }
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                products: {
                    where: {
                        tenantId,
                        stock: { gt: 0 },
                        isArchived: false
                    },
                    select: {
                        id: true
                    }
                }
            },
            orderBy: { name: "asc" }
        })

        // Map brands to include the dynamic in-stock count
        const formattedBrands = brands.map(b => ({
            id: b.id,
            name: b.name,
            imageUrl: b.imageUrl,
            productCount: b.products.length
        }))

        // Fetch all active products in stock under this tenant
        const products = await db.product.findMany({
            where: {
                tenantId,
                stock: { gt: 0 },
                isArchived: false
            },
            include: {
                images: true,
                brand: true,
                category: true
            },
            orderBy: { name: "asc" }
        })

        return {
            brands: formattedBrands,
            products: JSON.parse(JSON.stringify(products))
        }
    } catch (error) {
        console.error("[GET_CATALOG_DATA_ERROR]", error)
        return { error: "Failed to fetch catalog data" }
    }
}
