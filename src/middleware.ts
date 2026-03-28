import { auth } from "@/auth"
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)

// Public routes that don't require authentication
const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/auth",
    "/api/auth",
    "/landing.html",
]

function isPublicPath(pathname: string): boolean {
    if (pathname === "/") return true
    // Strip locale prefix for matching
    const clean = pathname.replace(/^\/(fr|en|ar)/, "") || "/"
    return PUBLIC_PATHS.some(p => clean.startsWith(p))
}

// Simple in-memory login rate limiter (per IP, resets on restart)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 10
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const entry = loginAttempts.get(ip)
    if (!entry || now > entry.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
        return false
    }
    entry.count++
    return entry.count > MAX_LOGIN_ATTEMPTS
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Rate limit login/register endpoints
    const clean = pathname.replace(/^\/(fr|en|ar)/, "") || "/"
    if (clean === "/login" || clean === "/register") {
        if (request.method === "POST") {
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       request.headers.get("x-real-ip") || 
                       "unknown"
            if (isRateLimited(ip)) {
                return NextResponse.json(
                    { error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
                    { status: 429 }
                )
            }
        }
    }

    // Allow public paths without auth
    if (isPublicPath(pathname)) {
        return intlMiddleware(request)
    }

    // Static assets, _next, etc. — skip
    if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname.includes(".")) {
        return NextResponse.next()
    }

    // Protect all dashboard routes
    const session = await auth()
    if (!session?.user) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Blocked tenants: only allow settings page
    if (session.user.isBlocked) {
        if (!clean.startsWith("/settings") && !clean.startsWith("/api")) {
            return NextResponse.redirect(new URL("/settings", request.url))
        }
    }

    // Superadmin routes: restrict to superadmins
    if (clean.startsWith("/superadmin") && !session.user.isSuperadmin) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Add security headers to response
    const response = intlMiddleware(request)
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "SAMEORIGIN")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    
    return response
}

export const config = {
    matcher: [
        // Match all paths except static files
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|css|js)).*)",
    ],
}
