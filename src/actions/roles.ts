"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAvailableRoles, Permission, Module, Action } from "@/lib/rbac"

export interface TenantRolePermissionsMap {
    [role: string]: Permission[]
}

/**
 * Fetch tenant's custom role permissions, or fallback defaults if none set.
 */
export async function getTenantRolePermissions(): Promise<{
    success: boolean
    data?: TenantRolePermissionsMap
    error?: string
}> {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Non autorisé" }
        const tenantId = session.user.tenantId
        if (!tenantId) return { success: false, error: "Tenant non trouvé" }

        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { customRolePermissions: true }
        })

        const customMap = (tenant?.customRolePermissions as TenantRolePermissionsMap) || {}
        return { success: true, data: customMap }
    } catch (error: any) {
        console.error("Error fetching role permissions:", error)
        return { success: false, error: error?.message || "Erreur lors du chargement des permissions" }
    }
}

/**
 * Save custom permissions list for a specific role.
 */
export async function saveRolePermissions(role: string, permissions: Permission[]): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Non autorisé" }
        if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
            return { success: false, error: "Seul un administrateur peut modifier les permissions" }
        }

        const tenantId = session.user.tenantId
        if (!tenantId) return { success: false, error: "Tenant non trouvé" }

        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { customRolePermissions: true }
        })

        const existingMap: TenantRolePermissionsMap = (tenant?.customRolePermissions as TenantRolePermissionsMap) || {}
        const updatedMap: TenantRolePermissionsMap = {
            ...existingMap,
            [role]: permissions
        }

        await db.tenant.update({
            where: { id: tenantId },
            data: { customRolePermissions: updatedMap as any }
        })

        revalidatePath("/[locale]/(dashboard)/settings/roles", "page")
        revalidatePath("/[locale]/(dashboard)/settings/users", "page")
        return { success: true }
    } catch (error: any) {
        console.error("Error saving role permissions:", error)
        return { success: false, error: error?.message || "Impossible d'enregistrer les permissions" }
    }
}

/**
 * Reset permissions for a role or all roles to default.
 */
export async function resetRolePermissions(role?: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Non autorisé" }
        if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
            return { success: false, error: "Seul un administrateur peut réinitialiser les permissions" }
        }

        const tenantId = session.user.tenantId
        if (!tenantId) return { success: false, error: "Tenant non trouvé" }

        if (!role) {
            // Reset ALL custom permissions
            await db.tenant.update({
                where: { id: tenantId },
                data: { customRolePermissions: null }
            })
        } else {
            // Reset specific role
            const tenant = await db.tenant.findUnique({
                where: { id: tenantId },
                select: { customRolePermissions: true }
            })

            const existingMap: TenantRolePermissionsMap = (tenant?.customRolePermissions as TenantRolePermissionsMap) || {}
            delete existingMap[role]

            await db.tenant.update({
                where: { id: tenantId },
                data: { customRolePermissions: Object.keys(existingMap).length > 0 ? (existingMap as any) : null }
            })
        }

        revalidatePath("/[locale]/(dashboard)/settings/roles", "page")
        return { success: true }
    } catch (error: any) {
        console.error("Error resetting role permissions:", error)
        return { success: false, error: error?.message || "Erreur lors de la réinitialisation" }
    }
}

/**
 * Export role permission configuration as JSON.
 */
export async function exportRolePermissionsConfig(): Promise<{
    success: boolean
    jsonString?: string
    error?: string
}> {
    try {
        const res = await getTenantRolePermissions()
        if (!res.success || !res.data) return { success: false, error: res.error || "Impossible d'exporter" }

        const exportData = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            rolesPermissions: res.data
        }

        return { success: true, jsonString: JSON.stringify(exportData, null, 2) }
    } catch (error: any) {
        return { success: false, error: error?.message || "Erreur lors de l'exportation" }
    }
}

/**
 * Import role permission configuration from JSON string.
 */
export async function importRolePermissionsConfig(jsonString: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Non autorisé" }
        if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
            return { success: false, error: "Seul un administrateur peut importer des rôles" }
        }

        const tenantId = session.user.tenantId
        if (!tenantId) return { success: false, error: "Tenant non trouvé" }

        const parsed = JSON.parse(jsonString)
        const rolesPermissions = parsed.rolesPermissions || parsed

        if (typeof rolesPermissions !== "object" || Array.isArray(rolesPermissions)) {
            return { success: false, error: "Format de fichier JSON invalide" }
        }

        await db.tenant.update({
            where: { id: tenantId },
            data: { customRolePermissions: rolesPermissions }
        })

        revalidatePath("/[locale]/(dashboard)/settings/roles", "page")
        return { success: true }
    } catch (error: any) {
        console.error("Error importing role permissions:", error)
        return { success: false, error: "Fichier JSON corrompu ou invalide" }
    }
}
