/**
 * Pure RBAC primitives — types, the role→permission map, the permission
 * catalog, and the matching/effective-permission logic.
 *
 * This module has NO "use server" directive and imports nothing server-only,
 * so it can be used from both server actions (`src/lib/rbac.ts`) and client
 * components (the admin permission-matrix UI). Keep it side-effect free.
 *
 * Permissions follow the format "module:action".
 * Wildcards: "module:*" = all actions on a module, "*:*" = full access.
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

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
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
    PURCHASE_MANAGER: [
        "purchases:*",
        "products:read", "products:create", "products:update",
        "categories:*", "brands:*",
        "suppliers:*",
        "inventory:*",
        "transfers:*",
        "spoilage:*",
        "emprunt_fournisseur:*",
    ],
    SALES_MANAGER: [
        "pos:*",
        "sales:*",
        "products:read",
        "customers:*",
        "payments:*",
        "daily_close:*",
        "reservations:*",
        "delivery:*",
        "commissions:*",
        "emprunt:*",
        "cheques:*",
    ],
}

// ─── Permission Catalog (single source of truth for the UI) ───

/**
 * Every module the permission editor exposes, with a human label (French,
 * matching the app UI) and the list of actions that make sense for it.
 * The admin permission-matrix UI and server-side validation both read this,
 * so there is exactly one place to add a module or action.
 */
export const PERMISSION_CATALOG: {
    module: Module
    label: string
    actions: Action[]
}[] = [
    { module: "pos", label: "Point de vente (POS)", actions: ["read", "create", "update", "delete"] },
    { module: "sales", label: "Ventes / Factures", actions: ["read", "create", "update", "delete", "export"] },
    { module: "purchases", label: "Achats", actions: ["read", "create", "update", "delete", "export"] },
    { module: "expenses", label: "Dépenses", actions: ["read", "create", "update", "delete", "export"] },
    { module: "products", label: "Produits", actions: ["read", "create", "update", "delete", "export"] },
    { module: "categories", label: "Catégories", actions: ["read", "create", "update", "delete"] },
    { module: "brands", label: "Marques", actions: ["read", "create", "update", "delete"] },
    { module: "promotions", label: "Promotions", actions: ["read", "create", "update", "delete"] },
    { module: "customers", label: "Clients", actions: ["read", "create", "update", "delete", "export"] },
    { module: "suppliers", label: "Fournisseurs", actions: ["read", "create", "update", "delete", "export"] },
    { module: "treasury", label: "Trésorerie", actions: ["read", "create", "update", "delete", "export"] },
    { module: "analytics", label: "Analytique", actions: ["read", "export"] },
    { module: "reports", label: "Rapports", actions: ["read", "export"] },
    { module: "settings", label: "Paramètres", actions: ["read", "update"] },
    { module: "users", label: "Utilisateurs", actions: ["read", "create", "update", "delete"] },
    { module: "fiscal", label: "Fiscal (G50/G12)", actions: ["read", "create", "export"] },
    { module: "audit_log", label: "Journal d'audit", actions: ["read", "export"] },
    { module: "delivery", label: "Livraison", actions: ["read", "create", "update", "delete"] },
    { module: "commissions", label: "Commissions", actions: ["read", "create", "update", "export"] },
    { module: "reservations", label: "Réservations", actions: ["read", "create", "update", "delete"] },
    { module: "daily_close", label: "Clôture de caisse", actions: ["read", "create", "export"] },
    { module: "inventory", label: "Inventaire / Stock", actions: ["read", "create", "update", "export"] },
    { module: "recurring_invoices", label: "Factures récurrentes", actions: ["read", "create", "update", "delete"] },
    { module: "payments", label: "Paiements", actions: ["read", "create", "update", "export"] },
    { module: "emprunt", label: "Emprunts clients", actions: ["read", "create", "update", "export"] },
    { module: "emprunt_fournisseur", label: "Emprunts fournisseurs", actions: ["read", "create", "update", "export"] },
    { module: "ai", label: "Assistant IA", actions: ["read", "create"] },
    { module: "spoilage", label: "Avaries / Pertes", actions: ["read", "create", "update", "delete"] },
    { module: "transfers", label: "Transferts de stock", actions: ["read", "create", "update", "delete"] },
    { module: "cheques", label: "Chèques", actions: ["read", "create", "update", "export"] },
]

/** Flat set of every valid "module:action" string in the catalog. */
const VALID_PERMISSION_SET = new Set<string>(
    PERMISSION_CATALOG.flatMap(m => m.actions.map(a => `${m.module}:${a}`))
)

/** Returns true if a "module:action" string is part of the catalog. */
export function isValidPermission(permission: string): boolean {
    return VALID_PERMISSION_SET.has(permission)
}

/** Every granular "module:action" the catalog defines. */
export function getAllCatalogPermissions(): string[] {
    return Array.from(VALID_PERMISSION_SET)
}

// ─── Matching Logic ───────────────────────────────────────────

/**
 * Check if a granted permission matches a requested permission.
 * Supports wildcards: "*:*" matches everything, "module:*" matches any action.
 */
export function permissionMatches(granted: Permission | string, requested: string): boolean {
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

// ─── Role & Effective Permission Helpers ──────────────────────

/** Raw permission list for a role (falls back to CASHIER for unknown roles). */
export function getRoleBasePermissions(role: string | null | undefined): Permission[] {
    if (!role) return ROLE_PERMISSIONS["CASHIER"]
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["CASHIER"]
}

/** Does the role, by itself (ignoring overrides), grant this permission? */
export function roleGrants(role: string | null | undefined, permission: string): boolean {
    return getRoleBasePermissions(role).some(p => permissionMatches(p, permission))
}

/**
 * The core decision: does a user with this role + override arrays have the
 * requested permission? Deny wins over any grant.
 *
 * ADMIN / superadmin short-circuits are handled by callers (rbac.ts) — this
 * function is the pure role-vs-override resolver.
 */
export function resolvePermission(
    role: string | null | undefined,
    extraPermissions: string[] | null | undefined,
    deniedPermissions: string[] | null | undefined,
    requested: string,
): boolean {
    const denied = deniedPermissions ?? []
    if (denied.some(p => permissionMatches(p, requested))) return false

    if (roleGrants(role, requested)) return true

    const extra = extraPermissions ?? []
    return extra.some(p => permissionMatches(p, requested))
}

/**
 * Materialize the effective granular permission set (catalog-scoped) for a
 * user, given their role and overrides. Used by the admin UI to pre-check the
 * matrix. Wildcards in the role are expanded against the catalog.
 */
export function getEffectiveCatalogPermissions(
    role: string | null | undefined,
    extraPermissions: string[] | null | undefined,
    deniedPermissions: string[] | null | undefined,
): string[] {
    return getAllCatalogPermissions().filter(perm =>
        resolvePermission(role, extraPermissions, deniedPermissions, perm)
    )
}
