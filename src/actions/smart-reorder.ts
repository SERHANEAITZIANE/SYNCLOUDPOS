"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { subDays, format } from "date-fns"

/**
 * Smart Reorder Point Calculator
 * 
 * Calculates optimal reorder points and order quantities based on:
 * - Average daily demand over last 90 days
 * - Demand variability (standard deviation)
 * - Lead time (configurable, defaults to 3 days)
 * - Service level target (95% = Z-score 1.65)
 * 
 * Formula:
 *   Reorder Point = (Avg Daily Demand × Lead Time) + Safety Stock
 *   Safety Stock = Z-score × StdDev(Daily Demand) × √Lead Time
 *   Order Quantity = Avg Daily Demand × 14 days (2 weeks supply)
 */

interface ReorderResult {
    productId: string
    productName: string
    currentStock: number
    currentMinStock: number
    suggestedMinStock: number
    suggestedOrderQty: number
    avgDailyDemand: number
    daysOfSupply: number
    confidence: "HIGH" | "MEDIUM" | "LOW"
}

/**
 * Calculate optimal reorder point for a single product.
 */
export async function calculateReorderPoint(
    tenantId: string,
    productId: string,
    leadTimeDays: number = 3
): Promise<ReorderResult | null> {
    // Get last 90 days of sales movements
    const fromDate = subDays(new Date(), 90)

    const movements = await db.stockMovement.findMany({
        where: {
            tenantId,
            productId,
            type: "SALE",
            createdAt: { gte: fromDate }
        },
        select: { quantity: true, createdAt: true, referenceId: true, reason: true }
    })

    // Fetch all cancelled sales orders to filter them out
    const cancelledSalesOrders = await db.salesOrder.findMany({
        where: { tenantId, status: "CANCELLED" },
        select: { id: true, receiptNumber: true, createdAt: true, total: true }
    })
    const cancelledIds = new Set<string>()
    const cancelledReceipts: string[] = []

    for (const so of cancelledSalesOrders) {
        cancelledIds.add(so.id)
        if (so.receiptNumber) {
            cancelledReceipts.push(so.receiptNumber)
            
            // Find linked POS order IDs by receipt number in treasury transaction
            const linkedTx = await db.treasuryTransaction.findFirst({
                where: { description: { contains: so.receiptNumber }, source: "SALE", tenantId },
                select: { referenceId: true }
            })
            if (linkedTx?.referenceId) {
                cancelledIds.add(linkedTx.referenceId)
            }

            // Also find linked POS orders by time window and total (fallback/robustness)
            const timeMin = new Date(so.createdAt.getTime() - 60000)
            const timeMax = new Date(so.createdAt.getTime() + 60000)
            const linkedOrders = await db.order.findMany({
                where: {
                    tenantId,
                    total: so.total,
                    createdAt: { gte: timeMin, lte: timeMax }
                },
                select: { id: true }
            })
            linkedOrders.forEach(o => cancelledIds.add(o.id))
        }
    }

    const filteredMovements = movements.filter(m => {
        if (m.referenceId && cancelledIds.has(m.referenceId)) return false
        if (m.reason) {
            const hasCancelledReceipt = cancelledReceipts.some(r => m.reason?.includes(r))
            if (hasCancelledReceipt) return false
        }
        return true
    })

    const product = await db.product.findUnique({
        where: { id: productId },
        include: {
            storeProducts: { take: 1 }
        }
    })

    if (!product) return null

    const currentStock = product.storeProducts[0]?.stock || product.stock || 0
    const currentMinStock = product.storeProducts[0]?.minStock || product.minStock || 0

    // Not enough data → low confidence estimation
    if (filteredMovements.length < 5) {
        return {
            productId,
            productName: product.name,
            currentStock,
            currentMinStock,
            suggestedMinStock: Math.max(currentMinStock, 5),
            suggestedOrderQty: 10,
            avgDailyDemand: 0,
            daysOfSupply: currentStock > 0 ? 999 : 0,
            confidence: "LOW"
        }
    }

    // Group sales by day
    const dailySales = new Map<string, number>()
    const days = 90

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
        const day = format(subDays(new Date(), i), "yyyy-MM-dd")
        dailySales.set(day, 0)
    }

    // Aggregate sales per day (movements have negative quantities for sales)
    filteredMovements.forEach(m => {
        const day = format(m.createdAt, "yyyy-MM-dd")
        const qty = Math.abs(m.quantity)
        dailySales.set(day, (dailySales.get(day) || 0) + qty)
    })

    const values = Array.from(dailySales.values())
    const totalSold = values.reduce((sum, v) => sum + v, 0)
    const avgDailyDemand = totalSold / days

    // Standard deviation of daily demand
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avgDailyDemand, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Safety Stock = Z × σ × √L
    // Z = 1.65 for 95% service level
    const safetyStock = Math.ceil(1.65 * stdDev * Math.sqrt(leadTimeDays))

    // Reorder Point = (d̄ × L) + SS
    const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock)

    // Economic Order Quantity (simplified: 2 weeks supply)
    const orderQty = Math.max(Math.ceil(avgDailyDemand * 14), 1)

    // Days of supply at current stock
    const daysOfSupply = avgDailyDemand > 0
        ? Math.round(currentStock / avgDailyDemand)
        : currentStock > 0 ? 999 : 0

    // Confidence based on data quality
    const confidence: "HIGH" | "MEDIUM" | "LOW" =
        filteredMovements.length > 30 ? "HIGH" :
            filteredMovements.length > 10 ? "MEDIUM" : "LOW"

    return {
        productId,
        productName: product.name,
        currentStock,
        currentMinStock,
        suggestedMinStock: Math.max(reorderPoint, 1),
        suggestedOrderQty: orderQty,
        avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
        daysOfSupply,
        confidence
    }
}

