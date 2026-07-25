"use server"

import { auth } from "@/auth"
import {
    resolvePermission,
    getEffectiveCatalogPermissions,
    getAllCatalogPermissions,
    type Module,
    type Action,
    type Permission,
} from "@/lib/permissions"

/**
 * Role-Based Access Control (RBAC) — Granular Permission System.
 *
 * Permissions follow the format: "module:action"
 * - module: pos, sales, products, customers, etc.
 * - action: read, create, update, delete, export
 *
 * Wildcards: "module:*" = all actions on a module, "*:*" = full access
 *
 * ADMIN has full access. Superadmin bypasses all checks.
 *
 * Per-user overrides (managed by admins via the Users → Permissions UI) layer
 * on top of the role: `extraPermissions` grant beyond the role, and
 * `deniedPermissions` revoke from it. Deny always wins. The pure resolution
 * logic and the permission catalog live in `@/lib/permissions` (no "use server"),
 * so they can be shared with client components.
 *
 * NOTE: this file carries the "use server" directive, so every export MUST be
 * an async function. The shared types/catalog live in `@/lib/permissions`;
 * import them from there (a "use server" file cannot re-export types).
 */

// ─── Public API ───────────────────────────────────────────────

/**
 * Check if the current user has a specific permission.
 * Returns true for superadmins and ADMINs regardless of role.
 *
 * Applies per-user overrides: denied permissions win, then role grants, then
 * extra (granted) permissions. Accepts both legacy format ("products") and new
 * format ("products:delete").
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
    const session = await auth()
    if (!session?.user) return false
    if (session.user.isSuperadmin || session.user.role === "ADMIN") return true

    const role = session.user.role || "CASHIER"
    const extra = (session.user as { extraPermissions?: string[] }).extraPermissions ?? []
    const denied = (session.user as { deniedPermissions?: string[] }).deniedPermissions ?? []

    return resolvePermission(role, extra, denied, permission)
}

/**
 * Guard function — throws if user lacks permission.
 * Use at the start of server actions:
 *   await requirePermission("treasury:create")
 */
export async function requirePermission(permission: Permission): Promise<void> {
    const allowed = await hasPermission(permission)
    if (!allowed) {
        throw new Error(`Accès refusé. Permission "${permission}" requise.`)
    }
}

/**
 * Get all effective granular permissions for the current user.
 * Superadmins/ADMINs get the full catalog; others get role + overrides.
 */
export async function getUserPermissions(): Promise<string[]> {
    const session = await auth()
    if (!session?.user) return []
    if (session.user.isSuperadmin || session.user.role === "ADMIN") {
        return getAllCatalogPermissions()
    }

    const role = session.user.role || "CASHIER"
    const extra = (session.user as { extraPermissions?: string[] }).extraPermissions ?? []
    const denied = (session.user as { deniedPermissions?: string[] }).deniedPermissions ?? []
    return getEffectiveCatalogPermissions(role, extra, denied)
}

/**
 * Check if user can perform a specific action on a module.
 * More explicit than hasPermission for new code.
 *
 * Usage: if (await canDo("products", "delete")) { ... }
 */
export async function canDo(module: Module, action: Action): Promise<boolean> {
    return hasPermission(`${module}:${action}`)
}

/**
 * Get all available roles and their descriptions.
 * Useful for user management UI.
 */
export async function getAvailableRoles(): Promise<{ value: string; label: string; description: string }[]> {
    return [
        { value: "ADMIN", label: "Administrateur", description: "Accès complet à toutes les fonctionnalités" },
        { value: "MANAGER", label: "Gérant", description: "Gestion complète sauf suppression de produits et transactions" },
        { value: "PURCHASE_MANAGER", label: "Gestionnaire Achat", description: "Gestion exclusive des achats, fournisseurs et stock" },
        { value: "SALES_MANAGER", label: "Gestionnaire Vente", description: "Gestion exclusive des ventes, POS, clients et commissions" },
        { value: "CASHIER", label: "Caissier", description: "POS, ventes, clients et clôture de caisse" },
        { value: "VENDEUR", label: "Vendeur", description: "Comme caissier avec accès commissions" },
        { value: "ACCOUNTANT", label: "Comptable", description: "Finances, rapports, fiscal et trésorerie" },
        { value: "STOCK_MANAGER", label: "Magasinier", description: "Achats, stock, produits et transferts" },
    ]
}
