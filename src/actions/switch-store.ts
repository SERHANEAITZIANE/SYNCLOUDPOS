"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export const switchStore = async (tenantId: string) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify the user has access to this tenant
        const membership = await db.tenantUser.findUnique({
            where: {
                userId_tenantId: {
                    userId: session.user.id,
                    tenantId
                }
            }
        })

        if (!membership) {
            return { error: "You don't have access to this store" }
        }

        // Find the first store of the target tenant
        const firstStore = await db.store.findFirst({
            where: { tenantId },
            select: { id: true }
        })

        // Update only the DB fallback default (used for fresh logins with no cookie)
        // We do NOT update tenantId in DB — that would affect other logged-in devices!
        if (firstStore?.id) {
            await db.user.update({
                where: { id: session.user.id },
                data: { defaultStoreId: firstStore.id }
            })
        }

        const cookieStore = await cookies()
        cookieStore.set("selected_tenant_id", tenantId, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        })

        if (firstStore?.id) {
            cookieStore.set("selected_store_id", firstStore.id, {
                path: "/",
                maxAge: 60 * 60 * 24 * 365, // 1 year
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production"
            })
        }

        revalidatePath("/dashboard")

        return { success: "Store switched" }
    } catch (error) {
        console.error("Failed to switch store", error)
        return { error: "Failed to switch store" }
    }
}
