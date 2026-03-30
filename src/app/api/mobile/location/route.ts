import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/location — Send GPS location update
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const { latitude, longitude, speed, heading, accuracy, source = "PHONE", tourId } = body;

        if (!latitude || !longitude) {
            return NextResponse.json({ error: "Coordonnées GPS requises" }, { status: 400 });
        }

        await db.driverLocation.create({
            data: {
                tenantId: user.tenantId,
                driverId: user.userId,
                latitude,
                longitude,
                speed: speed || null,
                heading: heading || null,
                accuracy: accuracy || null,
                source,
                tourId: tourId || null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// GET /api/mobile/location — Get latest locations of all drivers (admin)
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        // Get the latest location for each driver
        const drivers = await db.user.findMany({
            where: {
                tenantId: user.tenantId,
                role: { in: ["DRIVER", "CASHIER", "ADMIN", "MANAGER"] },
            },
            select: { id: true, name: true, phone: true },
        });

        const locations = await Promise.all(
            drivers.map(async (driver) => {
                const latest = await db.driverLocation.findFirst({
                    where: { driverId: driver.id },
                    orderBy: { createdAt: "desc" },
                });
                return {
                    driver,
                    location: latest ? {
                        latitude: latest.latitude,
                        longitude: latest.longitude,
                        speed: latest.speed,
                        source: latest.source,
                        timestamp: latest.createdAt,
                    } : null,
                };
            })
        );

        return NextResponse.json(locations.filter(l => l.location !== null));
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
