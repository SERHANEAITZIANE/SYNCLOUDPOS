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
        where: { id: session.user.id },
        include: { tenant: { select: { subscriptionEndsAt: true } } }
    })

    if (!dbUser) {
        return { error: "Session invalid. Please log out and log back in." }
    }

    try {
        // 1. Create the new tenant — inherit subscription from current tenant
        const tenant = await db.tenant.create({
            data: {
                name,
                subscriptionEndsAt: dbUser.tenant?.subscriptionEndsAt ?? null
            }
        })

        // 2. Create default store for the new tenant
        const defaultStore = await db.store.create({
            data: {
                name: "Boutique Principale",
                tenantId: tenant.id,
            }
        })

        // 3. Create the TenantUser join record (user belongs to this tenant)
        await db.tenantUser.create({
            data: {
                userId: session.user.id,
                tenantId: tenant.id,
                role: "ADMIN"
            }
        })

        // 4. Switch the user's active store to the new one
        await db.user.update({
            where: { id: session.user.id },
            data: {
                tenantId: tenant.id,
                defaultStoreId: defaultStore.id
            }
        })

        // 5. Seed default accounts and customer
        await Promise.all([
            db.treasuryAccount.createMany({
                data: [
                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                ]
            }),
            db.customer.create({
                data: {
                    name: "DIVERS",
                    clientType: "RETAIL",
                    tenantId: tenant.id
                }
            })
        ])

        revalidatePath("/dashboard")

        return { success: "Store created", tenant }
    } catch (error: any) {
        console.error("Failed to create store", error)
        require('fs').writeFileSync('store_error.txt', JSON.stringify({ message: error.message, stack: error.stack }), 'utf8')
        return { error: "Failed to create store: " + error.message }
    }
}
