"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/** Get Algerian business settings for the current tenant */
export async function getAlgerianSettings() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return null

    return db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            ramadanMode: true,
            commissionRate: true,
            taxRegime: true,
            ifuRate: true,
            yalidineApiId: true,
            yalidineApiToken: true,
            dhdApiToken: true,
            hddApiToken: true,
        } as any
    }) as any
}

/** Update Algerian business settings */
export async function updateAlgerianSettings(data: {
    ramadanMode?: boolean
    commissionRate?: number
    taxRegime?: string
    ifuRate?: number
    yalidineApiId?: string
    yalidineApiToken?: string
    dhdApiToken?: string
    hddApiToken?: string
}) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    await db.tenant.update({
        where: { id: tenantId },
        data: data as any
    })

    revalidatePath("/[locale]/(dashboard)/settings", "page")
    return { success: true }
}
