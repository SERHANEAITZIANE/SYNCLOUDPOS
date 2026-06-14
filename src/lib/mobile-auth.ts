import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export interface MobileUser {
    userId: string;
    tenantId: string;
    email: string;
    name: string;
    role: string;
}

/**
 * Verify JWT token from mobile app request.
 * Returns the decoded user payload or null if invalid.
 */
export function verifyMobileAuth(req: NextRequest): MobileUser | null {
    if (!JWT_SECRET) {
        console.error("[MOBILE_AUTH] ERROR: Neither AUTH_SECRET nor NEXTAUTH_SECRET is configured. Access denied.");
        return null;
    }
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as MobileUser;
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Middleware wrapper: returns 401 if not authenticated.
 */
export function requireMobileAuth(req: NextRequest): MobileUser {
    const user = verifyMobileAuth(req);
    if (!user) {
        throw new UnauthorizedError();
    }
    return user;
}

export class UnauthorizedError extends Error {
    constructor() {
        super("Non authentifié");
    }
}

export function mobileErrorResponse(error: any) {
    if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    console.error("[MOBILE_API]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
