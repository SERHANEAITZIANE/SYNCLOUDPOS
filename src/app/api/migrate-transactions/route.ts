import { NextResponse } from "next/server"

/**
 * Historical data migrations must run through deployment tooling, never through
 * a public application route. Keep the route non-operational for old clients.
 */
export async function GET() {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
}
