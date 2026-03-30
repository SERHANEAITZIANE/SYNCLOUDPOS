import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// PATCH /api/mobile/tours/[id]/stops/[stopId] — Update stop status + actions
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; stopId: string }> }
) {
    try {
        const user = requireMobileAuth(req);
        const { id, stopId } = await params;
        const body = await req.json();

        // Verify tour belongs to user
        const tour = await db.deliveryTour.findFirst({
            where: { id, tenantId: user.tenantId },
        });
        if (!tour) {
            return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
        }

        const {
            status, notes, signatureUrl, photoUrl,
            latitude, longitude,
            salesOrderId, paymentAmount, paymentMethod, returnAmount,
        } = body;

        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === "EN_ROUTE") updateData.arrivedAt = new Date();
            if (["DELIVERED", "ABSENT", "PARTIAL"].includes(status)) {
                updateData.completedAt = new Date();
            }
        }
        if (notes !== undefined) updateData.notes = notes;
        if (signatureUrl) updateData.signatureUrl = signatureUrl;
        if (photoUrl) updateData.photoUrl = photoUrl;
        if (latitude) updateData.latitude = latitude;
        if (longitude) updateData.longitude = longitude;
        if (salesOrderId) updateData.salesOrderId = salesOrderId;
        if (paymentAmount !== undefined) updateData.paymentAmount = paymentAmount;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (returnAmount !== undefined) updateData.returnAmount = returnAmount;

        const stop = await db.tourStop.update({
            where: { id: stopId },
            data: updateData,
            include: {
                customer: {
                    select: { id: true, name: true, balance: true },
                },
            },
        });

        return NextResponse.json(stop);
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
