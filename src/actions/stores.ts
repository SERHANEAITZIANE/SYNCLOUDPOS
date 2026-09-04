"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { cookies } from "next/headers"

export async function getStores() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    const role = session?.user?.role
    const isSuperadmin = session?.user?.isSuperadmin
    const defaultStoreId = session?.user?.defaultStoreId

    if (!tenantId) return []

    // Non-admin users (CASHIER, VENDEUR, MANAGER, STOCK_MANAGER, ACCOUNTANT)
    // are strictly restricted to their assigned store(s)!
    if (role !== "ADMIN" && !isSuperadmin) {
        if (defaultStoreId) {
            const allowedStoreIds = defaultStoreId.split(",").map(s => s.trim()).filter(Boolean)
            if (allowedStoreIds.length > 0) {
                const userStores = await db.store.findMany({
                    where: { id: { in: allowedStoreIds }, tenantId },
                    orderBy: { name: "asc" }
                })
                if (userStores.length > 0) return userStores
            }
        }
        const firstStore = await db.store.findFirst({
            where: { tenantId },
            orderBy: { name: "asc" }
        })
        return firstStore ? [firstStore] : []
    }

    return await db.store.findMany({
        where: { tenantId },
        orderBy: { name: "asc" }
    })
}

export async function setDefaultStore(storeId: string) {
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("settings:update"))) return { error: "Accès refusé" }

    const session = await auth()
    const userId = session?.user?.id
    const tenantId = session?.user?.tenantId
    const role = session?.user?.role
    const isSuperadmin = session?.user?.isSuperadmin

    if (!userId || !tenantId) return { error: "Unauthorized" }

    // Non-admin users can only switch to one of their assigned stores
    if (role !== "ADMIN" && !isSuperadmin) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { defaultStoreId: true }
        })
        if (user?.defaultStoreId) {
            const allowedStoreIds = user.defaultStoreId.split(",").map(s => s.trim()).filter(Boolean)
            if (allowedStoreIds.length > 0 && !allowedStoreIds.includes(storeId)) {
                return { error: "Accès refusé. Vous n'avez pas accès à ce magasin." }
            }
        }
    }

    // verify store belongs to tenant
    const store = await db.store.findUnique({
        where: { id: storeId }
    })

    if (!store || store.tenantId !== tenantId) {
        return { error: "Store not found or unauthorized" }
    }

    try {
        await db.user.update({
            where: { id: userId },
            data: { defaultStoreId: storeId }
        })

        const cookieStore = await cookies()
        cookieStore.set("selected_store_id", storeId, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        })

        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("Failed to set default store", e)
        return { error: "Failed to set default store" }
    }
}

export async function createStoreForTenantAdmin(name: string, address?: string) {
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("settings:create"))) return { error: "Accès refusé" }

    const session = await auth()
    const tenantId = session?.user?.tenantId
    const userId = session?.user?.id

    if (!userId || !tenantId || (session.user?.role !== "ADMIN" && !session.user?.isSuperadmin)) {
        return { error: "Unauthorized" }
    }

    if (!name.trim()) return { error: "Le nom du magasin est requis" }

    try {
        const store = await db.$transaction(async (tx) => {
            const newStore = await tx.store.create({
                data: {
                    name: name.trim(),
                    address: address?.trim() || null,
                    tenantId
                }
            })

            // For all existing products of this tenant, create a StoreProduct entry with 0 stock
            const products = await tx.product.findMany({
                where: { tenantId },
                select: { id: true }
            })

            if (products.length > 0) {
                await tx.storeProduct.createMany({
                    data: products.map(p => ({
                        id: randomUUID(),
                        storeId: newStore.id,
                        productId: p.id,
                        stock: 0,
                        minStock: 0
                    }))
                })
            }

            return newStore
        })

        revalidatePath("/")
        return { success: "Magasin créé avec succès", store }
    } catch (e: any) {
        console.error("Failed to create store", e)
        return { error: "Erreur lors de la création : " + e.message }
    }
}

export async function updateStoreForTenantAdmin(storeId: string, name: string, address?: string) {
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("settings:update"))) return { error: "Accès refusé" }

    const session = await auth()
    const tenantId = session?.user?.tenantId
    const userId = session?.user?.id

    if (!userId || !tenantId || (session.user?.role !== "ADMIN" && !session.user?.isSuperadmin)) {
        return { error: "Unauthorized" }
    }

    if (!name.trim()) return { error: "Le nom du magasin est requis" }

    // verify store belongs to tenant
    const store = await db.store.findUnique({
        where: { id: storeId }
    })

    if (!store || store.tenantId !== tenantId) {
        return { error: "Store not found or unauthorized" }
    }

    try {
        const updated = await db.store.update({
            where: { id: storeId },
            data: {
                name: name.trim(),
                address: address?.trim() || null
            }
        })

        revalidatePath("/")
        return { success: "Magasin mis à jour avec succès", store: updated }
    } catch (e: any) {
        console.error("Failed to update store", e)
        return { error: "Erreur lors de la modification : " + e.message }
    }
}

export async function deleteStoreForTenantAdmin(storeId: string) {
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("settings:delete"))) return { error: "Accès refusé" }

    const session = await auth()
    const tenantId = session?.user?.tenantId
    const userId = session?.user?.id

    if (!userId || !tenantId || (session.user?.role !== "ADMIN" && !session.user?.isSuperadmin)) {
        return { error: "Unauthorized" }
    }

    // verify store belongs to tenant
    const store = await db.store.findUnique({
        where: { id: storeId }
    })

    if (!store || store.tenantId !== tenantId) {
        return { error: "Store not found or unauthorized" }
    }

    // verify that this is not the last store
    const storeCount = await db.store.count({
        where: { tenantId }
    })

    if (storeCount <= 1) {
        return { error: "Impossible de supprimer le seul magasin restant." }
    }

    try {
        await db.$transaction(async (tx) => {
            // Find another store to switch users to
            const alternativeStore = await tx.store.findFirst({
                where: { tenantId, id: { not: storeId } }
            })

            if (alternativeStore) {
                // Update defaultStoreId for all users of this tenant who had the deleted store selected
                await tx.user.updateMany({
                    where: { tenantId, defaultStoreId: storeId },
                    data: { defaultStoreId: alternativeStore.id }
                })
            }

            // Delete the store (StoreProduct entries will cascade delete)
            await tx.store.delete({
                where: { id: storeId }
            })
        })

        revalidatePath("/")
        return { success: "Magasin supprimé avec succès" }
    } catch (e: any) {
        console.error("Failed to delete store", e)
        return { error: "Erreur lors de la suppression : " + e.message }
    }
}
