"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export const getActiveTenantId = async (): Promise<string | null> => {
    const session = await auth()

    if (!session?.user?.email) {
        return null
    }

    const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { tenantId: true }
    })

    return user?.tenantId || null
}
