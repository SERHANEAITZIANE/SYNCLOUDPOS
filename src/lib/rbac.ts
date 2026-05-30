"use server"

import { auth } from "@/auth"

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
 */

// ─── Permission Types ─────────────────────────────────────────

export type Module =
    | "pos"
    | "sales"
    | "purchases"
    | "expenses"
    | "products"
    | "categories"
    | "brands"
    | "promotions"
    | "customers"
    | "suppliers"
    | "treasury"
    | "analytics"
    | "reports"
    | "settings"
    | "users"
    | "fiscal"
    | "audit_log"
    | "delivery"
    | "commissions"
    | "reservations"
    | "daily_close"
    | "inventory"
    | "recurring_invoices"
    | "payments"
    | "emprunt"
    | "emprunt_fournisseur"
    | "ai"
    | "spoilage"
    | "transfers"
    | "cheques"

export type Action = "read" | "create" | "update" | "delete" | "export"

// Legacy Permission type kept for backwards compatibility
export type Permission = Module | `${Module}:${Action}` | `${Module}:*` | "*:*"

// ─── Role Permission Map ──────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    ADMIN: [
        "*:*" // Full access to everything
    ],
    MANAGER: [
        "pos:*", "sales:*", "purchases:*", "expenses:*",
        "products:read", "products:create", "products:update", "products:export",
        // Note: no "products:delete" — managers can't delete products
        "categories:*", "brands:*",
        "promotions:*", "customers:*", "suppliers:*",
        "treasury:read", "treasury:create", "treasury:export",
        // Note: no "treasury:delete" — can't delete transactions
        "analytics:read", "analytics:export",
        "reports:read", "reports:export",
        "delivery:*", "commissions:*",
        "reservations:*", "daily_close:*",
        "inventory:*", "recurring_invoices:*",
        "payments:*",
        "emprunt:*", "emprunt_fournisseur:*",
        "spoilage:*", "transfers:*", "cheques:*",
    ],
    CASHIER: [
        "pos:read", "pos:create",
        "sales:read", "sales:create",
        "products:read",
        "customers:read", "customers:create",
        "payments:read", "payments:create",
        "daily_close:read", "daily_close:create",
        "reservations:read", "reservations:create",
        "emprunt:read", "emprunt:create",
    ],
    VENDEUR: [
        "pos:read", "pos:create",
        "sales:read", "sales:create",
        "products:read",
        "customers:read", "customers:create",
        "payments:read", "payments:create",
        "daily_close:read", "daily_close:create",
        "reservations:read", "reservations:create",
        "emprunt:read", "emprunt:create",
        "commissions:read",
    ],
    ACCOUNTANT: [
        "sales:read", "sales:export",
        "purchases:read", "purchases:export",
        "expenses:read", "expenses:create", "expenses:update", "expenses:export",
        "customers:read", "customers:export",
        "suppliers:read", "suppliers:export",
        "treasury:read", "treasury:create", "treasury:export",
        "analytics:read", "analytics:export",
        "reports:read", "reports:export",
        "fiscal:read", "fiscal:create", "fiscal:export",
        "commissions:read", "commissions:export",
        "recurring_invoices:read", "recurring_invoices:create", "recurring_invoices:update",
        "payments:read", "payments:create", "payments:export",
        "emprunt:read", "emprunt:create", "emprunt:export",
        "emprunt_fournisseur:read", "emprunt_fournisseur:create", "emprunt_fournisseur:export",
        "inventory:read", "inventory:export",
        "daily_close:read", "daily_close:create", "daily_close:export",
        "cheques:read", "cheques:create", "cheques:update", "cheques:export",
    ],
    STOCK_MANAGER: [
        "purchases:read", "purchases:create", "purchases:update",
        "products:read", "products:create", "products:update",
        "categories:read", "categories:create", "categories:update",
        "brands:read", "brands:create", "brands:update",
        "promotions:read", "promotions:create", "promotions:update",
        "suppliers:read", "suppliers:create", "suppliers:update",
        "delivery:read", "delivery:create", "delivery:update",
        "inventory:*",
        "spoilage:*",
        "emprunt_fournisseur:read", "emprunt_fournisseur:create",
        "transfers:*",
    ],
}

// ─── Permission Matching Logic ────────────────────────────────

/**
 * Check if a granted permission matches a requested permission.
 * Supports wildcards: "*:*" matches everything, "module:*" matches any action on that module.
 */
function permissionMatches(granted: Permission, requested: string): boolean {
    // Full wildcard
    if (granted === "*:*") return true

    // Parse granted permission
    const [grantedModule, grantedAction] = granted.includes(":")
        ? granted.split(":")
        : [granted, "*"] // Legacy format "products" → "products:*"

    // Parse requested permission
    const [requestedModule, requestedAction] = requested.includes(":")
        ? requested.split(":")
        : [requested, "read"] // Legacy format "products" → "products:read"

    // Module must match
    if (grantedModule !== "*" && grantedModule !== requestedModule) return false

    // Action must match (or granted is wildcard)
    if (grantedAction !== "*" && grantedAction !== requestedAction) return false

    return true
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Check if the current user has a specific permission.
 * Returns true for superadmins regardless of role.
 * 
 * Accepts both legacy format ("products") and new format ("products:delete").
 * Legacy "products" is treated as "products:read" for backwards compatibility.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
    const session = await auth()
    if (!session?.user) return false
    if (session.user.isSuperadmin) return true

    const role = session.user.role || "CASHIER"
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["CASHIER"]

    return permissions.some(p => permissionMatches(p, permission))
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
 * Get all permissions for the current user's role.
 * Returns the raw permission strings for the role.
 */
export async function getUserPermissions(): Promise<Permission[]> {
    const session = await auth()
    if (!session?.user) return []
    if (session.user.isSuperadmin) return ROLE_PERMISSIONS["ADMIN"]

    const role = session.user.role || "CASHIER"
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["CASHIER"]
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
        { value: "CASHIER", label: "Caissier", description: "POS, ventes, clients et clôture de caisse" },
        { value: "VENDEUR", label: "Vendeur", description: "Comme caissier avec accès commissions" },
        { value: "ACCOUNTANT", label: "Comptable", description: "Finances, rapports, fiscal et trésorerie" },
        { value: "STOCK_MANAGER", label: "Magasinier", description: "Achats, stock, produits et transferts" },
    ]
}
