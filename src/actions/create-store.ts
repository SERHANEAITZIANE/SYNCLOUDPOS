"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createStore = async (name: string) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const dbUser = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!dbUser) {
        return { error: "Session invalid. Please log out and log back in." }
    }

    try {
        // 1. Create the new tenant
        const tenant = await db.tenant.create({
            data: { name }
        })

        // 2. Create the TenantUser join record (user belongs to this tenant)
        await db.tenantUser.create({
            data: {
                userId: session.user.id,
                tenantId: tenant.id,
                role: "ADMIN"
            }
        })

        // 3. Switch the user's active store to the new one
        await db.user.update({
            where: { id: session.user.id },
            data: { tenantId: tenant.id }
        })

        revalidatePath("/dashboard")

        return { success: "Store created", tenant }
    } catch (error: any) {
        console.error("Failed to create store", error)
        require('fs').writeFileSync('store_error.txt', JSON.stringify({ message: error.message, stack: error.stack }), 'utf8')
        return { error: "Failed to create store: " + error.message }
    }
}
