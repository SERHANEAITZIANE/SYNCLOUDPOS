"use server"

import { db } from "@/lib/db"
import { getActiveTenantId } from "@/actions/get-active-tenant"

export async function saveAiLog(data: {
    provider: string
    model?: string
    prompt: string
    response: string
}) {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { error: "No active tenant" }

        await db.aiLog.create({
            data: {
                tenantId,
                provider: data.provider.toUpperCase(),
                model: data.model || null,
                prompt: data.prompt,
                response: data.response,
            }
        })

        return { success: true }
    } catch (error) {
        console.error("[SAVE_AI_LOG_ERROR]", error)
        return { error: "Failed to save AI log" }
    }
}

export async function getAiLogs(filters?: {
    from?: string
    to?: string
    provider?: string
    page?: number
    pageSize?: number
}) {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { logs: [], total: 0 }

        const page = filters?.page ?? 0
        const pageSize = filters?.pageSize ?? 20

        const where: any = { tenantId }

        if (filters?.from || filters?.to) {
            where.createdAt = {}
            if (filters.from) where.createdAt.gte = new Date(filters.from)
            if (filters.to) {
                const toDate = new Date(filters.to)
                toDate.setHours(23, 59, 59, 999)
                where.createdAt.lte = toDate
            }
        }

        if (filters?.provider && filters.provider !== "ALL") {
            where.provider = filters.provider.toUpperCase()
        }

        const [logs, total] = await Promise.all([
            db.aiLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: page * pageSize,
                take: pageSize,
            }),
            db.aiLog.count({ where })
        ])

        return {
            logs: logs.map(log => ({
                id: log.id,
                provider: log.provider,
                model: log.model,
                prompt: log.prompt,
                response: log.response,
                createdAt: log.createdAt.toISOString(),
            })),
            total
        }
    } catch (error) {
        console.error("[GET_AI_LOGS_ERROR]", error)
        return { logs: [], total: 0 }
    }
}

export async function deleteAiLog(logId: string) {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { error: "No active tenant" }

        await db.aiLog.deleteMany({
            where: { id: logId, tenantId }
        })

        return { success: true }
    } catch (error) {
        console.error("[DELETE_AI_LOG_ERROR]", error)
        return { error: "Failed to delete AI log" }
    }
}

export async function clearAiLogs() {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { error: "No active tenant" }

        await db.aiLog.deleteMany({ where: { tenantId } })

        return { success: true }
    } catch (error) {
        console.error("[CLEAR_AI_LOGS_ERROR]", error)
        return { error: "Failed to clear AI logs" }
    }
}
