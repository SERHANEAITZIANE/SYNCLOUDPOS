import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
const ACCESS_TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// POST /api/mobile/auth — Login for mobile app
export async function POST(req: NextRequest) {
    try {
        if (!JWT_SECRET) {
            console.error("[MOBILE_AUTH] ERROR: Neither AUTH_SECRET nor NEXTAUTH_SECRET is configured. Mobile login disabled.");
            return NextResponse.json({ error: "Configuration du serveur invalide" }, { status: 500 });
        }

        const { email, password, deviceName } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { tenant: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
        }

        // Check if tenant is blocked
        if (user.tenant.isBlocked) {
            return NextResponse.json({ error: "Compte bloqué. Contactez l'administrateur." }, { status: 403 });
        }

        // Check role — only ADMIN, MANAGER, or DRIVER can use mobile app
        const allowedRoles = ["ADMIN", "MANAGER", "CASHIER", "DRIVER"];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: "Rôle non autorisé pour l'app mobile" }, { status: 403 });
        }

        // Generate JWT access token
        const accessToken = jwt.sign(
            {
                userId: user.id,
                tenantId: user.tenantId,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token
        const refreshTokenValue = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        // Clean old tokens for this user+device
        await db.mobileRefreshToken.deleteMany({
            where: {
                userId: user.id,
                ...(deviceName ? { deviceName } : {}),
            },
        });

        // Create new refresh token
        await db.mobileRefreshToken.create({
            data: {
                token: refreshTokenValue,
                userId: user.id,
                tenantId: user.tenantId,
                deviceName: deviceName || "Unknown Device",
                expiresAt,
            },
        });

        return NextResponse.json({
            accessToken,
            refreshToken: refreshTokenValue,
            expiresIn: 86400, // 24h in seconds
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                tenantId: user.tenantId,
                tenant: {
                    name: user.tenant.name,
                    logo: user.tenant.logo,
                    phone: user.tenant.phone,
                    address: user.tenant.address,
                },
            },
        });
    } catch (error: any) {
        console.error("[MOBILE_AUTH]", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
