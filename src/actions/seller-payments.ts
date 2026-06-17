"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createSellerPayment(data: {
    userId: string
    amount: number
    notes?: string
    date?: string
}) {
    const session = await auth()
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("commissions:create"))) return { error: "Accès refusé" }

    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    try {
        const payment = await db.sellerCommissionPayment.create({
            data: {
                tenantId,
                userId: data.userId,
                amount: data.amount,
                notes: data.notes || null,
                date: data.date ? new Date(data.date) : new Date()
            }
        })

        revalidatePath("/commissions")
        return { success: "Règlement enregistré avec succès !", data: JSON.parse(JSON.stringify(payment)) }
    } catch (error) {
        console.error("[CREATE_SELLER_PAYMENT_ERROR]", error)
        return { error: "Impossible d'enregistrer le règlement." }
    }
}

export async function getSellerPayments(userId?: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    try {
        const payments = await db.sellerCommissionPayment.findMany({
            where: {
                tenantId,
                ...(userId ? { userId } : {})
            },
            include: {
                user: { select: { id: true, name: true } }
            },
            orderBy: {
                date: "desc"
            }
        })
        return JSON.parse(JSON.stringify(payments))
    } catch (error) {
        console.error("[GET_SELLER_PAYMENTS_ERROR]", error)
        return []
    }
}

export async function deleteSellerPayment(id: string) {
    const session = await auth()
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("commissions:delete"))) return { error: "Accès refusé" }

    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    try {
        await db.sellerCommissionPayment.delete({
            where: {
                id,
                tenantId
            }
        })

        revalidatePath("/commissions")
        return { success: "Règlement supprimé avec succès !" }
    } catch (error) {
        console.error("[DELETE_SELLER_PAYMENT_ERROR]", error)
        return { error: "Impossible de supprimer le règlement." }
    }
}
