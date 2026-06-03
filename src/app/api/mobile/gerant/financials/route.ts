import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns";

// GET /api/mobile/gerant/financials — Deep financial breakdown with date range
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { searchParams } = new URL(req.url);
        const fromStr = searchParams.get("from");
        const toStr = searchParams.get("to");
        const period = searchParams.get("period") || "today"; // today, week, month, custom

        let fromDate: Date;
        let toDate: Date = endOfDay(new Date());

        if (fromStr && toStr) {
            fromDate = startOfDay(new Date(fromStr));
            toDate = endOfDay(new Date(toStr));
        } else {
            switch (period) {
                case "week":
                    fromDate = startOfDay(subDays(new Date(), 7));
                    break;
                case "month":
                    fromDate = startOfDay(subDays(new Date(), 30));
                    break;
                case "quarter":
                    fromDate = startOfDay(subDays(new Date(), 90));
                    break;
                default: // today
                    fromDate = startOfDay(new Date());
                    break;
            }
        }

        // Resolve default store
        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        // ── Parallel queries ────────────────────────────────────────
        const [
            posAgg,
            salesAgg,
            expensesAgg,
            purchasesAgg,
            // Revenue by payment method
            cashOrders,
            checkOrders,
            transferOrders,
            // Top products
            topProductsData,
            // Revenue trend
            ordersForChart,
            salesForChart,
            expensesForChart,
            // COGS
            posItemsSum,
            salesItemsSum,
        ] = await Promise.all([
            // POS revenue
            db.order.aggregate({
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { total: true, paidAmount: true },
                _count: { id: true },
            }),
            // BL/Sales revenue
            db.salesOrder.aggregate({
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { total: true, amountPaid: true },
                _count: { id: true },
            }),
            // Expenses
            db.expense.aggregate({
                where: { tenantId, date: { gte: fromDate, lte: toDate } },
                _sum: { amount: true },
                _count: { id: true },
            }),
            // Purchases
            db.purchaseOrder.aggregate({
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: { in: ["FACTURE", "BON_LIVRAISON", "COMPLETED", "PAID"] },
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { total: true },
                _count: { id: true },
            }),
            // Revenue by payment method — cash
            db.order.aggregate({
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: "COMPLETED", paymentMethod: "CASH",
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { paidAmount: true },
            }),
            // Revenue by payment method — check
            db.order.aggregate({
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: "COMPLETED", paymentMethod: "CHECK",
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { paidAmount: true },
            }),
            // Revenue by payment method — transfer
            db.order.aggregate({
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: "COMPLETED", paymentMethod: "TRANSFER",
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { paidAmount: true },
            }),
            // Top selling products
            db.orderItem.groupBy({
                by: ["productId"],
                where: {
                    order: {
                        tenantId, storeId: storeId || undefined,
                        status: "COMPLETED",
                        createdAt: { gte: fromDate, lte: toDate },
                    },
                },
                _sum: { quantity: true, price: true },
                orderBy: { _sum: { price: "desc" } },
                take: 10,
            }),
            // Revenue chart — orders
            db.order.groupBy({
                by: ["createdAt"],
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { total: true },
            }),
            // Revenue chart — sales
            db.salesOrder.groupBy({
                by: ["createdAt"],
                where: {
                    tenantId, storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: fromDate, lte: toDate },
                },
                _sum: { total: true },
            }),
            // Revenue chart — expenses
            db.expense.groupBy({
                by: ["date"],
                where: { tenantId, date: { gte: fromDate, lte: toDate } },
                _sum: { amount: true },
            }),
            // COGS: POS items
            db.orderItem.groupBy({
                by: ["productId"],
                where: {
                    order: {
                        tenantId, storeId: storeId || undefined,
                        status: "COMPLETED",
                        createdAt: { gte: fromDate, lte: toDate },
                    },
                },
                _sum: { quantity: true },
            }),
            // COGS: Sales items
            db.salesOrderItem.groupBy({
                by: ["productId"],
                where: {
                    salesOrder: {
                        tenantId, storeId: storeId || undefined,
                        status: "PAID",
                        createdAt: { gte: fromDate, lte: toDate },
                    },
                },
                _sum: { quantity: true },
            }),
        ]);

        // ── Compute high-level metrics ──────────────────────────────
        const posRevenue = Number(posAgg._sum.total || 0);
        const salesRevenue = Number(salesAgg._sum.total || 0);
        const totalRevenue = posRevenue + salesRevenue;
        const totalCollected = Number(posAgg._sum.paidAmount || 0) + Number(salesAgg._sum.amountPaid || 0);
        const totalExpenses = Number(expensesAgg._sum.amount || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);

        // ── COGS Calculation ────────────────────────────────────────
        const productIds = Array.from(new Set([
            ...posItemsSum.map(i => i.productId),
            ...salesItemsSum.map(i => i.productId),
        ]));

        const productsCost = productIds.length > 0
            ? await db.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, cost: true },
            })
            : [];

        const costMap = new Map(productsCost.map(p => [p.id, Number(p.cost || 0)]));

        let totalCOGS = 0;
        posItemsSum.forEach(i => { totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0); });
        salesItemsSum.forEach(i => { totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0); });

        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = totalRevenue - totalCOGS - totalExpenses;
        const marginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

        // ── Top Products ────────────────────────────────────────────
        const topProductIds = topProductsData.map(tp => tp.productId);
        const topProductNames = topProductIds.length > 0
            ? await db.product.findMany({
                where: { id: { in: topProductIds } },
                select: { id: true, name: true, cost: true },
            })
            : [];
        const productNameMap = new Map(topProductNames.map(p => [p.id, { name: p.name, cost: Number(p.cost || 0) }]));

        const topProducts = topProductsData.map(tp => {
            const prod = productNameMap.get(tp.productId);
            const revenue = Number(tp._sum.price || 0) * (tp._sum.quantity || 0);
            const cost = (prod?.cost || 0) * (tp._sum.quantity || 0);
            return {
                name: prod?.name || "Inconnu",
                quantity: tp._sum.quantity || 0,
                revenue: Math.round(revenue),
                profit: Math.round(revenue - cost),
            };
        });

        // ── Revenue Trend ───────────────────────────────────────────
        const revenueMap = new Map<string, { revenue: number; expenses: number }>();
        const days = eachDayOfInterval({ start: fromDate, end: toDate });
        days.forEach(day => {
            revenueMap.set(format(day, "yyyy-MM-dd"), { revenue: 0, expenses: 0 });
        });

        ordersForChart.forEach(o => {
            const dateStr = format(o.createdAt, "yyyy-MM-dd");
            if (revenueMap.has(dateStr)) {
                revenueMap.get(dateStr)!.revenue += Number(o._sum.total || 0);
            }
        });
        salesForChart.forEach(o => {
            const dateStr = format(o.createdAt, "yyyy-MM-dd");
            if (revenueMap.has(dateStr)) {
                revenueMap.get(dateStr)!.revenue += Number(o._sum.total || 0);
            }
        });
        expensesForChart.forEach(e => {
            const dateStr = format(e.date, "yyyy-MM-dd");
            if (revenueMap.has(dateStr)) {
                revenueMap.get(dateStr)!.expenses += Number(e._sum.amount || 0);
            }
        });

        const trend = Array.from(revenueMap.entries()).map(([date, vals]) => ({
            date,
            revenue: Math.round(vals.revenue),
            expenses: Math.round(vals.expenses),
            profit: Math.round(vals.revenue - vals.expenses),
        }));

        return NextResponse.json({
            period: {
                from: fromDate.toISOString().split("T")[0],
                to: toDate.toISOString().split("T")[0],
                label: period,
            },
            summary: {
                totalRevenue: Math.round(totalRevenue),
                posRevenue: Math.round(posRevenue),
                blRevenue: Math.round(salesRevenue),
                totalCollected: Math.round(totalCollected),
                totalCredit: Math.round(totalRevenue - totalCollected),
                totalExpenses: Math.round(totalExpenses),
                totalPurchases: Math.round(totalPurchases),
                totalCOGS: Math.round(totalCOGS),
                grossProfit: Math.round(grossProfit),
                netProfit: Math.round(netProfit),
                marginPct,
                ordersCount: posAgg._count.id,
                salesCount: salesAgg._count.id,
                avgTicket: (posAgg._count.id + salesAgg._count.id) > 0
                    ? Math.round(totalRevenue / (posAgg._count.id + salesAgg._count.id))
                    : 0,
            },
            byPaymentMethod: {
                cash: Math.round(Number(cashOrders._sum.paidAmount || 0)),
                check: Math.round(Number(checkOrders._sum.paidAmount || 0)),
                transfer: Math.round(Number(transferOrders._sum.paidAmount || 0)),
            },
            topProducts,
            trend,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
