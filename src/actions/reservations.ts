"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/** Create a new product reservation with deposit */
export async function createReservation(data: {
    productId: string
    customerId?: string
    quantity: number
    depositAmount: number
    totalAmount: number
    dueDate?: string
    notes?: string
}) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const reservation = await db.reservation.create({
        data: {
            tenantId,
            ...data,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }
    })

    revalidatePath("/[locale]/(dashboard)/reservations", "page")
    return { success: true, id: reservation.id }
}

/** Get all reservations for the current tenant */
export async function getReservations() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return []

    return db.reservation.findMany({
        where: { tenantId },
        include: {
            product: { select: { id: true, name: true, price: true } },
            customer: { select: { id: true, name: true, phone: true } }
        },
        orderBy: { createdAt: "desc" }
    })
}

/** Update reservation status */
export async function updateReservationStatus(id: string, status: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    await db.reservation.update({
        where: { id, tenantId },
        data: { status }
    })

    revalidatePath("/[locale]/(dashboard)/reservations", "page")
    return { success: true }
}

/** Delete a reservation */
export async function deleteReservation(id: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    await db.reservation.delete({ where: { id, tenantId } })
    revalidatePath("/[locale]/(dashboard)/reservations", "page")
    return { success: true }
}
