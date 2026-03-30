import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "syncloud-mobile-secret";

// POST /api/mobile/auth/refresh — Refresh access token
export async function POST(req: NextRequest) {
    try {
        const { refreshToken } = await req.json();

        if (!refreshToken) {
            return NextResponse.json({ error: "Refresh token requis" }, { status: 400 });
        }

        const storedToken = await db.mobileRefreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { tenant: true } } },
        });

        if (!storedToken) {
            return NextResponse.json({ error: "Token invalide" }, { status: 401 });
        }

        if (storedToken.expiresAt < new Date()) {
            await db.mobileRefreshToken.delete({ where: { id: storedToken.id } });
            return NextResponse.json({ error: "Token expiré, reconnectez-vous" }, { status: 401 });
        }

        const user = storedToken.user;

        // Generate new access token
        const accessToken = jwt.sign(
            {
                userId: user.id,
                tenantId: user.tenantId,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Rotate refresh token
        const newRefreshToken = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.mobileRefreshToken.update({
            where: { id: storedToken.id },
            data: { token: newRefreshToken, expiresAt },
        });

        return NextResponse.json({
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: 86400,
        });
    } catch (error: any) {
        console.error("[MOBILE_AUTH_REFRESH]", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
