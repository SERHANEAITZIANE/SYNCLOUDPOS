import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

// GET /api/mobile/gerant/performance — Staff performance metrics
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period") || "today"; // today, week, month

        let fromDate: Date;
        const toDate = endOfDay(new Date());

        switch (period) {
            case "week":
                fromDate = startOfDay(subDays(new Date(), 7));
                break;
            case "month":
                fromDate = startOfDay(subDays(new Date(), 30));
                break;
            default:
                fromDate = startOfDay(new Date());
                break;
        }

        // Resolve default store
        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        // ── Cashier Performance ─────────────────────────────────────
        const [ordersByUser, salesByUser] = await Promise.all([
            db.order.groupBy({
                by: ["userId"],
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { total: true, paidAmount: true },
                _count: { id: true },
                _max: { total: true },
            }),
            db.salesOrder.groupBy({
                by: ["userId"],
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: fromDate, lte: toDate },
                    userId: { not: null },
                },
                _sum: { total: true, amountPaid: true },
                _count: { id: true },
                _max: { total: true },
            }),
        ]);

        // Fetch user names for all involved users
        const allUserIds = Array.from(new Set([
            ...ordersByUser.map(o => o.userId),
            ...salesByUser.filter(s => s.userId).map(s => s.userId as string),
        ]));

        const users = allUserIds.length > 0
            ? await db.user.findMany({
                where: { id: { in: allUserIds } },
                select: { id: true, name: true, email: true, role: true },
            })
            : [];

        const userMap = new Map(users.map(u => [u.id, { name: u.name || u.email || "Inconnu", role: u.role }]));

        // Merge POS orders and BL sales per user
        const performanceMap = new Map<string, {
            userId: string;
            userName: string;
            role: string;
            posOrders: number;
            posRevenue: number;
            posCash: number;
            blOrders: number;
            blRevenue: number;
            blCash: number;
            maxTicket: number;
        }>();

        ordersByUser.forEach(o => {
            const info = userMap.get(o.userId) || { name: "Inconnu", role: "UNKNOWN" };
            const existing = performanceMap.get(o.userId) || {
                userId: o.userId,
                userName: info.name,
                role: info.role,
                posOrders: 0, posRevenue: 0, posCash: 0,
                blOrders: 0, blRevenue: 0, blCash: 0,
                maxTicket: 0,
            };
            existing.posOrders = o._count.id;
            existing.posRevenue = Number(o._sum.total || 0);
            existing.posCash = Number(o._sum.paidAmount || 0);
            existing.maxTicket = Math.max(existing.maxTicket, Number(o._max.total || 0));
            performanceMap.set(o.userId, existing);
        });

        salesByUser.forEach(s => {
            if (!s.userId) return;
            const info = userMap.get(s.userId) || { name: "Inconnu", role: "UNKNOWN" };
            const existing = performanceMap.get(s.userId) || {
                userId: s.userId,
                userName: info.name,
                role: info.role,
                posOrders: 0, posRevenue: 0, posCash: 0,
                blOrders: 0, blRevenue: 0, blCash: 0,
                maxTicket: 0,
            };
            existing.blOrders = s._count.id;
            existing.blRevenue = Number(s._sum.total || 0);
            existing.blCash = Number(s._sum.amountPaid || 0);
            existing.maxTicket = Math.max(existing.maxTicket, Number(s._max.total || 0));
            performanceMap.set(s.userId, existing);
        });

        // Build final metrics
        const staffMetrics = Array.from(performanceMap.values()).map(p => {
            const totalOrders = p.posOrders + p.blOrders;
            const totalRevenue = p.posRevenue + p.blRevenue;
            const totalCash = p.posCash + p.blCash;
            const totalCredit = totalRevenue - totalCash;

            return {
                userId: p.userId,
                name: p.userName,
                role: p.role,
                totalOrders,
                totalRevenue: Math.round(totalRevenue),
                totalCollected: Math.round(totalCash),
                creditGiven: Math.round(totalCredit),
                avgTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
                maxTicket: Math.round(p.maxTicket),
                breakdown: {
                    pos: { orders: p.posOrders, revenue: Math.round(p.posRevenue) },
                    bl: { orders: p.blOrders, revenue: Math.round(p.blRevenue) },
                },
            };
        });

        // Sort by total revenue descending
        staffMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

        // ── Summary ─────────────────────────────────────────────────
        const totalTeamRevenue = staffMetrics.reduce((s, m) => s + m.totalRevenue, 0);
        const totalTeamOrders = staffMetrics.reduce((s, m) => s + m.totalOrders, 0);
        const bestPerformer = staffMetrics[0] || null;

        return NextResponse.json({
            period: {
                from: fromDate.toISOString().split("T")[0],
                to: toDate.toISOString().split("T")[0],
                label: period,
            },
            summary: {
                staffCount: staffMetrics.length,
                totalRevenue: totalTeamRevenue,
                totalOrders: totalTeamOrders,
                avgRevenuePerStaff: staffMetrics.length > 0 ? Math.round(totalTeamRevenue / staffMetrics.length) : 0,
                bestPerformer: bestPerformer ? {
                    name: bestPerformer.name,
                    revenue: bestPerformer.totalRevenue,
                    orders: bestPerformer.totalOrders,
                } : null,
            },
            staff: staffMetrics,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
