"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

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
        const result = await db.$transaction(async (tx) => {
            // 0. Ensure user has a TenantUser record for their current tenant (to avoid eclipsing/losing it)
            if (dbUser.tenantId) {
                const currentTenantUser = await tx.tenantUser.findUnique({
                    where: {
                        userId_tenantId: {
                            userId: session.user.id,
                            tenantId: dbUser.tenantId
                        }
                    }
                })
                if (!currentTenantUser) {
                    await tx.tenantUser.create({
                        data: {
                            userId: session.user.id,
                            tenantId: dbUser.tenantId,
                            role: "ADMIN"
                        }
                    })
                }
            }

            // 1. Create the new tenant — inherit subscription from current tenant
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    subscriptionEndsAt: dbUser.tenant?.subscriptionEndsAt ?? null
                }
            })

            // 2. Create default store for the new tenant
            const defaultStore = await tx.store.create({
                data: {
                    name: "Boutique Principale",
                    tenantId: tenant.id,
                }
            })

            // 3. Create the TenantUser join record (user belongs to this tenant)
            await tx.tenantUser.create({
                data: {
                    userId: session.user.id,
                    tenantId: tenant.id,
                    role: "ADMIN"
                }
            })

            // 4. Switch the user's active store to the new one
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    tenantId: tenant.id,
                    defaultStoreId: defaultStore.id
                }
            })

            // 5. Seed default accounts and customer
            await tx.treasuryAccount.createMany({
                data: [
                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                ]
            })

            await tx.customer.create({
                data: {
                    name: "DIVERS",
                    clientType: "RETAIL",
                    tenantId: tenant.id
                }
            })

            return { tenant, store: defaultStore }
        })

        const cookieStore = await cookies()
        cookieStore.set("selected_tenant_id", result.tenant.id, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        })
        cookieStore.set("selected_store_id", result.store.id, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        })

        revalidatePath("/dashboard")

        return { success: "Store created", tenant: result.tenant }
    } catch (error: any) {
        console.error("Failed to create store", error)
        require('fs').writeFileSync('store_error.txt', JSON.stringify({ message: error.message, stack: error.stack }), 'utf8')
        return { error: "Failed to create store: " + error.message }
    }
}
