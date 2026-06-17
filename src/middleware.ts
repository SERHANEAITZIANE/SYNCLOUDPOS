import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)

// Edge-compatible auth (no Prisma)
const { auth } = NextAuth(authConfig)

// Public routes that don't require authentication
const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/auth",
    "/api/auth",
    "/api/webhooks",
    "/api/migrate-transactions",
    "/api/mobile",
    "/landing.html",
    "/manifest.json",
    "/manifest.webmanifest",
    "/sw.js",
    "/features",
    "/apps",
    "/usecases",
    "/pricing",
    "/contact",
]

function isPublicPath(pathname: string): boolean {
    if (pathname === "/") return true
    // Strip locale prefix for matching
    const clean = pathname.replace(/^\/(fr|en|ar)/, "") || "/"
    if (clean === "/") return true
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

function addCorsHeaders(response: NextResponse, origin: string | null) {
    response.headers.set("Access-Control-Allow-Origin", origin || "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Access-Control-Max-Age", "86400")
    return response
}

export default auth(async function middleware(request) {
    const { pathname } = request.nextUrl
    const clean = pathname.replace(/^\/(fr|en|ar)/, "") || "/"
    const origin = request.headers.get("origin")

    // Handle CORS preflight options
    if (clean.startsWith("/api/mobile") && request.method === "OPTIONS") {
        const response = new NextResponse(null, { status: 204 })
        return addCorsHeaders(response, origin)
    }

    // Static assets, public uploads, _next files, manifest, sw.js - bypass authentication and middleware entirely
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/uploads") ||
        pathname.includes(".") ||
        pathname === "/sw.js" ||
        pathname === "/favicon.ico" ||
        clean === "/manifest.json" ||
        clean === "/manifest.webmanifest" ||
        clean === "/sw.js"
    ) {
        return NextResponse.next()
    }

    // API routes bypass intlMiddleware
    if (clean.startsWith("/api")) {
        // Rate limit login/register endpoints
        if (clean === "/api/auth/callback/credentials" || clean === "/api/register") {
            if (request.method === "POST") {
                const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                           request.headers.get("x-real-ip") || 
                           "unknown"
                if (isRateLimited(ip)) {
                    const res = NextResponse.json(
                        { error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
                        { status: 429 }
                    )
                    if (clean.startsWith("/api/mobile")) addCorsHeaders(res, origin)
                    return res
                }
            }
        }

        // Public API routes
        if (isPublicPath(pathname)) {
            const res = NextResponse.next()
            if (clean.startsWith("/api/mobile")) addCorsHeaders(res, origin)
            return res
        }

        // Protected API routes
        if (!request.auth?.user) {
            const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            if (clean.startsWith("/api/mobile")) addCorsHeaders(res, origin)
            return res
        }

        const res = NextResponse.next()
        if (clean.startsWith("/api/mobile")) addCorsHeaders(res, origin)
        return res
    }

    // Rate limit page login/register endpoints
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

    // Allow public paths without auth (Pages)
    if (isPublicPath(pathname)) {
        return intlMiddleware(request)
    }

    // Protect all dashboard routes - session is injected by NextAuth wrapper
    if (!request.auth?.user && !isPublicPath(pathname)) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = "/login"
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Blocked tenants: only allow settings page
    if (request.auth?.user?.isBlocked && !clean.startsWith("/settings")) {
        const settingsUrl = request.nextUrl.clone()
        settingsUrl.pathname = "/settings"
        return NextResponse.redirect(settingsUrl)
    }

    // Superadmin routes: restrict to superadmins
    if (clean.startsWith("/superadmin") && !request.auth?.user?.isSuperadmin) {
        const dashUrl = request.nextUrl.clone()
        dashUrl.pathname = "/dashboard"
        return NextResponse.redirect(dashUrl)
    }

    // Static assets, public uploads, _next files
    if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname.includes(".")) {
        return NextResponse.next()
    }

    // For everything else, rely on next-intl middleware
    const response = intlMiddleware(request)
    
    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "SAMEORIGIN")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(self)")

    // Content Security Policy
    response.headers.set("Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://graph.facebook.com https://*.googleapis.com https://*.tile.openstreetmap.org; " +
      "frame-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self';"
    )
    
    return response
})

export const config = {
    matcher: [
        // Match all paths except static files
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|css|js)).*)",
    ],
}
