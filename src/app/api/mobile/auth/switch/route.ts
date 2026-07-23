import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
const ACCESS_TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// POST /api/mobile/auth/switch — Switch active tenant for mobile app
export async function POST(req: NextRequest) {
    try {
        if (!JWT_SECRET) {
            console.error("[MOBILE_AUTH_SWITCH] ERROR: Neither AUTH_SECRET nor NEXTAUTH_SECRET is configured.");
            return NextResponse.json({ error: "Configuration du serveur invalide" }, { status: 500 });
        }

        const user = requireMobileAuth(req);
        const { tenantId } = await req.json();

        if (!tenantId) {
            return NextResponse.json({ error: "ID du magasin/locataire requis" }, { status: 400 });
        }

        // Verify user membership in the target tenant
        const membership = await db.tenantUser.findUnique({
            where: {
                userId_tenantId: {
                    userId: user.userId,
                    tenantId: tenantId,
                },
            },
            include: {
                tenant: true,
                user: true,
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Vous n'avez pas accès à ce magasin" }, { status: 403 });
        }

        const targetTenant = membership.tenant;
        const dbUser = membership.user;

        if (targetTenant.isBlocked) {
            return NextResponse.json({ error: "Ce magasin est bloqué. Contactez l'administrateur." }, { status: 403 });
        }

        // Check if role is allowed
        const allowedRoles = ["ADMIN", "MANAGER", "CASHIER", "DRIVER"];
        // For switched tenant, we map TenantUser role to App user role
        const activeRole = membership.role === "ADMIN" ? "ADMIN" : "CASHIER";

        // Generate new JWT access token signed with the switched tenantId
        const accessToken = jwt.sign(
            {
                userId: dbUser.id,
                tenantId: targetTenant.id,
                email: dbUser.email,
                name: dbUser.name,
                role: activeRole,
            },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate and rotate refresh token
        const refreshTokenValue = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        // Clean old tokens for this user
        await db.mobileRefreshToken.deleteMany({
            where: {
                userId: dbUser.id,
            },
        });

        // Create new refresh token linked to the switched tenantId
        await db.mobileRefreshToken.create({
            data: {
                token: refreshTokenValue,
                userId: dbUser.id,
                tenantId: targetTenant.id,
                deviceName: "Mobile Switch",
                expiresAt,
            },
        });

        return NextResponse.json({
            accessToken,
            refreshToken: refreshTokenValue,
            expiresIn: 86400, // 24h
            user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                phone: dbUser.phone,
                role: activeRole,
                tenantId: targetTenant.id,
                tenant: {
                    name: targetTenant.name,
                    logo: targetTenant.logo,
                    phone: targetTenant.phone,
                    address: targetTenant.address,
                },
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
