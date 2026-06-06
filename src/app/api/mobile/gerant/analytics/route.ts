import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }
        const tenantId = user.tenantId;
        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period") || "today"; // today | week | month

        const now = new Date();
        let startDate: Date;
        let endDate = now;

        if (period === "today") {
            startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        } else if (period === "week") {
            startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(now); startDate.setDate(1); startDate.setHours(0, 0, 0, 0);
        }

        const orders = await db.salesOrder.findMany({
            where: { tenantId, createdAt: { gte: startDate, lte: endDate }, status: { in: ["VALIDATED", "PAID"] } },
            select: {
                id: true, createdAt: true, total: true, customerId: true,
                items: { select: { productId: true, quantity: true, unitPrice: true, product: { select: { name: true } } } },
                customer: { select: { name: true } },
            },
        });

        const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
        const totalOrders = orders.length;

        // Hourly breakdown (for today)
        const hourlyMap: Record<number, number> = {};
        for (let h = 7; h <= 20; h++) hourlyMap[h] = 0;
        if (period === "today") {
            for (const o of orders) {
                const h = o.createdAt.getHours();
                if (h >= 7 && h <= 20) hourlyMap[h] = (hourlyMap[h] || 0) + Number(o.total);
            }
        }

        // Daily breakdown (for week/month)
        const dailyMap: Record<string, number> = {};
        for (const o of orders) {
            const dateKey = o.createdAt.toISOString().split("T")[0];
            dailyMap[dateKey] = (dailyMap[dateKey] || 0) + Number(o.total);
        }

        // Product aggregation
        const productMap: Record<string, { name: string; revenue: number; qty: number }> = {};
        for (const o of orders) {
            for (const item of o.items) {
                if (!productMap[item.productId]) {
                    productMap[item.productId] = { name: item.product.name, revenue: 0, qty: 0 };
                }
                const itemTotal = Number(item.unitPrice) * item.quantity;
                productMap[item.productId].revenue += itemTotal;
                productMap[item.productId].qty += item.quantity;
            }
        }
        const topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);

        // Client aggregation
        const clientMap: Record<string, { name: string; revenue: number; orders: number }> = {};
        for (const o of orders) {
            if (!o.customerId) continue;
            if (!clientMap[o.customerId]) {
                clientMap[o.customerId] = { name: o.customer?.name || "Inconnu", revenue: 0, orders: 0 };
            }
            clientMap[o.customerId].revenue += Number(o.total);
            clientMap[o.customerId].orders += 1;
        }
        const topClients = Object.values(clientMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);

        // Build trend data
        const trend = period === "today"
            ? Object.entries(hourlyMap).map(([h, v]) => ({ label: `${h}h`, value: Math.round(v) }))
            : Object.entries(dailyMap).sort().map(([d, v]) => ({
                label: new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
                value: Math.round(v),
            }));

        // Previous period comparison
        const prevStart = new Date(startDate);
        const periodDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        prevStart.setDate(prevStart.getDate() - periodDays);
        const prevOrders = await db.salesOrder.aggregate({
            where: { tenantId, createdAt: { gte: prevStart, lt: startDate }, status: { in: ["VALIDATED", "PAID"] } },
            _sum: { total: true },
        });
        const prevRevenue = Number(prevOrders._sum.total || 0);
        const comparisonPct = prevRevenue > 0
            ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
            : 0;

        return NextResponse.json({
            period,
            totalRevenue: Math.round(totalRevenue),
            totalOrders,
            avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
            comparisonPct,
            prevRevenue: Math.round(prevRevenue),
            trend,
            topProducts: topProducts.map(p => ({ ...p, revenue: Math.round(p.revenue) })),
            topClients: topClients.map(c => ({ ...c, revenue: Math.round(c.revenue) })),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
