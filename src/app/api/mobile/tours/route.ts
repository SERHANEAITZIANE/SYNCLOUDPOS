import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/tours — List tours for current driver
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // PLANNED, IN_PROGRESS, COMPLETED
        const dateStr = searchParams.get("date"); // YYYY-MM-DD

        const where: any = {
            tenantId: user.tenantId,
            driverId: user.userId,
        };

        if (status) where.status = status;

        if (dateStr) {
            const date = new Date(dateStr);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.date = { gte: date, lt: nextDay };
        }

        const tours = await db.deliveryTour.findMany({
            where,
            include: {
                stops: {
                    include: {
                        customer: {
                            select: {
                                id: true, name: true, phone: true, address: true,
                                city: true, balance: true, nif: true, rc: true,
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
                                    select: { id: true, name: true, price: true, cost: true, stock: true },
                                },
                            },
                        },
                    },
                },
                _count: { select: { stops: true } },
            },
            orderBy: { date: "desc" },
            take: 20,
        });

        // Format response
        const formatted = tours.map(tour => ({
            ...tour,
            stopsCount: tour._count.stops,
            completedStops: tour.stops.filter(s => s.status === "DELIVERED" || s.status === "ABSENT").length,
            totalSales: tour.stops.reduce((sum, s) => sum + (s.paymentAmount || 0), 0),
            totalReturns: tour.stops.reduce((sum, s) => sum + (s.returnAmount || 0), 0),
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// POST /api/mobile/tours — Create a new tour
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const { name, date, customerIds, notes } = body;

        if (!customerIds?.length) {
            return NextResponse.json({ error: "Au moins 1 client requis" }, { status: 400 });
        }

        const tour = await db.deliveryTour.create({
            data: {
                tenantId: user.tenantId,
                driverId: user.userId,
                name: name || `Tournée ${new Date(date || Date.now()).toLocaleDateString("fr-FR")}`,
                date: date ? new Date(date) : new Date(),
                notes,
                stops: {
                    create: customerIds.map((customerId: string, index: number) => ({
                        customerId,
                        sortOrder: index,
                    })),
                },
            },
            include: {
                stops: {
                    include: {
                        customer: {
                            select: { id: true, name: true, phone: true, address: true, balance: true },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
        });

        return NextResponse.json(tour, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
