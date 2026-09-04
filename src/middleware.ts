import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import createMiddleware from "next-intl/middleware"
import { NextResponse } from "next/server"
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
    "/api/health",
    "/api/mobile",
    "/api/ping",
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
    return PUBLIC_PATHS.some(p => clean === p || clean.startsWith(`${p}/`))
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

function getAllowedCorsOrigins(): string[] {
    const configured = process.env.MOBILE_ALLOWED_ORIGINS
        ?.split(",")
        .map(origin => origin.trim())
        .filter(Boolean) || []

    for (const appUrl of [process.env.AUTH_URL, process.env.NEXTAUTH_URL]) {
        if (appUrl) {
            try {
                configured.push(new URL(appUrl).origin)
            } catch {
                // Ignore malformed deployment URLs.
            }
        }
    }

    return [...new Set(configured)]
}

function isAllowedCorsOrigin(origin: string | null): boolean {
    // Native mobile requests normally do not send an Origin header.
    return !origin || getAllowedCorsOrigins().includes(origin)
}

function addCorsHeaders(response: NextResponse, origin: string | null) {
    if (origin && isAllowedCorsOrigin(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin)
        response.headers.set("Vary", "Origin")
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.set("Access-Control-Max-Age", "86400")
    return response
}

export default auth(async function middleware(request) {
    const { pathname } = request.nextUrl
    const clean = pathname.replace(/^\/(fr|en|ar)/, "") || "/"
    const origin = request.headers.get("origin")

    if (clean.startsWith("/api/mobile") && !isAllowedCorsOrigin(origin)) {
        return NextResponse.json({ error: "Origin not allowed" }, { status: 403 })
    }

    // Handle CORS preflight options
    if (clean.startsWith("/api/mobile") && request.method === "OPTIONS") {
        const response = new NextResponse(null, { status: 204 })
        return addCorsHeaders(response, origin)
    }

    // Static assets, public uploads, _next files, manifest, sw.js - bypass authentication and middleware entirely
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/uploads") ||
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
        if (clean === "/api/auth/callback/credentials" || clean === "/api/register" || clean === "/api/mobile/auth") {
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

    // For everything else, rely on next-intl middleware
    const response = intlMiddleware(request)
    
    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "SAMEORIGIN")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(self)")

    // Content Security Policy
    //
    // script-src still carries 'unsafe-inline', which is what removes CSP's main
    // XSS protection (PROJECT_AUDIT.md, finding L-2). Replacing it requires
    // nonce plumbing through next/script and Next's own inline bootstrap, which
    // must be verified against a running app — getting it wrong yields a blank
    // page with no server-side error. It is deliberately left as-is here rather
    // than changed blind.
    //
    // form-action and frame-ancestors are added: both are safe (all forms post
    // to same-origin routes or server actions, and frame-ancestors simply
    // restates the existing X-Frame-Options: SAMEORIGIN in modern form).
    response.headers.set("Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://graph.facebook.com https://*.googleapis.com https://*.tile.openstreetmap.org; " +
      "frame-src 'self'; " +
      "frame-ancestors 'self'; " +
      "form-action 'self'; " +
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
