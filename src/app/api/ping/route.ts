import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
    const start = Date.now()
    let dbStatus = "ok"
    let dbLatencyMs = 0

    try {
        await db.$queryRaw`SELECT 1`
        dbLatencyMs = Date.now() - start
    } catch (e) {
        dbStatus = "error"
    }

    const status = dbStatus === "ok" ? "healthy" : "degraded"

    return NextResponse.json(
        {
            status,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            db: { status: dbStatus, latencyMs: dbLatencyMs },
            version: process.env.npm_package_version || "1.0.0",
            env: process.env.NODE_ENV,
        },
        { status: status === "healthy" ? 200 : 503 }
    )
}
