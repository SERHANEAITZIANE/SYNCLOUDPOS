"use server"

import { db } from "@/lib/db"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { checkSubscription } from "@/lib/subscription"
import cacheMonitor from "@/lib/cache-monitor"
import { StockMovementType } from "@prisma/client"

interface SpoilageData {
    date: Date
    reason: string
    quantity: number
    productId: string
}

export async function createSpoilage(data: SpoilageData) {
    await checkSubscription();
    try {
        const tenantId = await getActiveTenantId()
        const session = await auth()

        if (!tenantId || !session?.user?.id) {
            return { error: "Non autorisé" }
        }

        const { date, reason, quantity, productId } = data

        const store = await db.store.findFirst({ where: { tenantId } })
        if (!store) return { error: "Boutique introuvable" }

        // Check if product exists and belongs to the current tenant
        const product = await db.product.findFirst({
            where: {
                id: productId,
                tenantId
            }
        })

        if (!product) {
            return { error: "Produit introuvable" }
        }

        // Fetch storeProduct to check stock
        const storeProduct = await db.storeProduct.findUnique({
            where: { storeId_productId: { storeId: store.id, productId } }
        })

        if (!storeProduct) {
            return { error: "Stock non configuré pour ce produit" }
        }

        if (Number(storeProduct.stock) < quantity) {
            return { error: "Quantité avariée supérieure au stock disponible" }
        }

        // 1. Create the Spoilage record
        // 2. Decrement the product stock in a transaction to ensure atomicity
        await db.$transaction(async (tx) => {
            const spoilage = await tx.spoilage.create({
                data: {
                    date,
                    reason,
                    quantity,
                    productId,
                    tenantId,
                    userId: session.user.id
                }
            })

            await tx.storeProduct.update({
                where: {
                    storeId_productId: { storeId: store.id, productId }
                },
                data: {
                    stock: {
                        decrement: quantity
                    }
                }
            })

            await tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } }
            })

            await tx.stockMovement.create({
                data: {
                    productId,
                    type: "SPOILAGE",
                    quantity: -quantity,
                    stockBefore: Number(storeProduct.stock),
                    stockAfter: Number(storeProduct.stock) - quantity,
                    referenceId: spoilage.id,
                    reason: reason || "Déclaration avarie",
                    userId: session.user.id,
                    tenantId
                }
            })
        })

        revalidatePath("/avaries")
        revalidatePath("/products")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)

        return { success: "Avarie enregistrée avec succès" }

    } catch (error) {
        console.error("[CREATE_SPOILAGE]", error)
        return { error: "Erreur lors de la création de l'avarie" }
    }
}

export async function getSpoilages() {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return []

        const spoilages = await db.spoilage.findMany({
            where: {
                tenantId
            },
            include: {
                product: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        })

        return spoilages
    } catch (error) {
        console.error("[GET_SPOILAGES]", error)
        return []
    }
}

export async function deleteSpoilage(id: string) {
    await checkSubscription();
    try {
        const tenantId = await getActiveTenantId()
        const session = await auth()

        if (!tenantId || !session?.user?.id) {
            return { error: "Non autorisé" }
        }

        const store = await db.store.findFirst({ where: { tenantId } })
        if (!store) return { error: "Boutique introuvable" }

        // Find the Spoilage record
        const spoilage = await db.spoilage.findFirst({
            where: {
                id,
                tenantId
            }
        })

        if (!spoilage) {
            return { error: "Avarie introuvable" }
        }

        const { productId, quantity } = spoilage

        // Fetch storeProduct to verify stock exists
        const storeProduct = await db.storeProduct.findUnique({
            where: { storeId_productId: { storeId: store.id, productId } }
        })

        if (!storeProduct) {
            return { error: "Stock non configuré pour ce produit" }
        }

        // Delete the spoilage and restore stock in transaction
        await db.$transaction(async (tx) => {
            // Restore the stock
            await tx.storeProduct.update({
                where: {
                    storeId_productId: { storeId: store.id, productId }
                },
                data: {
                    stock: {
                        increment: quantity
                    }
                }
            })

            await tx.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } }
            })

            // Create movement reversing it
            await tx.stockMovement.create({
                data: {
                    productId,
                    type: "STOCK_IN",
                    quantity: quantity,
                    stockBefore: Number(storeProduct.stock),
                    stockAfter: Number(storeProduct.stock) + quantity,
                    referenceId: id,
                    reason: `Annulation avarie ${id}`,
                    userId: session.user.id,
                    tenantId
                }
            })

            // Delete the original spoilage
            await tx.spoilage.delete({
                where: {
                    id
                }
            })
        })

        revalidatePath("/avaries")
        revalidatePath("/products")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)

        return { success: "Avarie supprimée et stock restauré" }

    } catch (error) {
        console.error("[DELETE_SPOILAGE]", error)
        return { error: "Erreur lors de la suppression de l'avarie" }
    }
}

