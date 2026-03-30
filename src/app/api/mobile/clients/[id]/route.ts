import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/clients/[id] — Client full detail with history
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireMobileAuth(req);
        const { id } = await params;

        const client = await db.customer.findFirst({
            where: { id, tenantId: user.tenantId },
            include: {
                salesOrders: {
                    select: {
                        id: true, receiptNumber: true, total: true, type: true,
                        paymentMethod: true, paymentStatus: true, createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 30,
                },
                productReturns: {
                    select: {
                        id: true, quantity: true, totalAmount: true, reason: true,
                        status: true, createdAt: true,
                        product: { select: { name: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
            },
        });

        if (!client) {
            return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
        }

        return NextResponse.json({
            ...client,
            balance: Number(client.balance),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
