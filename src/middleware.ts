import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

// Routes that are always accessible (no license required)
const PUBLIC_PATHS = [
    "/activate",
    "/api/license",
    "/api/health",
    "/_next",
    "/favicon.ico",
]

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Always allow public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return intlMiddleware(request)
    }

    // Only enforce licensing in local mode (SYNCLOUDPOS_MODE !== "cloud")
    const isCloud = process.env.SYNCLOUDPOS_MODE === "cloud"

    if (!isCloud && process.env.MACHINE_ID) {
        // Quick check: does a license file exist?
        const licenseRes = await fetch(new URL("/api/license/status", request.url))
        if (licenseRes.ok) {
            const data = await licenseRes.json()
            if (!data.license?.valid) {
                const url = request.nextUrl.clone()
                url.pathname = "/activate"
                return NextResponse.redirect(url)
            }
        }
    }

    return intlMiddleware(request)
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/health|api/license).*)",
    ],
}