export async function updateSpoilage(id: string, data: SpoilageData) {
    await checkSubscription();
    try {
        const tenantId = await getActiveTenantId()
        const session = await auth()

        if (!tenantId || !session?.user?.id) {
            return { error: "Non autorisé" }
        }

        const store = await db.store.findFirst({ where: { tenantId } })
        if (!store) return { error: "Boutique introuvable" }

        // Find existing spoilage
        const existing = await db.spoilage.findFirst({
            where: { id, tenantId }
        })
        if (!existing) return { error: "Avarie introuvable" }

        // Check stock availability
        if (existing.productId === data.productId) {
            const diff = data.quantity - existing.quantity
            if (diff > 0) {
                const storeProduct = await db.storeProduct.findUnique({
                    where: { storeId_productId: { storeId: store.id, productId: data.productId } }
                })
                if (!storeProduct || Number(storeProduct.stock) < diff) {
                    return { error: "Stock insuffisant pour augmenter la quantité avariée" }
                }
            }
        } else {
            const storeProduct = await db.storeProduct.findUnique({
                where: { storeId_productId: { storeId: store.id, productId: data.productId } }
            })
            if (!storeProduct || Number(storeProduct.stock) < data.quantity) {
                return { error: "Stock insuffisant pour déclarer cette avarie" }
            }
        }

        await db.$transaction(async (tx) => {
            // Revert or adjust stock
            if (existing.productId === data.productId) {
                const diff = data.quantity - existing.quantity
                if (diff !== 0) {
                    await tx.storeProduct.update({
                        where: { storeId_productId: { storeId: store.id, productId: data.productId } },
                        data: { stock: { decrement: diff } }
                    })
                    await tx.product.update({
                        where: { id: data.productId },
                        data: { stock: { decrement: diff } }
                    })
                }
            } else {
                // Restore stock of old product
                await tx.storeProduct.update({
                    where: { storeId_productId: { storeId: store.id, productId: existing.productId } },
                    data: { stock: { increment: existing.quantity } }
                })
                await tx.product.update({
                    where: { id: existing.productId },
                    data: { stock: { increment: existing.quantity } }
                })

                // Deduct stock of new product
                await tx.storeProduct.update({
                    where: { storeId_productId: { storeId: store.id, productId: data.productId } },
                    data: { stock: { decrement: data.quantity } }
                })
                await tx.product.update({
                    where: { id: data.productId },
                    data: { stock: { decrement: data.quantity } }
                })
            }

            // Update associated StockMovement
            await tx.stockMovement.updateMany({
                where: { referenceId: id, type: "SPOILAGE" },
                data: {
                    productId: data.productId,
                    quantity: -data.quantity,
                    reason: data.reason || "Déclaration avarie (Modifié)",
                    createdAt: data.date
                }
            })

            // Update the Spoilage record itself
            await tx.spoilage.update({
                where: { id },
                data: {
                    date: data.date,
                    reason: data.reason,
                    quantity: data.quantity,
                    productId: data.productId
                }
            })
        })

        revalidatePath("/avaries")
        revalidatePath("/products")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)

        return { success: "Avarie modifiée avec succès" }
    } catch (error) {
        console.error("[UPDATE_SPOILAGE]", error)
        return { error: "Erreur lors de la modification de l'avarie" }
    }
}


