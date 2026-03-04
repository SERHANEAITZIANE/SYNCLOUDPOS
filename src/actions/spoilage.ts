"use server"

import { db } from "@/lib/db"
import { getActiveTenantId } from "@/actions/get-active-tenant"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { checkSubscription } from "@/lib/subscription"

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
