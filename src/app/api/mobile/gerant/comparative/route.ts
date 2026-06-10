import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

async function getPeriodMetrics(tenantId: string, fromDate: Date, toDate: Date) {
    const [orders, salesOrders, expenses] = await Promise.all([
        db.order.findMany({
            where: { tenantId, status: "COMPLETED", createdAt: { gte: fromDate, lte: toDate } },
            select: {
                total: true,
                items: {
                    select: {
                        quantity: true,
                        price: true,
                        product: { select: { cost: true } }
                    }
                }
            }
        }),
        db.salesOrder.findMany({
            where: { tenantId, status: { not: "CANCELLED" }, createdAt: { gte: fromDate, lte: toDate } },
            select: {
                total: true,
                items: {
                    select: {
                        quantity: true,
                        unitPrice: true,
                        product: { select: { cost: true } }
                    }
                }
            }
        }),
        db.expense.aggregate({
            where: { tenantId, date: { gte: fromDate, lte: toDate } },
            _sum: { amount: true },
        })
    ]);

    const posRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const posProfit = orders.reduce((sum, o) => {
        return sum + o.items.reduce((itemSum, item) => {
            return itemSum + (Number(item.price) - Number(item.product?.cost || 0)) * item.quantity;
        }, 0);
    }, 0);

    const salesRevenue = salesOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const salesProfit = salesOrders.reduce((sum, o) => {
        return sum + o.items.reduce((itemSum, item) => {
            return itemSum + (Number(item.unitPrice) - Number(item.product?.cost || 0)) * item.quantity;
        }, 0);
    }, 0);

    return {
        revenue: Math.round(posRevenue + salesRevenue),
        profit: Math.round(posProfit + salesProfit),
        ordersCount: orders.length + salesOrders.length,
        expenses: Math.round(Number(expenses._sum.amount || 0)),
    };
}

// GET /api/mobile/gerant/comparative
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }
        const tenantId = user.tenantId;

        const { searchParams } = new URL(req.url);
        const range1From = searchParams.get("range1From");
        const range1To = searchParams.get("range1To");
        const range2From = searchParams.get("range2From");
        const range2To = searchParams.get("range2To");

        // Defaults if not provided (Range 1: last 7 days, Range 2: previous 7 days)
        const r1From = range1From ? startOfDay(new Date(range1From)) : startOfDay(subDays(new Date(), 6));
        const r1To = range1To ? endOfDay(new Date(range1To)) : endOfDay(new Date());
        
        const periodMs = r1To.getTime() - r1From.getTime();
        const periodDays = Math.max(1, Math.round(periodMs / (1000 * 60 * 60 * 24)));

        const defaultR2From = new Date(r1From);
        defaultR2From.setDate(defaultR2From.getDate() - periodDays);
        const defaultR2To = new Date(r1From);
        defaultR2To.setSeconds(defaultR2To.getSeconds() - 1);

        const r2From = range2From ? startOfDay(new Date(range2From)) : startOfDay(defaultR2From);
        const r2To = range2To ? endOfDay(new Date(range2To)) : endOfDay(defaultR2To);

        const [metrics1, metrics2] = await Promise.all([
            getPeriodMetrics(tenantId, r1From, r1To),
            getPeriodMetrics(tenantId, r2From, r2To),
        ]);

        return NextResponse.json({
            range1: {
                from: r1From.toISOString().split("T")[0],
                to: r1To.toISOString().split("T")[0],
                ...metrics1,
            },
            range2: {
                from: r2From.toISOString().split("T")[0],
                to: r2To.toISOString().split("T")[0],
                ...metrics2,
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
