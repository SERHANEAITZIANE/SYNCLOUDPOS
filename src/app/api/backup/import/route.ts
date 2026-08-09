import { NextResponse } from "next/server"

/**
 * Destructive tenant restores are intentionally unavailable over HTTP.
 * Restore validated backups through audited deployment tooling instead.
 */
export async function POST() {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
}
