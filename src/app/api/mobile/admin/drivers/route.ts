import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse, verifyMobileAuth } from "@/lib/mobile-auth";

// GET /api/mobile/admin/drivers — Get all drivers with their latest status (admin only)
export async function GET(req: NextRequest) {
    try {
        // Allow both mobile JWT and check for admin role
        const user = verifyMobileAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all drivers with their today's tour info and latest GPS
        const drivers = await db.user.findMany({
            where: {
                tenantId: user.tenantId,
                role: { in: ["DRIVER", "CASHIER", "ADMIN", "MANAGER"] },
            },
            select: { id: true, name: true, phone: true, email: true, role: true },
        });

        const driverData = await Promise.all(
            drivers.map(async (driver) => {
                // Latest GPS position
                const latestLocation = await db.driverLocation.findFirst({
                    where: { driverId: driver.id },
                    orderBy: { createdAt: "desc" },
                });

                // Today's tour
                const todayTour = await db.deliveryTour.findFirst({
                    where: {
                        driverId: driver.id,
                        tenantId: user.tenantId,
                        date: { gte: today, lt: tomorrow },
                    },
                    include: {
                        stops: {
                            select: { status: true, paymentAmount: true, returnAmount: true },
                        },
                        _count: { select: { stops: true } },
                    },
                });

                // Today's sales count
                const todaySales = await db.salesOrder.count({
                    where: {
                        tenantId: user.tenantId,
                        notes: { contains: "[Mobile]" },
                        createdAt: { gte: today, lt: tomorrow },
                    },
                });

                const stops = todayTour?.stops || [];
                const visited = stops.filter(s =>
                    ["DELIVERED", "ABSENT", "PARTIAL", "SKIPPED"].includes(s.status)
                ).length;

                return {
                    driver: {
                        id: driver.id,
                        name: driver.name,
                        phone: driver.phone,
                        role: driver.role,
                    },
                    location: latestLocation ? {
                        latitude: latestLocation.latitude,
                        longitude: latestLocation.longitude,
                        speed: latestLocation.speed,
                        heading: latestLocation.heading,
                        source: latestLocation.source,
                        timestamp: latestLocation.createdAt,
                        isRecent: (Date.now() - latestLocation.createdAt.getTime()) < 5 * 60 * 1000, // within 5 min
                    } : null,
                    tour: todayTour ? {
                        id: todayTour.id,
                        name: todayTour.name,
                        status: todayTour.status,
                        totalStops: todayTour._count.stops,
                        visitedStops: visited,
                        progress: todayTour._count.stops > 0
                            ? Math.round((visited / todayTour._count.stops) * 100)
                            : 0,
                        totalCollected: stops.reduce((s, st) => s + (st.paymentAmount || 0), 0),
                        totalReturns: stops.reduce((s, st) => s + (st.returnAmount || 0), 0),
                    } : null,
                    salesCount: todaySales,
                };
            })
        );

        return NextResponse.json({
            drivers: driverData,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
