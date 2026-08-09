"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import cacheMonitor from "@/lib/cache-monitor"

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
                        const storeStockSum = p.storeProducts.reduce((sum, sp) => sum + sp.stock, 0);
                        // If storeProducts exist use storeStockSum, otherwise use main product stock
                        const stock = p.storeProducts.length > 0 ? storeStockSum : p.stock;
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
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const item = await db.stockCountItem.findFirst({ 
        where: { id: itemId, session: { tenantId } } 
    })
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

/** Get a single session with all items enriched with Category, Brand and Barcodes */
export async function getStockCountSession(id: string) {
    const authSession = await auth()
    const tenantId = authSession?.user?.tenantId
    if (!tenantId) return null

    const sessionData = await db.stockCountSession.findFirst({
        where: { id, tenantId },
        include: {
            items: {
                orderBy: { productName: "asc" }
            }
        }
    })

    if (!sessionData) return null

    const productIds = sessionData.items.map(i => i.productId)
    const products = await db.product.findMany({
        where: { id: { in: productIds }, tenantId },
        select: {
            id: true,
            categoryId: true,
            brandId: true,
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
            barcodes: { select: { value: true } }
        }
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    const enrichedItems = sessionData.items.map(i => {
        const prod = productMap.get(i.productId)
        return {
            ...i,
            categoryId: prod?.categoryId || null,
            categoryName: prod?.category?.name || null,
            brandId: prod?.brandId || null,
            brandName: prod?.brand?.name || null,
            barcodes: prod?.barcodes?.map(b => b.value) || []
        }
    })

    const [categories, brands] = await Promise.all([
        db.category.findMany({ where: { tenantId, isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        db.brand.findMany({ where: { tenantId, isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    ])

    return {
        ...sessionData,
        items: enrichedItems,
        categories,
        brands
    }
}

/** Approve session: apply all adjustments to product stock and create StockMovement history records */
export async function approveStockCountSession(sessionId: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const countSession = await db.stockCountSession.findFirst({
        where: { id: sessionId, tenantId, status: "OPEN" },
        include: { items: true }
    })

    if (!countSession) return { error: "Session non trouvée ou déjà traitée." }

    try {
        const store = await db.store.findFirst({ where: { tenantId } });

        await db.$transaction(async (tx) => {
            const itemsWithDiff = countSession.items.filter(i => i.difference !== 0);

            for (const item of itemsWithDiff) {
                const productBefore = await tx.product.findUnique({
                    where: { id: item.productId }
                });
                const stockBefore = productBefore?.stock ?? item.expectedQty;
                const stockAfter = stockBefore + item.difference;

                // 1. Update Product main stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.difference } }
                });

                // 2. Upsert StoreProduct
                if (store) {
                    await tx.storeProduct.upsert({
                        where: { storeId_productId: { storeId: store.id, productId: item.productId } },
                        update: { stock: { increment: item.difference } },
                        create: { storeId: store.id, productId: item.productId, stock: Math.max(0, stockAfter), minStock: productBefore?.minStock ?? 0 }
                    });
                }

                // 3. Create StockMovement entry
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: "MANUAL_ADJUSTMENT",
                        quantity: item.difference,
                        stockBefore,
                        stockAfter,
                        reason: `Audit d'inventaire: ${countSession.name}`,
                        referenceId: countSession.id,
                        userId: session.user.id,
                        tenantId
                    }
                });
            }

            // 4. Update session status
            await tx.stockCountSession.update({
                where: { id: sessionId },
                data: { status: "APPROVED", approvedAt: new Date() }
            });
        });

        revalidatePath("/[locale]/(dashboard)/inventory-audit")
        revalidatePath("/[locale]/(dashboard)/products")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        return { success: "Inventaire approuvé. Stock mis à jour et mouvements de stock enregistrés." }
    } catch (e) {
        console.error("approveStockCountSession error:", e)
        return { error: "Erreur lors de l'approbation de la session." }
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