/**
 * Bulk calculate reorder points for all active products in a tenant.
 * Returns products where the suggested minStock differs significantly from current.
 */
export async function getReorderSuggestions(storeId?: string) {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }

    const tenantId = session.user.tenantId
    const targetStoreId = storeId || session.user.defaultStoreId

    // Get all active products with current stock
    const products = await db.product.findMany({
        where: { tenantId, isArchived: false },
        select: { id: true, name: true },
        take: 200 // Limit to prevent timeout
    })

    const results: ReorderResult[] = []

    // Process in batches of 10 for performance
    for (let i = 0; i < products.length; i += 10) {
        const batch = products.slice(i, i + 10)
        const batchResults = await Promise.all(
            batch.map(p => calculateReorderPoint(tenantId, p.id))
        )
        batchResults.forEach(r => {
            if (r) results.push(r)
        })
    }

    // Sort: products that need attention first (low days of supply)
    results.sort((a, b) => a.daysOfSupply - b.daysOfSupply)

    // Flag products where current minStock is wrong
    const needsUpdate = results.filter(r =>
        r.confidence !== "LOW" &&
        (r.suggestedMinStock > r.currentMinStock * 1.5 || // Under-stocked
            r.suggestedMinStock < r.currentMinStock * 0.5)   // Over-stocked
    )

    return {
        success: true,
        data: {
            all: results,
            needsUpdate,
            summary: {
                totalProducts: results.length,
                needsAttention: needsUpdate.length,
                outOfStock: results.filter(r => r.currentStock <= 0).length,
                lowStock: results.filter(r => r.daysOfSupply < 7 && r.daysOfSupply > 0).length,
                healthy: results.filter(r => r.daysOfSupply >= 7).length,
            }
        }
    }
}

/**
 * Apply suggested reorder points to products (batch update minStock).
 */
export async function applyReorderSuggestions(
    suggestions: { productId: string; minStock: number }[]
) {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Non autorisé" }

    const tenantId = session.user.tenantId
    const storeId = session.user.defaultStoreId

    if (!storeId) return { error: "Aucun magasin sélectionné" }

    let updated = 0

    for (const suggestion of suggestions) {
        try {
            await db.storeProduct.updateMany({
                where: {
                    storeId,
                    productId: suggestion.productId,
                    store: { tenantId }
                },
                data: { minStock: suggestion.minStock }
            })
            updated++
        } catch {
            // Skip individual failures
        }
    }

    return {
        success: true,
        data: { updated, total: suggestions.length }
    }
}
