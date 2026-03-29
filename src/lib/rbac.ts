"use server"

import { auth } from "@/auth"

/**
 * Role-Based Access Control (RBAC) permission map.
 * Defines which roles can access which modules.
 * ADMIN has full access. Superadmin bypasses all checks.
 */

export type Permission =
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

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    ADMIN: [
        "pos", "sales", "purchases", "expenses", "products", "categories", "brands",
        "promotions", "customers", "suppliers", "treasury", "analytics", "reports",
        "settings", "users", "fiscal", "audit_log", "delivery", "commissions",
        "reservations", "daily_close", "inventory", "recurring_invoices", "payments",
        "emprunt", "emprunt_fournisseur", "ai", "spoilage"
    ],
    MANAGER: [
        "pos", "sales", "purchases", "expenses", "products", "categories", "brands",
        "promotions", "customers", "suppliers", "treasury", "analytics", "reports",
        "delivery", "commissions", "reservations", "daily_close", "inventory",
        "recurring_invoices", "payments", "emprunt", "emprunt_fournisseur", "spoilage"
    ],
    CASHIER: [
        "pos", "sales", "products", "customers", "payments", "daily_close",
        "reservations", "emprunt"
    ],
    VENDEUR: [
        "pos", "sales", "products", "customers", "payments", "daily_close",
        "reservations", "emprunt"
    ],
    ACCOUNTANT: [
        "sales", "purchases", "expenses", "customers", "suppliers", "treasury",
        "analytics", "reports", "fiscal", "commissions", "recurring_invoices",
        "payments", "emprunt", "emprunt_fournisseur", "inventory", "daily_close"
    ],
    STOCK_MANAGER: [
        "purchases", "products", "categories", "brands", "promotions", "suppliers",
        "delivery", "inventory", "spoilage", "emprunt_fournisseur"
    ],
}

/**
 * Check if the current user has a specific permission.
 * Returns true for superadmins regardless of role.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
    const session = await auth()
    if (!session?.user) return false
    if (session.user.isSuperadmin) return true

    const role = session.user.role || "CASHIER"
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["CASHIER"]
    return permissions.includes(permission)
}

/**
 * Guard function — throws if user lacks permission.
 * Use at the start of server actions:
 *   await requirePermission("treasury")
 */
export async function requirePermission(permission: Permission): Promise<void> {
    const allowed = await hasPermission(permission)
    if (!allowed) {
        throw new Error(`Accès refusé. Permission "${permission}" requise.`)
    }
}

/**
 * Get all permissions for the current user's role.
 */
export async function getUserPermissions(): Promise<Permission[]> {
    const session = await auth()
    if (!session?.user) return []
    if (session.user.isSuperadmin) return ROLE_PERMISSIONS["ADMIN"]

    const role = session.user.role || "CASHIER"
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["CASHIER"]
}
