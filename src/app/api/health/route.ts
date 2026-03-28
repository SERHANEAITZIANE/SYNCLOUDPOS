import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    try {
        await db.$queryRaw`SELECT 1`
        return NextResponse.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
                heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
            },
            db: "connected",
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json({
            status: "error",
            timestamp: new Date().toISOString(),
            db: "disconnected",
            error: error instanceof Error ? error.message : "Unknown",
        }, { status: 503 })
    }
}
