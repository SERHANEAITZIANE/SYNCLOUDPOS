"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export interface ReorderSuggestion {
    productId: string
    productName: string
    sku: string | null
    currentStock: number
    minStock: number
    avgDailySales: number
    daysUntilStockout: number | null
    totalSoldLast30Days: number
    suggestedQty: number
    urgency: "critical" | "warning" | "low"
    categoryName: string | null
}

export async function getReorderSuggestions(lookbackDays = 30): Promise<ReorderSuggestion[]> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    const since = new Date()
    since.setDate(since.getDate() - lookbackDays)

    const products = await db.product.findMany({
        where: { tenantId, isArchived: false },
        include: {
            category: { select: { name: true } },
            orderItems: {
                where: { order: { createdAt: { gte: since }, status: "COMPLETED" } },
                select: { quantity: true }
            },
            salesItems: {
                where: { salesOrder: { createdAt: { gte: since }, status: { in: ["VALIDATED", "PAID", "DELIVERED"] } } },
                select: { quantity: true }
            },
            storeProducts: true
        }
    })

    const suggestions: ReorderSuggestion[] = []

    for (const p of products) {
        const stock = p.storeProducts.reduce((sum, sp) => sum + sp.stock, 0)
        const minStock = p.storeProducts.reduce((sum, sp) => sum + sp.minStock, 0)

        const totalPos = p.orderItems.reduce((s, i) => s + i.quantity, 0)
        const totalBl = p.salesItems.reduce((s, i) => s + i.quantity, 0)
        const totalSold = totalPos + totalBl
        const avgDailySales = totalSold / lookbackDays

        // Only suggest products that actually sell or are dangerously low
        if (avgDailySales < 0.01 && stock > minStock) continue

        const daysUntilStockout = avgDailySales > 0
            ? stock / avgDailySales
            : null

        // Determine urgency
        let urgency: ReorderSuggestion["urgency"] = "low"
        if (stock <= minStock) urgency = "critical"
        else if (daysUntilStockout !== null && daysUntilStockout <= 7) urgency = "warning"
        else if (daysUntilStockout !== null && daysUntilStockout <= 14) urgency = "low"
        else continue // more than 14 days runway — skip

        // Suggested reorder: 2 weeks of stock + safety buffer
        const targetStock = Math.max(avgDailySales * 30, minStock)
        const suggestedQty = Math.ceil(Math.max(targetStock - stock, minStock))

        suggestions.push({
            productId: p.id,
            productName: p.name,
            sku: null,
            currentStock: stock,
            minStock: minStock,
            avgDailySales: Math.round(avgDailySales * 100) / 100,
            daysUntilStockout: daysUntilStockout !== null ? Math.floor(daysUntilStockout) : null,
            totalSoldLast30Days: totalSold,
            suggestedQty,
            urgency,
            categoryName: p.category?.name ?? null
        })
    }

    // Sort: critical first, then warning, then low; within each group sort by daysUntilStockout
    return suggestions.sort((a, b) => {
        const order = { critical: 0, warning: 1, low: 2 }
        const diff = order[a.urgency] - order[b.urgency]
        if (diff !== 0) return diff
        const aD = a.daysUntilStockout ?? 999
        const bD = b.daysUntilStockout ?? 999
        return aD - bD
    })
}
