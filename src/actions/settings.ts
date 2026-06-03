"use server"

import { db } from "@/lib/db"
import { getActiveTenantId } from "./get-active-tenant"
import { revalidatePath } from "next/cache"
import { logAudit } from "./audit-log"

export async function updateTenantSettings(data: {
    name: string; ownerName?: string; activity?: string; address?: string;
    wilaya?: string; commune?: string; phone?: string; fax?: string;
    email?: string; nif?: string; rc?: string; artImposition?: string;
    nis?: string; bankAccount?: string; logo?: string; headerText?: string;
    blTemplate?: string;
    isElectronics?: boolean;
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
                blTemplate: data.blTemplate || "standard",
                isElectronics: data.isElectronics ?? false
            }
        });

        revalidatePath("/dashboard")
        revalidatePath("/settings")

        logAudit({ action: "SETTINGS_CHANGE", entity: "SETTINGS", description: `Entreprise mise à jour: ${data.name}`, after: { name: data.name, nif: data.nif, rc: data.rc } }).catch(() => null)

        return { success: "Settings updated successfully!", tenant }
    } catch (error) {
        console.error("[SETTINGS_UPDATE_ERROR]", error);
        return { error: "Failed to update settings." }
    }
}

export async function updateSystemSettings(data: {
    blTemplate?: string;
    posBlFormat?: string;
    posBlColumns?: string;
    aiProvider?: string;
    aiModel?: string;
    geminiApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
}) {
    try {
        const tenantId = await getActiveTenantId();

        if (!tenantId) {
            return { error: "Unauthorized or no active tenant selected." }
        }

        const updateData: any = {};
        if (data.blTemplate !== undefined) updateData.blTemplate = data.blTemplate || "standard";
        if (data.posBlFormat !== undefined) updateData.posBlFormat = data.posBlFormat || "A4";
        if (data.posBlColumns !== undefined) updateData.posBlColumns = data.posBlColumns || "standard";
        if (data.aiProvider !== undefined) updateData.aiProvider = data.aiProvider || "GEMINI";
        if (data.aiModel !== undefined) updateData.aiModel = data.aiModel || null;
        if (data.geminiApiKey !== undefined) updateData.geminiApiKey = data.geminiApiKey || null;
        if (data.openaiApiKey !== undefined) updateData.openaiApiKey = data.openaiApiKey || null;
        if (data.anthropicApiKey !== undefined) updateData.anthropicApiKey = data.anthropicApiKey || null;

        const tenant = await db.tenant.update({
            where: {
                id: tenantId
            },
            data: updateData
        });

        revalidatePath("/dashboard")
        revalidatePath("/settings")

        logAudit({ action: "SETTINGS_CHANGE", entity: "SETTINGS", description: `Paramètres système modifiés`, after: { ...updateData } }).catch(() => null)

        return { success: "Paramètres système mis à jour!", tenant }
    } catch (error) {
        console.error("[SYSTEM_SETTINGS_UPDATE_ERROR]", error);
        return { error: "Failed to update system settings." }
    }
}

export async function updateLoyaltySettings(data: {
    loyaltyPointsPerDa: number
    loyaltyDaPerPoint: number
}) {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { error: "Unauthorized or no active tenant selected." }

        await db.tenant.update({
            where: { id: tenantId },
            data: {
                loyaltyPointsPerDa: data.loyaltyPointsPerDa,
                loyaltyDaPerPoint: data.loyaltyDaPerPoint
            }
        })

        revalidatePath("/settings")
        revalidatePath("/pos")
        return { success: "Paramètres de fidélité mis à jour!" }
    } catch (error) {
        console.error("[LOYALTY_SETTINGS_UPDATE_ERROR]", error)
        return { error: "Erreur lors de la mise à jour." }
    }
}

export async function getLocalPrinters(): Promise<string[]> {
    try {
        const { exec } = await import("child_process")
        const { promisify } = await import("util")
        const execAsync = promisify(exec)

        let stdout = ""
        if (process.platform === "win32") {
            try {
                const res = await execAsync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"')
                stdout = res.stdout
            } catch (err) {
                const res = await execAsync('wmic printer get name')
                stdout = res.stdout
            }
        } else if (process.platform === "darwin") {
            const res = await execAsync('lpstat -a | cut -d" " -f1')
            stdout = res.stdout
        } else {
            const res = await execAsync('lpstat -p | cut -d" " -f2')
            stdout = res.stdout
        }

        const lines = stdout
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && line !== "Name" && !line.includes("------"))

        return Array.from(new Set(lines))
    } catch (error) {
        console.error("[GET_LOCAL_PRINTERS_ERROR]", error)
        return []
    }
}


