import { NextResponse } from "next/server"
import { verifyLicenseCached } from "@/lib/license"
import { db } from "@/lib/db"

export async function GET() {
    try {
        await db.$queryRaw`SELECT 1`
        const license = verifyLicenseCached()
        return NextResponse.json({ status: "ok", db: "connected", license: license.valid ? "valid" : "invalid" }, { status: 200 })
    } catch {
        return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 })
    }
}
