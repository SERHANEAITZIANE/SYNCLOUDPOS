import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const createPrismaClient = () => {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["error", "warn"]
            : ["error"],
        datasourceUrl: process.env.DATABASE_URL,
    })

    // Auto-reconnect on connection drops (common with remote PostgreSQL on VPS)
    client.$connect().catch(() => {
        // Swallow initial connect error - Prisma will retry on next query
    })

    return client
}

export const db = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

