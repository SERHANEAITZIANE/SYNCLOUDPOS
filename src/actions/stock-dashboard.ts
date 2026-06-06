"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getStockDashboardData() {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Non autorisé" }
    }
    const tenantId = session.user.tenantId

    try {
        // Fetch all active products
        const products = await db.product.findMany({
            where: { tenantId, isArchived: false },
            include: {
                category: { select: { id: true, name: true } },
                brand: { select: { id: true, name: true } },
                barcodes: { select: { value: true } },
                spoilages: {
                    select: { quantity: true }
                },
                reservations: {
                    where: { status: "PENDING" },
                    select: { quantity: true }
                }
            },
            orderBy: { name: "asc" }
        })

        // Fetch all stock movements to aggregate
        const movements = await db.stockMovement.findMany({
            where: { tenantId },
            select: {
                productId: true,
                type: true,
                quantity: true,
                reason: true,
                referenceId: true,
                createdAt: true,
                stockBefore: true
            }
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

        // Map product last sale date for fast lookup
        const lastSaleMap = new Map<string, Date>()
        filteredMovements.forEach(m => {
            if (m.type === "SALE") {
                const currentMax = lastSaleMap.get(m.productId)
                if (!currentMax || m.createdAt.getTime() > currentMax.getTime()) {
                    lastSaleMap.set(m.productId, m.createdAt)
                }
            }
        })

        // Map movements by product for fast lookup
        const movementSummary = new Map<string, {
            entries: number
            exits: number
            returns: number
            supplierReturns: number
        }>()

        filteredMovements.forEach(m => {
            if (!movementSummary.has(m.productId)) {
                movementSummary.set(m.productId, { entries: 0, exits: 0, returns: 0, supplierReturns: 0 })
            }
            const summary = movementSummary.get(m.productId)!
            const isSupplierReturn = m.reason?.startsWith("Retour Fournisseur")

            if (isSupplierReturn) {
                summary.supplierReturns += Math.abs(m.quantity)
            } else if (m.type === "RETURN") {
                summary.returns += m.quantity
            } else if (m.type === "TRANSFER_OUT") {
                summary.exits += Math.abs(m.quantity)
            } else if (m.type === "TRANSFER_IN") {
                summary.entries += m.quantity
            } else if (m.type === "SPOILAGE") {
                summary.exits += Math.abs(m.quantity)
            } else if (m.quantity > 0) {
                summary.entries += m.quantity
            } else if (m.quantity < 0) {
                summary.exits += Math.abs(m.quantity)
            }
        })

        // Formulate the product stock records
        const now = new Date()
        const stockItems = products.map(p => {
            const summary = movementSummary.get(p.id) || { entries: 0, exits: 0, returns: 0, supplierReturns: 0 }
            const activeReservations = p.reservations.reduce((sum, r) => sum + Number(r.quantity), 0)
            const avaries = p.spoilages.reduce((sum, s) => sum + s.quantity, 0)
            
            // Use the actual product stock — it's the source of truth,
            // kept in sync by atomic increments/decrements in every operation.
            const stock = p.stock

            const cost = Number(p.cost || 0)
            const price = Number(p.price || 0)

            const lastSaleDate = lastSaleMap.get(p.id) || null
            let daysSinceLastSale: number | null = null
            if (lastSaleDate) {
                const diffTime = Math.abs(now.getTime() - lastSaleDate.getTime())
                daysSinceLastSale = Math.floor(diffTime / (1000 * 60 * 60 * 24))
            }

            return {
                id: p.id,
                name: p.name,
                barcodes: p.barcodes.map(b => b.value),
                categoryName: p.category?.name || "Sans catégorie",
                brandName: p.brand?.name || "Sans marque",
                stock,
                minStock: p.minStock || 0,
                entries: summary.entries,
                exits: summary.exits,
                returns: summary.returns,
                supplierReturns: summary.supplierReturns,
                reservations: activeReservations,
                avaries,
                cost,
                price,
                montantAchat: stock * cost,
                montantVente: stock * price,
                lastSaleDate: lastSaleDate ? lastSaleDate.toISOString() : null,
                daysSinceLastSale
            }
        })

        // High level KPI metrics
        let totalStockCount = 0
        let totalCostValuation = 0
        let totalSalesValuation = 0
        let totalReservations = 0
        let totalAvaries = 0

        stockItems.forEach(item => {
            totalStockCount += item.stock
            totalCostValuation += item.montantAchat
            totalSalesValuation += item.montantVente
            totalReservations += item.reservations
            totalAvaries += item.avaries
        })

        return {
            items: JSON.parse(JSON.stringify(stockItems)),
            kpi: {
                totalStockCount,
                totalCostValuation,
                totalSalesValuation,
                totalReservations,
                totalAvaries
            }
        }
    } catch (error) {
        console.error("getStockDashboardData error:", error)
        return { error: "Erreur lors du calcul des données de stock" }
    }
}

export async function getStockEntriesAndExitsLogs() {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Non autorisé", entries: [], exits: [] }
    }
    const tenantId = session.user.tenantId

    try {
        const movements = await db.stockMovement.findMany({
            where: { tenantId },
            include: {
                product: {
                    select: { name: true, cost: true, price: true }
                },
                user: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: "desc" }
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

        // Recalculate stockBefore and stockAfter dynamically per product to handle cancelled/deleted middle movements
        const movementsByProduct = new Map<string, typeof filteredMovements>()
        filteredMovements.forEach(m => {
            if (!movementsByProduct.has(m.productId)) {
                movementsByProduct.set(m.productId, [])
            }
            movementsByProduct.get(m.productId)!.push(m)
        })

        const recalculatedMovements: typeof filteredMovements = []
        movementsByProduct.forEach((productMovements) => {
            // Sort oldest first
            productMovements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

            let runningStock = productMovements[0].stockBefore
            const processed = productMovements.map(m => {
                const stockBefore = runningStock
                const stockAfter = runningStock + m.quantity
                runningStock = stockAfter
                return {
                    ...m,
                    stockBefore,
                    stockAfter
                }
            })
            recalculatedMovements.push(...processed)
        })

        // Sort back to newest first
        recalculatedMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        const entries: any[] = []
        const exits: any[] = []

        recalculatedMovements.forEach(m => {
            if (!m.product) return

            const mapped = {
                id: m.id,
                productId: m.productId,
                productName: m.product.name,
                type: m.type,
                quantity: Math.abs(m.quantity),
                stockBefore: m.stockBefore,
                stockAfter: m.stockAfter,
                reason: m.reason || "",
                userName: m.user?.name || "Système",
                createdAt: m.createdAt
            }

            const isSupplierReturn = m.reason?.startsWith("Retour Fournisseur")

            if (isSupplierReturn) {
                exits.push({ ...mapped, type: "SUPPLIER_RETURN" })
            } else if (m.type === "RETURN") {
                entries.push({ ...mapped, type: "CUSTOMER_RETURN" })
            } else if (m.type === "TRANSFER_OUT") {
                exits.push({ ...mapped, type: "TRANSFER_OUT" })
            } else if (m.type === "TRANSFER_IN") {
                entries.push({ ...mapped, type: "TRANSFER_IN" })
            } else if (m.type === "SPOILAGE") {
                exits.push({ ...mapped, type: "SPOILAGE" })
            } else if (m.quantity > 0) {
                entries.push(mapped)
            } else {
                exits.push(mapped)
            }
        })

        return {
            entries: JSON.parse(JSON.stringify(entries)),
            exits: JSON.parse(JSON.stringify(exits))
        }
    } catch (error) {
        console.error("getStockEntriesAndExitsLogs error:", error)
        return { error: "Erreur lors du chargement des historiques", entries: [], exits: [] }
    }
}
