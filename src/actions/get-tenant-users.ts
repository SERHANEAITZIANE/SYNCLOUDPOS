"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export const getTenantUsers = async () => {
    const session = await auth()

    if (!session?.user?.id) {
        return []
    }

    // Get current user to find their tenantId
    const currentUser = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!currentUser?.tenantId) {
        return []
    }

    const users = await db.user.findMany({
        where: {
            tenantId: currentUser.tenantId
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return users
}
