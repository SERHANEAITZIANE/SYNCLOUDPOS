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
                reason: true
            }
        })

        // Map movements by product for fast lookup
        const movementSummary = new Map<string, {
            entries: number
            exits: number
            returns: number
            supplierReturns: number
        }>()

        movements.forEach(m => {
            if (!movementSummary.has(m.productId)) {
                movementSummary.set(m.productId, { entries: 0, exits: 0, returns: 0, supplierReturns: 0 })
            }
            const summary = movementSummary.get(m.productId)!
            const isSupplierReturn = m.reason?.startsWith("Retour Fournisseur")

            if (isSupplierReturn) {
                summary.supplierReturns += Math.abs(m.quantity)
            } else if (m.type === "RETURN") {
                summary.returns += m.quantity
            } else if (m.quantity > 0) {
                summary.entries += m.quantity
            } else if (m.quantity < 0) {
                summary.exits += Math.abs(m.quantity)
            }
        })

        // Formulate the product stock records
        const stockItems = products.map(p => {
            const summary = movementSummary.get(p.id) || { entries: 0, exits: 0, returns: 0, supplierReturns: 0 }
            const activeReservations = p.reservations.reduce((sum, r) => sum + Number(r.quantity), 0)
            const avaries = p.spoilages.reduce((sum, s) => sum + s.quantity, 0)
            const stock = p.stock

            const cost = Number(p.cost || 0)
            const price = Number(p.price || 0)

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
                montantVente: stock * price
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

        const entries: any[] = []
        const exits: any[] = []

        movements.forEach(m => {
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
