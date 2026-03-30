import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/admin/drivers/[driverId]/route — Get GPS trail for a driver
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ driverId: string }> }
) {
    try {
        const user = verifyMobileAuth(req);
        if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
        }

        const { driverId } = await params;
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");

        const date = dateStr ? new Date(dateStr) : new Date();
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get GPS trail for the day
        const locations = await db.driverLocation.findMany({
            where: {
                driverId,
                tenantId: user.tenantId,
                createdAt: { gte: date, lt: nextDay },
            },
            select: {
                latitude: true,
                longitude: true,
                speed: true,
                heading: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        // Get the driver info
        const driver = await db.user.findFirst({
            where: { id: driverId, tenantId: user.tenantId },
            select: { name: true, phone: true },
        });

        // Calculate total distance
        let totalKm = 0;
        for (let i = 1; i < locations.length; i++) {
            const prev = locations[i - 1];
            const curr = locations[i];
            totalKm += haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
        }

        return NextResponse.json({
            driver,
            date: date.toISOString().split("T")[0],
            locations,
            totalPoints: locations.length,
            totalKm: Math.round(totalKm * 10) / 10,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
