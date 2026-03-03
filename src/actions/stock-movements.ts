"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export const getStockMovements = async (productId: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const movements = await db.stockMovement.findMany({
            where: {
                productId,
                tenantId
            },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return { movements: JSON.parse(JSON.stringify(movements)) }
    } catch (error) {
        console.error("Error fetching stock movements:", error)
        return { error: "Failed to fetch stock movements" }
    }
}
