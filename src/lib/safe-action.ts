"use server"

import { auth } from "@/auth"
import { hasPermission, type Permission } from "@/lib/rbac"
import { logAudit } from "@/actions/audit-log"
import * as z from "zod"

/**
 * Safe Action Wrapper — Combines auth, permission, validation, and audit logging.
 * 
 * Usage:
 *   export const deleteProduct = safeAction(
 *     ProductDeleteSchema,
 *     "products:delete",
 *     "DELETE", "PRODUCT",
 *     async (data, session) => {
 *       await db.product.delete({ where: { id: data.id, tenantId: session.user.tenantId } });
 *       return { success: true };
 *     }
 *   );
 * 
 * This wrapper automatically:
 * 1. Validates the session exists and is not blocked
 * 2. Checks the user has the required permission
 * 3. Validates and sanitizes input using the Zod schema
 * 4. Executes the handler
 * 5. Logs the action to the audit trail
 */

interface SafeSession {
    user: {
        id: string
        name?: string | null
        email?: string | null
        tenantId: string
        role: string
        defaultStoreId?: string | null
        isSuperadmin?: boolean
        isBlocked?: boolean
    }
}

/**
 * Deep sanitize all string values in an object to prevent XSS.
 */
function deepSanitize<T>(obj: T): T {
    if (typeof obj === "string") {
        // Strip HTML tags and common injection patterns
        return obj
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, "")
            .replace(/javascript:/gi, "")
            .replace(/on\w+\s*=/gi, "")
            .trim() as T
    }
    if (Array.isArray(obj)) {
        return obj.map(deepSanitize) as T
    }
    if (obj && typeof obj === "object" && !(obj instanceof Date)) {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
            result[key] = deepSanitize(value)
        }
        return result as T
    }
    return obj
}

/**
 * Create a safe server action with built-in auth, permissions, validation, and audit logging.
 * 
 * @param schema - Zod schema for input validation
 * @param permission - Required permission (e.g., "products:delete")
 * @param auditAction - Action name for audit log (e.g., "DELETE")
 * @param auditEntity - Entity name for audit log (e.g., "PRODUCT")
 * @param handler - The actual business logic function
 */
export function safeAction<TSchema extends z.ZodSchema>(
    schema: TSchema,
    permission: Permission,
    auditAction: string,
    auditEntity: string,
    handler: (
        data: z.infer<TSchema>,
        session: SafeSession
    ) => Promise<{ success?: string; error?: string; data?: any } | any>
) {
    return async (rawInput: z.infer<TSchema>) => {
        const startTime = Date.now()

        // 1. Auth check
        const session = await auth()
        if (!session?.user?.id || !session?.user?.tenantId) {
            return { error: "Non autorisé. Veuillez vous reconnecter." }
        }

        // 2. Blocked tenant check
        if (session.user.isBlocked) {
            return { error: "Votre compte est bloqué. Contactez l'administrateur." }
        }

        // 3. Permission check
        const allowed = await hasPermission(permission)
        if (!allowed) {
            logAudit({
                action: `${auditAction}_DENIED`,
                entity: auditEntity,
                description: `Permission "${permission}" refusée pour ${session.user.name || session.user.email}`,
            }).catch(() => null)
            return { error: `Accès refusé. Permission "${permission}" requise.` }
        }

        // 4. Validate input
        const parsed = schema.safeParse(rawInput)
        if (!parsed.success) {
            const errors = parsed.error.issues.map(i => i.message).join(", ")
            return { error: `Données invalides: ${errors}` }
        }

        // 5. Sanitize all string inputs
        const sanitized = deepSanitize(parsed.data)

        // 6. Execute handler
        try {
            const result = await handler(sanitized, session as SafeSession)
            const duration = Date.now() - startTime

            // 7. Auto-log success
            logAudit({
                action: auditAction,
                entity: auditEntity,
                entityId: result?.data?.id || result?.orderId || undefined,
                description: `${auditAction} ${auditEntity} — ${duration}ms`,
            }).catch(() => null)

            return result
        } catch (error: any) {
            const duration = Date.now() - startTime

            // 8. Auto-log failure
            logAudit({
                action: `${auditAction}_FAILED`,
                entity: auditEntity,
                description: `${auditAction} ${auditEntity} échoué: ${error.message?.slice(0, 200)} — ${duration}ms`,
            }).catch(() => null)

            console.error(`[SafeAction] ${auditAction} ${auditEntity} failed:`, error)

            // Return user-friendly error messages
            if (error?.code === "P2002") {
                return { error: "Un conflit a été détecté. Un enregistrement similaire existe déjà." }
            }
            if (error?.code === "P2025") {
                return { error: "L'enregistrement n'a pas été trouvé. Il a peut-être été supprimé." }
            }
            if (error?.message?.includes("abonnement") || error?.message?.includes("bloqué")) {
                return { error: error.message }
            }

            return { error: "Une erreur est survenue. Veuillez réessayer." }
        }
    }
}
