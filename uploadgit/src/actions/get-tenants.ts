"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export const getUserTenants = async () => {
    const session = await auth()

    if (!session?.user?.email) {
        return []
    }

    const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, tenantId: true }
    })

    if (!user) return []

    // Query all tenants the user belongs to via TenantUser join table
    const tenantUsers = await db.tenantUser.findMany({
        where: { userId: user.id },
        include: { tenant: true }
    })

    // If user has no TenantUser records yet (legacy data),
    // fall back to their current tenantId
    if (tenantUsers.length === 0 && user.tenantId) {
        const tenant = await db.tenant.findUnique({
            where: { id: user.tenantId },
            select: { id: true, name: true }
        })
        return tenant ? [{ id: tenant.id, name: tenant.name }] : []
    }

    return tenantUsers.map(tu => ({ id: tu.tenant.id, name: tu.tenant.name }))
}
