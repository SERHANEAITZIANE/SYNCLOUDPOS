"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
    isValidPermission,
    roleGrants,
    getEffectiveCatalogPermissions,
    getAllCatalogPermissions,
} from "@/lib/permissions"

/**
 * Admin-only per-user permission editor.
 *
 * The caller sends the FULL desired set of granular "module:action" permissions
 * for the target user (the effective checkboxes from the matrix). We diff that
 * against the target user's role base and persist only the differences:
 *   - desired but role doesn't grant  → extraPermissions (ALLOW)
 *   - not desired but role grants      → deniedPermissions (DENY)
 * This keeps overrides minimal and lets the un-overridden permissions follow
 * the role if it's changed later.
 */

const UpdatePermissionsSchema = z.object({
    userId: z.string().min(1, "User ID requis"),
    // Full desired effective permission set (granular "module:action" strings).
    permissions: z.array(z.string()).max(500),
})

async function assertAdmin() {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Non autorisé", session: null as null }
    }
    const isAdmin = session.user.role === "ADMIN" || session.user.isSuperadmin
    if (!isAdmin) {
        return { error: "Accès refusé", session: null as null }
    }
    // Defense in depth: also require the users:update capability.
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("users:update"))) {
        return { error: "Accès refusé", session: null as null }
    }
    return { error: null as null, session }
}

export const updateUserPermissions = async (
    values: z.infer<typeof UpdatePermissionsSchema>
) => {
    const gate = await assertAdmin()
    if (gate.error || !gate.session) return { error: gate.error ?? "Accès refusé" }
    const session = gate.session

    const parsed = UpdatePermissionsSchema.safeParse(values)
    if (!parsed.success) {
        return { error: "Champs invalides" }
    }
    const { userId, permissions } = parsed.data

    // Keep only catalog-valid, de-duplicated permissions — reject anything else.
    const desired = new Set<string>()
    for (const p of permissions) {
        if (isValidPermission(p)) desired.add(p)
    }

    // Resolve caller tenant.
    const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { tenantId: true },
    })
    if (!currentUser?.tenantId) {
        return { error: "Aucun tenant pour l'utilisateur courant" }
    }

    // Load target user, enforce tenant isolation.
    const target = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true, role: true, isSuperadmin: true },
    })
    if (!target || target.tenantId !== currentUser.tenantId) {
        return { error: "Utilisateur introuvable" }
    }

    // ADMIN / superadmin targets always have full access — refuse to store
    // overrides that would be meaningless or dangerous.
    if (target.role === "ADMIN" || target.isSuperadmin) {
        return { error: "Les administrateurs disposent déjà d'un accès complet." }
    }

    // Diff desired vs the role base to compute the minimal override arrays.
    const extraPermissions: string[] = []
    const deniedPermissions: string[] = []
    for (const perm of getAllCatalogPermissions()) {
        const wants = desired.has(perm)
        const roleHas = roleGrants(target.role, perm)
        if (wants && !roleHas) extraPermissions.push(perm)
        else if (!wants && roleHas) deniedPermissions.push(perm)
    }

    try {
        await db.user.update({
            where: { id: userId },
            data: { extraPermissions, deniedPermissions },
        })
        revalidatePath("/users")
        return { success: "Permissions mises à jour" }
    } catch (error) {
        console.error("Failed to update user permissions", error)
        return { error: "Échec de la mise à jour des permissions" }
    }
}

/**
 * Read the target user's role + current effective granular permissions so the
 * admin matrix can pre-check the boxes. Admin-only, tenant-scoped.
 */
export const getUserEffectivePermissions = async (userId: string) => {
    const gate = await assertAdmin()
    if (gate.error || !gate.session) return { error: gate.error ?? "Accès refusé" }
    const session = gate.session

    const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { tenantId: true },
    })
    if (!currentUser?.tenantId) {
        return { error: "Aucun tenant pour l'utilisateur courant" }
    }

    const target = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            tenantId: true,
            role: true,
            isSuperadmin: true,
            extraPermissions: true,
            deniedPermissions: true,
        },
    })
    if (!target || target.tenantId !== currentUser.tenantId) {
        return { error: "Utilisateur introuvable" }
    }

    const isFullAccess = target.role === "ADMIN" || target.isSuperadmin
    const effective = isFullAccess
        ? getAllCatalogPermissions()
        : getEffectiveCatalogPermissions(target.role, target.extraPermissions, target.deniedPermissions)

    return {
        success: true,
        data: {
            role: target.role,
            isFullAccess,
            effective,
        },
    }
}
