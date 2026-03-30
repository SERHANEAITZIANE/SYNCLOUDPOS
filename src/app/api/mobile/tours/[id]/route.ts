import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/tours/[id] — Get tour details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireMobileAuth(req);
        const { id } = await params;

        const tour = await db.deliveryTour.findFirst({
            where: { id, tenantId: user.tenantId },
            include: {
                stops: {
                    include: {
                        customer: {
                            select: {
                                id: true, name: true, phone: true, address: true,
                                city: true, balance: true, nif: true, rc: true,
                                rib: true, clientType: true,
                            },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                },
                truckLoad: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true, name: true, price: true,
                                        cost: true, stock: true, tvaRate: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!tour) {
            return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
        }

        return NextResponse.json(tour);
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// PATCH /api/mobile/tours/[id] — Update tour status
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireMobileAuth(req);
        const { id } = await params;
        const body = await req.json();

        const { status, totalKm, notes } = body;

        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === "IN_PROGRESS") updateData.startedAt = new Date();
            if (status === "COMPLETED") updateData.completedAt = new Date();
        }
        if (totalKm !== undefined) updateData.totalKm = totalKm;
        if (notes !== undefined) updateData.notes = notes;

        const tour = await db.deliveryTour.update({
            where: { id, tenantId: user.tenantId },
            data: updateData,
        });

        return NextResponse.json(tour);
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
