import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    try {
        // Check DB connectivity
        await db.$queryRaw`SELECT 1`
        return NextResponse.json({ status: "ok", db: "connected" }, { status: 200 })
    } catch {
        return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 })
    }
}
