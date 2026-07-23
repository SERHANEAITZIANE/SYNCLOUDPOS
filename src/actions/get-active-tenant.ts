"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { cookies } from "next/headers"

export const getActiveTenantId = async (): Promise<string | null> => {
    if (process.env.AUDIT_TENANT_ID) {
        return process.env.AUDIT_TENANT_ID
    }

    const session = await auth()

    // 2. Fall back to session user tenantId (which includes next-auth cookie overrides)
    if (session?.user?.tenantId) {
        return session.user.tenantId
    }

    // 3. Fall back to user primary tenantId in DB
    if (!session?.user?.email) {
        return null
    }

    const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { tenantId: true }
    })

    return user?.tenantId || null
}
