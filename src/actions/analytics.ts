"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns"

export async function getAnalyticsData(dateRange?: { from: Date; to: Date }) {
    try {
        console.time("getAnalyticsData - Auth");
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        console.timeEnd("getAnalyticsData - Auth");

        const tenantId = session.user.tenantId;
        const toDate = dateRange?.to || new Date();
        const fromDate = dateRange?.from || subDays(toDate, 30);

        // ─── OPTIMIZED AGGREGATIONS (DATABASE LEVEL) ───────────────────────

        console.time("getAnalyticsData - Initial Aggregations");
        // 1. Total Revenue & Cash (Orders)
        const posAgg = await db.order.aggregate({
            where: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            _sum: { total: true, paidAmount: true },
            _count: { id: true }
        });

        // 2. Total Revenue & Cash (SalesOrders)
        const salesAgg = await db.salesOrder.aggregate({
            where: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            _sum: { total: true },
            _count: { id: true }
        });

        // 3. Total Expenses
        const expensesAgg = await db.expense.aggregate({
            where: { tenantId, date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            _sum: { amount: true }
        });

        // 4. Total Purchases
        const purchasesAgg = await db.purchaseOrder.aggregate({
            where: { tenantId, status: { in: ["COMPLETED", "PAID", "DELIVERED", "PENDING"] }, createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            _sum: { total: true }
        });
        console.timeEnd("getAnalyticsData - Initial Aggregations");

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

        // ─── COGS (Cost of Goods Sold) using DB groupBy ───────────────────────
        console.time("getAnalyticsData - COGS");
        const posItemsSum = await db.orderItem.groupBy({
            by: ['productId'],
            where: { order: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
            _sum: { quantity: true }
        });
        const salesItemsSum = await db.salesOrderItem.groupBy({
            by: ['productId'],
            where: { salesOrder: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
            _sum: { quantity: true }
        });

        const productIds = Array.from(new Set([
            ...posItemsSum.map(i => i.productId),
            ...salesItemsSum.map(i => i.productId)
        ]));

        const productsCost = await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, cost: true }
        });
        const costMap = new Map(productsCost.map(p => [p.id, Number(p.cost || 0)]));

        let totalCOGS = 0;
        posItemsSum.forEach(i => totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0));
        salesItemsSum.forEach(i => totalCOGS += (i._sum.quantity || 0) * (costMap.get(i.productId) || 0));
        console.timeEnd("getAnalyticsData - COGS");

        const netProfit = totalRevenue - totalExpenses - totalCOGS;

        // ─── DEBTORS & OUTSTANDING DEBT ──────────────────────────────────
        console.time("getAnalyticsData - Debtors");
        const debtorsAgg = await db.customer.aggregate({
            where: { tenantId, balance: { lt: 0 } },
            _sum: { balance: true }
        });
        const outstandingDebt = Math.abs(Number(debtorsAgg._sum.balance || 0));

        const topDebtors = await db.customer.findMany({
            where: { tenantId, balance: { lt: 0 } },
            select: { id: true, name: true, balance: true },
            orderBy: { balance: 'asc' },
            take: 5
        });
        const formattedDebtors = topDebtors.map(c => ({ id: c.id, name: c.name, balance: Math.abs(Number(c.balance)) }));
        console.timeEnd("getAnalyticsData - Debtors");

        // ─── LOW STOCK PRODUCTS ───────────────────────────────────────────
        console.time("getAnalyticsData - Low Stock");
        const lowStockProducts = await db.product.findMany({
            where: { tenantId, isArchived: false, stock: { lte: 10 } },
            select: { id: true, name: true, stock: true, minStock: true },
            orderBy: { stock: 'asc' },
            take: 50
        });
        const lowStock = lowStockProducts
            .filter(p => p.stock <= p.minStock)
            .slice(0, 8);
        console.timeEnd("getAnalyticsData - Low Stock");

        // ─── RECENT ORDERS ────────────────────────────────────────────────
        console.time("getAnalyticsData - Recent Orders");
        const recentOrdersRaw = await db.order.findMany({
            where: { tenantId, status: "COMPLETED" },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 8
        });
        const recentOrders = recentOrdersRaw.map(o => ({
            id: o.id,
            customerName: o.customer?.name || "Client de passage",
            total: Number(o.total),
            paidAmount: Number(o.paidAmount),
            date: format(o.createdAt, "dd/MM HH:mm")
        }));
        console.timeEnd("getAnalyticsData - Recent Orders");

        // ─── REVENUE OVER TIME (Optimized FindMany Mapping) ─────────────────
        console.time("getAnalyticsData - Revenue Over Time");
        // Instead of 90 parallel queries (which locks SQLite), we do 3 fast flat queries 
        // selecting ONLY the date and total, then group them in JS over the interval.
        const [ordersForChart, salesForChart, expensesForChart] = await Promise.all([
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
            })
        ]);

        const revenueMap = new Map<string, { revenue: number; expenses: number }>();

        // Initialize the map with 0s for every day in the interval
        const days = eachDayOfInterval({ start: fromDate, end: toDate });
        days.forEach(day => {
            revenueMap.set(format(day, "MMM dd"), { revenue: 0, expenses: 0 });
        });

        // O(N) mapping, very fast in JS. N is number of transactions in 30 days, not all time.
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

        console.timeEnd("getAnalyticsData - Revenue Over Time");

        // ─── TOP CUSTOMERS & TOP PRODUCTS (Minimal Fetch) ───────────────
        console.time("getAnalyticsData - Top Customers");
        const topCustomersData = await db.order.groupBy({
            by: ['customerId'],
            where: { tenantId, status: "COMPLETED", customerId: { not: null }, createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            _sum: { total: true },
            orderBy: { _sum: { total: 'desc' } },
            take: 5
        });

        const topCustomers = [];
        for (const tc of topCustomersData) {
            if (!tc.customerId) continue;
            const c = await db.customer.findUnique({ where: { id: tc.customerId }, select: { name: true } });
            if (c) topCustomers.push({ name: c.name, spent: Number(tc._sum.total || 0) });
        }
        console.timeEnd("getAnalyticsData - Top Customers");

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
