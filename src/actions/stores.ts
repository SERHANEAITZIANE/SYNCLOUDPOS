"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getStores() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    return await db.store.findMany({
        where: { tenantId },
        orderBy: { name: "asc" }
    })
}

export async function setDefaultStore(storeId: string) {
    const session = await auth()
    const userId = session?.user?.id
    const tenantId = session?.user?.tenantId

    if (!userId || !tenantId) return { error: "Unauthorized" }

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
        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("Failed to set default store", e)
        return { error: "Failed to set default store" }
    }
}
