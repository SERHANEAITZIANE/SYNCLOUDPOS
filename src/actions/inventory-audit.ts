"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/** Create a new stock count session and snapshot current product stock */
export async function createStockCountSession(name: string, notes?: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    // Snapshot all active products
    const products = await db.product.findMany({
        where: { tenantId, isArchived: false },
        include: { storeProducts: true }
    })

    try {
        const countSession = await db.stockCountSession.create({
            data: {
                tenantId,
                name,
                notes: notes || null,
                status: "OPEN",
                items: {
                    create: products.map(p => {
                        const stock = p.storeProducts.reduce((sum, sp) => sum + sp.stock, 0);
                        return {
                            productId: p.id,
                            productName: p.name,
                            expectedQty: stock,
                            actualQty: stock, // default = no discrepancy
                            difference: 0
                        };
                    })
                }
            },
            include: { items: true }
        })
        revalidatePath("/[locale]/(dashboard)/inventory-audit")
        return { data: countSession }
    } catch (e) {
        console.error("createStockCountSession error:", e)
        return { error: "Failed to create session." }
    }
}

/** Update actual count for one item */
export async function updateStockCountItem(itemId: string, actualQty: number) {
    const session = await auth()
    if (!session?.user?.tenantId) return { error: "Unauthorized" }

    const item = await db.stockCountItem.findUnique({ where: { id: itemId } })
    if (!item) return { error: "Item not found" }

    await db.stockCountItem.update({
        where: { id: itemId },
        data: {
            actualQty,
            difference: actualQty - item.expectedQty
        }
    })
    return { success: true }
}

/** Get all stock count sessions */
export async function getStockCountSessions() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    return db.stockCountSession.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { items: true } }
        }
    })
}

/** Get a single session with all items */
export async function getStockCountSession(id: string) {
    const authSession = await auth()
    const tenantId = authSession?.user?.tenantId
    if (!tenantId) return null

    return db.stockCountSession.findFirst({
        where: { id, tenantId },
        include: {
            items: {
                orderBy: { productName: "asc" }
            }
        }
    })
}

/** Approve session: apply all adjustments to product stock */
export async function approveStockCountSession(sessionId: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const countSession = await db.stockCountSession.findFirst({
        where: { id: sessionId, tenantId, status: "OPEN" },
        include: { items: true }
    })

    if (!countSession) return { error: "Session not found or already processed." }

    try {
        // Find a storeId to apply adjustments. Let's use the first store for simplicity.
        const store = await db.store.findFirst({ where: { tenantId } });
        if (!store) throw new Error("No store found to apply adjustments");

        // Apply each adjustment
        await db.$transaction([
            ...countSession.items
                .filter(i => i.difference !== 0)
                .map(i =>
                    db.storeProduct.updateMany({
                        where: { productId: i.productId, storeId: store.id },
                        data: { stock: { increment: i.difference } }
                    })
                ),
            db.stockCountSession.update({
                where: { id: sessionId },
                data: { status: "APPROVED", approvedAt: new Date() }
            })
        ])
        revalidatePath("/[locale]/(dashboard)/inventory-audit")
        revalidatePath("/[locale]/(dashboard)/products")
        return { success: "Inventaire approuvé. Stock mis à jour." }
    } catch (e) {
        console.error("approveStockCountSession error:", e)
        return { error: "Failed to approve session." }
    }
}

/** Cancel a session without applying changes */
export async function cancelStockCountSession(sessionId: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    await db.stockCountSession.updateMany({
        where: { id: sessionId, tenantId, status: "OPEN" },
        data: { status: "CANCELLED" }
    })
    revalidatePath("/[locale]/(dashboard)/inventory-audit")
    return { success: "Session annulée." }
}
