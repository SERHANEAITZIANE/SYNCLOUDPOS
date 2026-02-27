"use server"

import { db } from "@/lib/db"
import { getActiveTenantId } from "./get-active-tenant"
import { revalidatePath } from "next/cache"

export async function updateTenantSettings(data: {
    name: string; ownerName?: string; activity?: string; address?: string;
    wilaya?: string; commune?: string; phone?: string; fax?: string;
    email?: string; nif?: string; rc?: string; artImposition?: string;
    nis?: string; bankAccount?: string; logo?: string; headerText?: string;
    blTemplate?: string;
}) {
    try {
        const tenantId = await getActiveTenantId();

        if (!tenantId) {
            return { error: "Unauthorized or no active tenant selected." }
        }

        if (!data.name || data.name.trim() === "") {
            return { error: "Store name is required." }
        }

        const tenant = await db.tenant.update({
            where: {
                id: tenantId
            },
            data: {
                name: data.name,
                ownerName: data.ownerName || null,
                activity: data.activity || null,
                address: data.address || null,
                wilaya: data.wilaya || null,
                commune: data.commune || null,
                phone: data.phone || null,
                fax: data.fax || null,
                email: data.email || null,
                nif: data.nif || null,
                rc: data.rc || null,
                artImposition: data.artImposition || null,
                nis: data.nis || null,
                bankAccount: data.bankAccount || null,
                logo: data.logo || null,
                headerText: data.headerText || null,
                blTemplate: data.blTemplate || "standard"
            }
        });

        revalidatePath("/dashboard")
        revalidatePath("/settings")

        return { success: "Settings updated successfully!", tenant }
    } catch (error) {
        console.error("[SETTINGS_UPDATE_ERROR]", error);
        return { error: "Failed to update settings." }
    }
}

export async function updateSystemSettings(data: {
    blTemplate: string;
}) {
    try {
        const tenantId = await getActiveTenantId();

        if (!tenantId) {
            return { error: "Unauthorized or no active tenant selected." }
        }

        const tenant = await db.tenant.update({
            where: {
                id: tenantId
            },
            data: {
                blTemplate: data.blTemplate || "standard"
            }
        });

        revalidatePath("/dashboard")
        revalidatePath("/settings")

        return { success: "Paramètres système mis à jour!", tenant }
    } catch (error) {
        console.error("[SYSTEM_SETTINGS_UPDATE_ERROR]", error);
        return { error: "Failed to update system settings." }
    }
}
