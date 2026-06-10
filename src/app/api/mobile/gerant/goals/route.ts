import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;

        // Resolve default store
        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        const now = new Date();
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);

        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));

        // 1. Current month actuals
        const thisMonthPOS = await db.order.aggregate({
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: "COMPLETED",
                createdAt: { gte: startOfThisMonth, lte: endOfThisMonth }
            },
            _sum: { total: true }
        });

        const thisMonthBL = await db.salesOrder.aggregate({
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: { in: ["PAID", "PARTIAL", "PENDING"] },
                createdAt: { gte: startOfThisMonth, lte: endOfThisMonth }
            },
            _sum: { total: true }
        });

        const thisMonthExpenses = await db.expense.aggregate({
            where: {
                tenantId,
                date: { gte: startOfThisMonth, lte: endOfThisMonth }
            },
            _sum: { amount: true }
        });

        const posItemsThisMonth = await db.orderItem.findMany({
            where: {
                order: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: startOfThisMonth, lte: endOfThisMonth }
                }
            },
            select: { quantity: true, price: true, product: { select: { cost: true } } }
        });

        const blItemsThisMonth = await db.salesOrderItem.findMany({
            where: {
                salesOrder: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: startOfThisMonth, lte: endOfThisMonth }
                }
            },
            select: { quantity: true, unitPrice: true, product: { select: { cost: true } } }
        });

        const thisMonthRevenue = Number(thisMonthPOS._sum.total || 0) + Number(thisMonthBL._sum.total || 0);
        let thisMonthCOGS = 0;
        posItemsThisMonth.forEach(item => {
            thisMonthCOGS += item.quantity * Number(item.product?.cost || 0);
        });
        blItemsThisMonth.forEach(item => {
            thisMonthCOGS += item.quantity * Number(item.product?.cost || 0);
        });

        const thisMonthProfit = thisMonthRevenue - thisMonthCOGS;

        // 2. Last month actuals
        const lastMonthPOS = await db.order.aggregate({
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: "COMPLETED",
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
            },
            _sum: { total: true }
        });

        const lastMonthBL = await db.salesOrder.aggregate({
            where: {
                tenantId,
                storeId: storeId || undefined,
                status: { in: ["PAID", "PARTIAL", "PENDING"] },
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
            },
            _sum: { total: true }
        });

        const lastMonthExpenses = await db.expense.aggregate({
            where: {
                tenantId,
                date: { gte: startOfLastMonth, lte: endOfLastMonth }
            },
            _sum: { amount: true }
        });

        const posItemsLastMonth = await db.orderItem.findMany({
            where: {
                order: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
                }
            },
            select: { quantity: true, price: true, product: { select: { cost: true } } }
        });

        const blItemsLastMonth = await db.salesOrderItem.findMany({
            where: {
                salesOrder: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
                }
            },
            select: { quantity: true, unitPrice: true, product: { select: { cost: true } } }
        });

        const lastMonthRevenue = Number(lastMonthPOS._sum.total || 0) + Number(lastMonthBL._sum.total || 0);
        let lastMonthCOGS = 0;
        posItemsLastMonth.forEach(item => {
            lastMonthCOGS += item.quantity * Number(item.product?.cost || 0);
        });
        blItemsLastMonth.forEach(item => {
            lastMonthCOGS += item.quantity * Number(item.product?.cost || 0);
        });

        const lastMonthProfit = lastMonthRevenue - lastMonthCOGS;

        return NextResponse.json({
            actuals: {
                revenue: Math.round(thisMonthRevenue),
                profit: Math.round(thisMonthProfit),
                expenses: Math.round(Number(thisMonthExpenses._sum.amount || 0)),
            },
            lastMonth: {
                revenue: Math.round(lastMonthRevenue),
                profit: Math.round(lastMonthProfit),
                expenses: Math.round(Number(lastMonthExpenses._sum.amount || 0)),
            },
            daysRemaining: endOfThisMonth.getDate() - now.getDate() + 1,
            daysInMonth: endOfThisMonth.getDate(),
        });
    } catch (e: any) {
        return mobileErrorResponse(e);
    }
}
