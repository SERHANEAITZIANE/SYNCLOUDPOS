"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export const getStockMovements = async (productId: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const movements = await db.stockMovement.findMany({
            where: {
                productId,
                tenantId
            },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
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

        // Recalculate stockBefore and stockAfter dynamically to handle cancelled/deleted middle movements
        let recalculatedMovements = [...filteredMovements]
        if (recalculatedMovements.length > 0) {
            // Sort chronologically (oldest first) to build the running stock
            recalculatedMovements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

            let runningStock = recalculatedMovements[0].stockBefore
            recalculatedMovements = recalculatedMovements.map(m => {
                const stockBefore = runningStock
                const stockAfter = runningStock + m.quantity
                runningStock = stockAfter
                return {
                    ...m,
                    stockBefore,
                    stockAfter
                }
            })

            // Sort back to newest first for UI display
            recalculatedMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }

        return { movements: JSON.parse(JSON.stringify(recalculatedMovements)) }
    } catch (error) {
        console.error("Error fetching stock movements:", error)
        return { error: "Failed to fetch stock movements" }
    }
}
