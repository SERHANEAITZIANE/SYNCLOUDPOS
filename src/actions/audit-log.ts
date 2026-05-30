"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

/**
 * Log an audit event. Fire-and-forget — never throws, never blocks the caller.
 */
export async function logAudit(params: {
    action: string
    entity: string
    entityId?: string
    description?: string
    before?: any
    after?: any
}) {
    try {
        const session = await auth()
        if (!session?.user?.tenantId) return

        await db.auditLog.create({
            data: {
                tenantId: session.user.tenantId,
                userId: session.user.id || null,
                userName: session.user.name || null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId || null,
                description: params.description || null,
                before: params.before ? JSON.stringify(params.before) : null,
                after: params.after ? JSON.stringify(params.after) : null,
            }
        })
    } catch (error) {
        // Never throw — audit logging must not break business logic
        console.error("[AuditLog] Failed to log:", error)
    }
}

/**
 * Fetch audit logs for the current tenant (admin only)
 */
export async function getAuditLogs(options?: {
    entity?: string
    limit?: number
    offset?: number
}) {
    const session = await auth()
    if (!session?.user?.tenantId) return []
    if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) return []

    const logs = await db.auditLog.findMany({
        where: {
            tenantId: session.user.tenantId,
            ...(options?.entity ? { entity: options.entity } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: options?.limit || 100,
        skip: options?.offset || 0,
    })

    return logs
}
