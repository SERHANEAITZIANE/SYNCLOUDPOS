"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns"

export async function getAnalyticsData(dateRange?: { from: Date; to: Date }) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const tenantId = session.user.tenantId;
        const toDate = dateRange?.to || new Date();
        const fromDate = dateRange?.from || subDays(toDate, 30);

        // ─── OPTIMIZED AGGREGATIONS (PARALLELIZED) ───────────────────────

        const [
            posAgg, salesAgg, expensesAgg, purchasesAgg,
            posItemsSum, salesItemsSum,
            debtorsAgg, topDebtors, lowStockProducts,
            recentOrdersRaw,
            ordersForChart, salesForChart, expensesForChart,
            topCustomersData
        ] = await Promise.all([
            // 1. Total Revenue & Cash (Orders)
            db.order.aggregate({
                where: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                _sum: { total: true, paidAmount: true },
                _count: { id: true }
            }),
            // 2. Total Revenue & Cash (SalesOrders)
            db.salesOrder.aggregate({
                where: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                _sum: { total: true },
                _count: { id: true }
            }),
            // 3. Total Expenses
            db.expense.aggregate({
                where: { tenantId, date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                _sum: { amount: true }
            }),
            // 4. Total Purchases
            db.purchaseOrder.aggregate({
                where: { tenantId, status: { in: ["COMPLETED", "PAID", "DELIVERED", "PENDING"] }, createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                _sum: { total: true }
            }),
            // 5. COGS: Pos items sum
            db.orderItem.groupBy({
                by: ['productId'],
                where: { order: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
                _sum: { quantity: true }
            }),
            // 6. COGS: Sales items sum
            db.salesOrderItem.groupBy({
                by: ['productId'],
                where: { salesOrder: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
                _sum: { quantity: true }
            }),
            // 7. Debtors aggregate
            db.customer.aggregate({
                where: { tenantId, balance: { lt: 0 } },
                _sum: { balance: true }
            }),
            // 8. Top debtors
            db.customer.findMany({
                where: { tenantId, balance: { lt: 0 } },
                select: { id: true, name: true, balance: true },
                orderBy: { balance: 'asc' },
                take: 5
            }),
            // 9. Low stock products
            db.product.findMany({
                where: { tenantId, isArchived: false, stock: { lte: 10 } },
                select: { id: true, name: true, stock: true, minStock: true },
                orderBy: { stock: 'asc' },
                take: 50
            }),
            // 10. Recent Orders
            db.order.findMany({
                where: { tenantId, status: "COMPLETED" },
                include: { customer: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 8
            }),
            // 11-13. Revenue over time charts
            db.order.findMany({
                where: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                select: { createdAt: true, total: true }
            }),
            db.salesOrder.findMany({
                where: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                select: { createdAt: true, total: true }
            }),
            db.expense.findMany({
                where: { tenantId, date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                select: { date: true, amount: true }
            }),
            // 14. Top customers data
            db.order.groupBy({
                by: ['customerId'],
                where: { tenantId, status: "COMPLETED", customerId: { not: null }, createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                _sum: { total: true },
                orderBy: { _sum: { total: 'desc' } },
                take: 5
            })
        ]);

        // Compute high-level metrics
        const posRevenue = Number(posAgg._sum.total || 0);
        const invoiceRevenue = Number(salesAgg._sum.total || 0);
        const totalRevenue = posRevenue + invoiceRevenue;

        const posCash = Number(posAgg._sum.paidAmount || 0);
        const invoiceCash = Number(salesAgg._sum.total || 0);
        const cashCollected = posCash + invoiceCash;

        const totalExpenses = Number(expensesAgg._sum.amount || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);
        const ordersCount = posAgg._count.id;
        const salesCount = salesAgg._count.id;

        // ─── DEPENDENT QUERIES ───────────────────────

        const productIds = Array.from(new Set([
            ...posItemsSum.map(i => i.productId),
            ...salesItemsSum.map(i => i.productId)
        ]));

        const customerIds = topCustomersData.map(tc => tc.customerId).filter(Boolean) as string[];

        const [productsCost, topCustomersDetails] = await Promise.all([
            db.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, cost: true }
            }),
            db.customer.findMany({
                where: { id: { in: customerIds } },
                select: { id: true, name: true }
            })
        ]);

        const costMap = new Map(productsCost.map(p => [p.id, Number(p.cost || 0)]));

        let totalCOGS = 0;
        posItemsSum.forEach(i => totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0));
        salesItemsSum.forEach(i => totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0));


        const netProfit = totalRevenue - totalExpenses - totalCOGS;

        // ─── POST-PROCESSING ──────────────────────────────────

        const outstandingDebt = Math.abs(Number(debtorsAgg._sum.balance || 0));
        const formattedDebtors = topDebtors.map(c => ({ id: c.id, name: c.name, balance: Math.abs(Number(c.balance)) }));

        const lowStock = lowStockProducts
            .filter(p => p.stock <= p.minStock)
            .slice(0, 8);

        const recentOrders = recentOrdersRaw.map(o => ({
            id: o.id,
            customerName: o.customer?.name || "Client de passage",
            total: Number(o.total),
            paidAmount: Number(o.paidAmount),
            date: format(o.createdAt, "dd/MM HH:mm")
        }));

        const revenueMap = new Map<string, { revenue: number; expenses: number }>();

        // Initialize the map with 0s for every day in the interval
        const days = eachDayOfInterval({ start: fromDate, end: toDate });
        days.forEach(day => {
            revenueMap.set(format(day, "MMM dd"), { revenue: 0, expenses: 0 });
        });

        ordersForChart.forEach(o => {
            const dateStr = format(o.createdAt, "MMM dd");
            if (revenueMap.has(dateStr)) {
                const cur = revenueMap.get(dateStr)!;
                cur.revenue += Number(o.total);
            }
        });

        salesForChart.forEach(o => {
            const dateStr = format(o.createdAt, "MMM dd");
            if (revenueMap.has(dateStr)) {
                const cur = revenueMap.get(dateStr)!;
                cur.revenue += Number(o.total);
            }
        });

        expensesForChart.forEach(e => {
            const dateStr = format(e.date, "MMM dd");
            if (revenueMap.has(dateStr)) {
                const cur = revenueMap.get(dateStr)!;
                cur.expenses += Number(e.amount);
            }
        });

        const revenueOverTime = Array.from(revenueMap.entries())
            .map(([date, vals]) => ({ date, ...vals }));


        const customerNameMap = new Map(topCustomersDetails.map(c => [c.id, c.name]));
        const topCustomers = topCustomersData.map(tc => ({
            name: customerNameMap.get(tc.customerId as string) || "Unknown",
            spent: Number(tc._sum.total || 0)
        }));


        const topProducts: any[] = [];
        const categoryPerformance: any[] = [];

        return JSON.parse(JSON.stringify({
            totalRevenue, posRevenue, invoiceRevenue,
            totalExpenses, totalPurchases, cashCollected,
            totalCOGS, netProfit, ordersCount, salesCount,
            outstandingDebt, revenueOverTime,
            topProducts, categoryPerformance,
            recentOrders, topCustomers,
            lowStock, debtors: formattedDebtors
        }));

    } catch (error) {
        console.error("[GET_ANALYTICS]", error);
        return {
            totalRevenue: 0, posRevenue: 0, invoiceRevenue: 0,
            totalExpenses: 0, totalPurchases: 0, cashCollected: 0,
            totalCOGS: 0, netProfit: 0,
            ordersCount: 0, salesCount: 0, outstandingDebt: 0,
            revenueOverTime: [], topProducts: [], categoryPerformance: [],
            recentOrders: [], topCustomers: [], lowStock: [], debtors: []
        };
    }
}
