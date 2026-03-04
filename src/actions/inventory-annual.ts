"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

/** Annual inventory valuation report — all products with stock × cost/price */
export async function getInventoryAnnualReport(year: number) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    // Get all active products with their categories
    const products = await db.product.findMany({
        where: { tenantId, isArchived: false },
        include: {
            category: { select: { name: true } },
            storeProducts: { select: { stock: true, storeId: true, store: { select: { name: true } } } },
        },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }]
    })

    const rows = products.map(p => {
        const stock = p.storeProducts.reduce((s, sp) => s + sp.stock, 0)
        const costPrice = Number(p.cost ?? p.price) * 0.7  // fallback estimate if no cost
        const salePrice = Number(p.price)
        const costValue = stock * (p.cost ? Number(p.cost) : costPrice)
        const retailValue = stock * salePrice

        return {
            id: p.id,
            name: p.name,
            category: p.category?.name || "Sans catégorie",
            stock,
            costPrice: p.cost ? Number(p.cost) : null,
            salePrice,
            costValue,
            retailValue,
            storeBreakdown: p.storeProducts.map(sp => ({
                storeName: sp.store.name,
                stock: sp.stock
            }))
        }
    })

    // Group by category
    const byCategory = new Map<string, typeof rows>()
    for (const row of rows) {
        const cat = row.category
        const existing = byCategory.get(cat) ?? []
        byCategory.set(cat, [...existing, row])
    }

    const totalCostValue = rows.reduce((s, r) => s + r.costValue, 0)
    const totalRetailValue = rows.reduce((s, r) => s + r.retailValue, 0)
    const totalProducts = rows.length
    const totalUnits = rows.reduce((s, r) => s + r.stock, 0)

    return {
        year,
        rows,
        byCategory: Object.fromEntries(byCategory),
        totalCostValue,
        totalRetailValue,
        totalProducts,
        totalUnits
    }
}
