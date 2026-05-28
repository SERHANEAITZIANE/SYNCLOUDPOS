import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

/**
 * GET /api/mobile/settings/caisses
 * Returns all treasury accounts (caisses) for the tenant
 */
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        const accounts = await db.treasuryAccount.findMany({
            where: { tenantId: user.tenantId },
            select: {
                id: true,
                name: true,
                type: true,
                balance: true,
            },
            orderBy: { name: "asc" }
        });

        // Convert balance from Decimal to number for JSON response
        const formattedAccounts = accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balance: Number(acc.balance),
        }));

        return NextResponse.json({
            success: true,
            caisses: formattedAccounts
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}
