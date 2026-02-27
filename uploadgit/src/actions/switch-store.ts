"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

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

        // Switch active tenant
        await db.user.update({
            where: { id: session.user.id },
            data: { tenantId }
        })

        revalidatePath("/dashboard")

        return { success: "Store switched" }
    } catch (error) {
        console.error("Failed to switch store", error)
        return { error: "Failed to switch store" }
    }
}
