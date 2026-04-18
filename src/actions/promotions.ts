"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

type PromotionData = {
    name: string
    type: string
    targetScope: string
    scopeId?: string | null
    discountType: string
    discountValue: number
    triggerQty: number
    isActive?: boolean
    startsAt?: Date | null
    endsAt?: Date | null
}

export const getActivePromotions = async () => {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = session.user.tenantId
    if (!tenantId) return []

    const now = new Date()
    const promotions = await db.promotion.findMany({
        where: {
            tenantId,
            isActive: true,
            OR: [
                { startsAt: null, endsAt: null },
                { startsAt: { lte: now }, endsAt: { gte: now } },
                { startsAt: { lte: now }, endsAt: null },
                { startsAt: null, endsAt: { gte: now } }
            ]
        }
    })

    return promotions.map(p => ({
        ...p,
        discountValue: Number(p.discountValue)
    }))
}

export const getAllPromotions = async () => {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = session.user.tenantId
    if (!tenantId) return []

    const promotions = await db.promotion.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" }
    })

    return promotions.map(p => ({
        ...p,
        discountValue: Number(p.discountValue)
    }))
}

export const createPromotion = async (data: PromotionData) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("promotions"))) return { error: "Accès refusé" }
    
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        await db.promotion.create({
            data: {
                tenantId,
                name: data.name,
                type: data.type,
                targetScope: data.targetScope,
                scopeId: data.scopeId || null,
                discountType: data.discountType,
                discountValue: data.discountValue,
                triggerQty: data.triggerQty,
                isActive: data.isActive ?? true,
                startsAt: data.startsAt || null,
                endsAt: data.endsAt || null
            }
        })
        revalidatePath("/(dashboard)/promotions")
        return { success: "Promotion créée avec succès" }
    } catch (error) {
        console.error("createPromotion error:", error)
        return { error: "Erreur lors de la création de la promotion" }
    }
}

export const togglePromotion = async (id: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("promotions"))) return { error: "Accès refusé" }

    try {
        const promo = await db.promotion.findUnique({ where: { id } })
        if (!promo) return { error: "Promotion introuvable" }

        await db.promotion.update({
            where: { id },
            data: { isActive: !promo.isActive }
        })
        revalidatePath("/(dashboard)/promotions")
        return { success: "Promotion mise à jour" }
    } catch (error) {
        console.error("togglePromotion error:", error)
        return { error: "Erreur lors de la mise à jour" }
    }
}

export const deletePromotion = async (id: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("promotions"))) return { error: "Accès refusé" }

    try {
        await db.promotion.delete({ where: { id } })
        revalidatePath("/(dashboard)/promotions")
        return { success: "Promotion supprimée" }
    } catch (error) {
        console.error("deletePromotion error:", error)
        return { error: "Erreur lors de la suppression" }
    }
}
