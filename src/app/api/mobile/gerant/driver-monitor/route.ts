import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay } from "date-fns";

// GET /api/mobile/gerant/driver-monitor — Daily driver/livreur performance
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        const from = startOfDay(targetDate);
        const to = endOfDay(targetDate);

        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        // Get all drivers (users with DRIVER role or delivery persons)
        const drivers = await db.user.findMany({
            where: {
                tenantId,
                OR: [
                    { role: "DRIVER" },
                    { role: "DELIVERY" },
                    { salesOrders: { some: { tenantId, createdAt: { gte: from, lte: to } } } },
                ],
            },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                salesOrders: {
                    where: {
                        tenantId,
                        storeId: storeId || undefined,
                        createdAt: { gte: from, lte: to },
                    },
                    select: {
                        id: true,
                        total: true,
                        amountPaid: true,
                        status: true,
                        type: true,
                        customerId: true,
                        items: {
                            select: {
                                quantity: true,
                                unitPrice: true,
                            },
                        },
                    },
                },
            },
            take: 50,
        });

        // Also get sales orders grouped by driver/assignee for this day
        const salesByDriver = await db.salesOrder.groupBy({
            by: ["userId"],
            where: {
                tenantId,
                storeId: storeId || undefined,
                createdAt: { gte: from, lte: to },
                userId: { not: null },
            },
            _sum: { total: true, amountPaid: true },
            _count: { id: true },
        });

        const driverStatsMap = new Map(
            salesByDriver.map((s: any) => [s.userId, s])
        );

        // Returns for this day
        const returnsByDriver = await db.salesOrder.groupBy({
            by: ["userId"],
            where: {
                tenantId,
                storeId: storeId || undefined,
                createdAt: { gte: from, lte: to },
                type: "CREDIT_NOTE",
                userId: { not: null },
            },
            _sum: { total: true },
        });
        const returnsMap = new Map<string, number>(
            returnsByDriver.map((r: any) => [r.userId as string, Number(r._sum.total || 0)])
        );

        // Unique clients visited
        const clientsByDriver = await db.salesOrder.groupBy({
            by: ["userId", "customerId"],
            where: {
                tenantId,
                storeId: storeId || undefined,
                createdAt: { gte: from, lte: to },
                userId: { not: null },
            },
        });
        const clientsVisitedMap = new Map<string, Set<string>>();
        clientsByDriver.forEach((row: any) => {
            if (!clientsVisitedMap.has(row.userId)) {
                clientsVisitedMap.set(row.userId, new Set());
            }
            clientsVisitedMap.get(row.userId)!.add(row.customerId);
        });

        const COMMISSION_RATE = 0.03;

        const driverData = drivers.map((driver: any) => {
            const stats = driverStatsMap.get(driver.id);
            const revenue = Number(stats?._sum?.total || 0);
            const collections = Number(stats?._sum?.amountPaid || 0);
            const blCount = stats?._count?.id || driver.salesOrders.length;
            const returns = returnsMap.get(driver.id) || 0;
            const commission = Math.round((revenue - returns) * COMMISSION_RATE);
            const clientsVisited = clientsVisitedMap.get(driver.id)?.size || 0;

            // Determine status based on last activity
            const lastOrder = driver.salesOrders[driver.salesOrders.length - 1];
            const minutesSinceLastActivity = lastOrder
                ? (Date.now() - new Date(lastOrder.createdAt || Date.now()).getTime()) / 60000
                : 999;

            let status: "active" | "done" | "delayed" = "done";
            if (minutesSinceLastActivity < 60) status = "active";
            else if (blCount === 0 && minutesSinceLastActivity > 120) status = "delayed";

            const lastPingMins = Math.round(minutesSinceLastActivity);
            const lastPing = lastPingMins < 60
                ? `Il y a ${lastPingMins} min`
                : `Il y a ${Math.round(lastPingMins / 60)}h`;

            return {
                id: driver.id,
                name: driver.name || "Livreur",
                phone: driver.phone || null,
                zone: "Tournée du jour",
                blCount,
                revenue: Math.round(revenue),
                returns: Math.round(returns),
                collections: Math.round(collections),
                commission,
                clientsVisited,
                clientsPlanned: Math.max(clientsVisited, blCount),
                status,
                lastPing,
            };
        });

        const totalRevenue = driverData.reduce((s: number, d: any) => s + d.revenue, 0);
        const totalBLs = driverData.reduce((s: number, d: any) => s + d.blCount, 0);
        const totalCommissions = driverData.reduce((s: number, d: any) => s + d.commission, 0);
        const totalCollections = driverData.reduce((s: number, d: any) => s + d.collections, 0);

        return NextResponse.json({
            drivers: driverData,
            summary: { totalRevenue, totalBLs, totalCommissions, totalCollections },
            date: targetDate.toISOString().split("T")[0],
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
