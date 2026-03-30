import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/dashboard — Daily summary for driver
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's tours
        const tours = await db.deliveryTour.findMany({
            where: {
                tenantId: user.tenantId,
                driverId: user.userId,
                date: { gte: today, lt: tomorrow },
            },
            include: {
                stops: true,
                _count: { select: { stops: true } },
            },
        });

        // Calculate stats
        const allStops = tours.flatMap(t => t.stops);
        const totalClients = allStops.length;
        const visitedClients = allStops.filter(s =>
            ["DELIVERED", "ABSENT", "PARTIAL", "SKIPPED"].includes(s.status)
        ).length;
        const deliveredClients = allStops.filter(s => s.status === "DELIVERED").length;
        const absentClients = allStops.filter(s => s.status === "ABSENT").length;

        // Today's sales
        const todaySales = await db.salesOrder.findMany({
            where: {
                tenantId: user.tenantId,
                notes: { contains: "[Mobile]" },
                createdAt: { gte: today, lt: tomorrow },
            },
            select: { total: true, amountPaid: true },
        });

        const totalSales = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
        const totalCollected = todaySales.reduce((sum, s) => sum + Number(s.amountPaid), 0);

        // Today's returns
        const todayReturns = await db.productReturn.findMany({
            where: {
                tenantId: user.tenantId,
                driverId: user.userId,
                createdAt: { gte: today, lt: tomorrow },
            },
            select: { totalAmount: true },
        });

        const totalReturns = todayReturns.reduce((sum, r) => sum + r.totalAmount, 0);

        // Today's standalone payments (from audit log)
        const paymentLogs = await db.auditLog.findMany({
            where: {
                tenantId: user.tenantId,
                userId: user.userId,
                entity: "PAYMENT",
                action: "CREATE",
                createdAt: { gte: today, lt: tomorrow },
            },
        });

        const standalonePayments = paymentLogs.reduce((sum, log) => {
            try {
                const after = JSON.parse(log.after || "{}");
                return sum + (after.paymentAmount || 0);
            } catch { return sum; }
        }, 0);

        // GPS distance estimate
        const totalKm = tours.reduce((sum, t) => sum + t.totalKm, 0);

        return NextResponse.json({
            date: today.toISOString().split("T")[0],
            tours: {
                total: tours.length,
                active: tours.filter(t => t.status === "IN_PROGRESS").length,
                completed: tours.filter(t => t.status === "COMPLETED").length,
            },
            clients: {
                total: totalClients,
                visited: visitedClients,
                delivered: deliveredClients,
                absent: absentClients,
                remaining: totalClients - visitedClients,
                progressPercent: totalClients > 0 ? Math.round((visitedClients / totalClients) * 100) : 0,
            },
            financials: {
                totalSales,
                totalCollected: totalCollected + standalonePayments,
                totalReturns,
                netAmount: totalSales - totalReturns,
            },
            distance: {
                totalKm: Math.round(totalKm * 10) / 10,
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
