import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/auth/tenants — List all tenants/stores a user belongs to
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        const memberships = await db.tenantUser.findMany({
            where: { userId: user.userId },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        phone: true,
                        address: true,
                    },
                },
            },
            orderBy: {
                tenant: {
                    name: "asc",
                },
            },
        });

        const tenants = memberships.map((m) => ({
            id: m.tenant.id,
            name: m.tenant.name,
            logo: m.tenant.logo,
            phone: m.tenant.phone,
            address: m.tenant.address,
            role: m.role,
        }));

        return NextResponse.json({ tenants });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
