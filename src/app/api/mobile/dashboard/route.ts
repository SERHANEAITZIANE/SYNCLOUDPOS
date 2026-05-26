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
                source: "MOBILE",
                createdAt: { gte: today, lt: tomorrow },
            },
            select: { total: true, amountPaid: true, paymentMethod: true },
        });

        const totalSales = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
        const totalCollected = todaySales.reduce((sum, s) => sum + Number(s.amountPaid), 0);

        let cash = 0, check = 0, transfer = 0;
        
        todaySales.forEach(s => {
            const amt = Number(s.amountPaid) || 0;
            if (s.paymentMethod === "CASH") cash += amt;
            else if (s.paymentMethod === "CHECK") check += amt;
            else if (s.paymentMethod === "TRANSFER") transfer += amt;
            else cash += amt; // Default to cash
        });

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
                const pAm = Number(after.paymentAmount) || 0;
                const pMethod = after.paymentMethod || "CASH";
                
                if (pMethod === "CASH") cash += pAm;
                else if (pMethod === "CHECK") check += pAm;
                else if (pMethod === "TRANSFER") transfer += pAm;
                else cash += pAm;
                
                return sum + pAm;
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
                byMethod: { cash, check, transfer }
            },
            distance: {
                totalKm: Math.round(totalKm * 10) / 10,
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
