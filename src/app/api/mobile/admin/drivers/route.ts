import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { mobileErrorResponse, verifyMobileAuth } from "@/lib/mobile-auth";
import { auth } from "@/auth";

// GET /api/mobile/admin/drivers — Get all drivers with their latest status (admin only)
export async function GET(req: NextRequest) {
    try {
        let user: any = verifyMobileAuth(req);
        
        if (!user) {
            const session = await auth();
            if (session?.user) {
                user = {
                    userId: session.user.id!,
                    tenantId: (session.user as any).tenantId,
                    email: session.user.email!,
                    name: session.user.name!,
                    role: (session.user as any).role,
                };
            }
        }

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

        const driverIds = drivers.map(d => d.id);

        // Batch 1: Latest locations
        const latestLocations = await db.driverLocation.findMany({
            where: { tenantId: user.tenantId, driverId: { in: driverIds } },
            distinct: ['driverId'],
            orderBy: { createdAt: "desc" },
        });
        const locationsMap = new Map(latestLocations.map(l => [l.driverId, l]));

        // Batch 2: Today's tours
        const todayTours = await db.deliveryTour.findMany({
            where: {
                tenantId: user.tenantId,
                driverId: { in: driverIds },
                date: { gte: today, lt: tomorrow },
            },
            include: {
                stops: {
                    select: { status: true, paymentAmount: true, returnAmount: true },
                },
                _count: { select: { stops: true } },
            },
            orderBy: { createdAt: "desc" } // get the latest if multiple
        });
        const toursMap = new Map();
        for (const t of todayTours) {
            if (!toursMap.has(t.driverId)) toursMap.set(t.driverId, t);
        }

        // Batch 3: Sales counts per driver
        const salesCounts = await db.salesOrder.groupBy({
            by: ['userId'],
            where: {
                tenantId: user.tenantId,
                source: "MOBILE",
                createdAt: { gte: today, lt: tomorrow },
            },
            _count: true,
        });
        const salesCountMap = new Map(salesCounts.map(s => [s.userId, s._count]));

        const driverData = drivers.map((driver) => {
                const latestLocation = locationsMap.get(driver.id);
                const todayTour = toursMap.get(driver.id);
                const todaySales = salesCountMap.get(driver.id) || 0;

                const stops = todayTour?.stops || [];
                const visited = stops.filter((s: any) =>
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
                        totalCollected: stops.reduce((s: number, st: any) => s + (st.paymentAmount || 0), 0),
                        totalReturns: stops.reduce((s: number, st: any) => s + (st.returnAmount || 0), 0),
                    } : null,
                    salesCount: todaySales,
                };
            });

        return NextResponse.json({
            drivers: driverData,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
