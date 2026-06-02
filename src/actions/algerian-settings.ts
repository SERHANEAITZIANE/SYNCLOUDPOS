"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "./audit-log"

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
            commissionMode: true,
            taxRegime: true,
            ifuRate: true,
            tapRate: true,
            stampTaxEnabled: true,
            posTimbreEnabled: true,
            posCashRounding: true,
            yalidineApiId: true,
            yalidineApiToken: true,
            dhdApiToken: true,
            hddApiToken: true,
            warrantyEnabled: true,
            blockNegativeStock: true,
            tvaEnabled: true,
        }
    })
}

/** Update Algerian business settings */
export async function updateAlgerianSettings(data: {
    ramadanMode?: boolean
    commissionRate?: number
    commissionMode?: string
    taxRegime?: string
    ifuRate?: number
    tapRate?: number
    stampTaxEnabled?: boolean
    posTimbreEnabled?: boolean
    posCashRounding?: boolean
    yalidineApiId?: string
    yalidineApiToken?: string
    dhdApiToken?: string
    hddApiToken?: string
    warrantyEnabled?: boolean
    blockNegativeStock?: boolean
    tvaEnabled?: boolean
}) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }
    if (session?.user?.role !== "ADMIN" && !session?.user?.isSuperadmin) return { error: "Accès réservé aux administrateurs" }

    // Get current values for audit trail
    const before = await db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            ramadanMode: true, commissionRate: true, commissionMode: true, taxRegime: true,
            ifuRate: true, tapRate: true, stampTaxEnabled: true, posTimbreEnabled: true,
            posCashRounding: true, warrantyEnabled: true, blockNegativeStock: true, tvaEnabled: true,
        }
    })

    await db.tenant.update({
        where: { id: tenantId },
        data
    })

    // Audit log (fire-and-forget)
    logAudit({
        action: "SETTINGS_CHANGE",
        entity: "SETTINGS",
        description: `Paramètres fiscaux modifiés par ${session.user?.name || "Admin"}`,
        before,
        after: data,
    }).catch(() => null)

    revalidatePath("/[locale]/(dashboard)/settings", "page")
    return { success: true }
}
