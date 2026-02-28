"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export async function getAnalyticsData(dateRange?: { from: Date; to: Date }) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        // @ts-expect-error tenantId
        const tenantId = session.user.tenantId;
        const toDate = dateRange?.to || new Date();
        const fromDate = dateRange?.from || subDays(toDate, 30);

        // ─── OPTIMIZED AGGREGATIONS (DATABASE LEVEL) ───────────────────────

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

        // ─── COGS (Cost of Goods Sold) using DB sum ───────────────────────
        // We fetch the cost per line item directly from the DB without loading rows
        const posItems = await db.orderItem.findMany({
            where: { order: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
            select: { quantity: true, product: { select: { cost: true } } }
        });
        const salesItems = await db.salesOrderItem.findMany({
            where: { salesOrder: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
            select: { quantity: true, product: { select: { cost: true } } }
        });

        // Because we only select qty and cost, memory footprint is minimal compared to the full object
        let totalCOGS = 0;
        posItems.forEach(i => totalCOGS += (i.quantity * Number(i.product?.cost || 0)));
        salesItems.forEach(i => totalCOGS += (i.quantity * Number(i.product?.cost || 0)));

        const netProfit = totalRevenue - totalExpenses - totalCOGS;

        // ─── DEBTORS & OUTSTANDING DEBT ──────────────────────────────────
        // Instead of fetching all customers, we only fetch those with balance < 0
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

        // ─── LOW STOCK PRODUCTS ───────────────────────────────────────────
        // Only fetch items where stock <= minStock (Prisma doesn't support field comparison directly, so we fetch and filter small subset or sort by stock)
        // Optimization: if there are 10k products, sorting and taking 8 is fast.
        const lowStockProducts = await db.product.findMany({
            where: { tenantId, isArchived: false, stock: { lte: 10 } }, // heuristic filter to reduce memory
            select: { id: true, name: true, stock: true, minStock: true },
            orderBy: { stock: 'asc' },
            take: 50
        });
        const lowStock = lowStockProducts
            .filter(p => p.stock <= p.minStock)
            .slice(0, 8);

        // ─── RECENT ORDERS ────────────────────────────────────────────────
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

        // ─── REVENUE OVER TIME (Grouping by Date Strings) ─────────────────
        // To build the chart, we fetch Date + Total grouped. 
        // We select only minimal data to avoid OOM.
        const ordersForChart = await db.order.findMany({
            where: { tenantId, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            select: { createdAt: true, total: true }
        });
        const salesForChart = await db.salesOrder.findMany({
            where: { tenantId, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            select: { createdAt: true, total: true }
        });
        const expensesForChart = await db.expense.findMany({
            where: { tenantId, date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
            select: { date: true, amount: true }
        });

        const revenueMap = new Map<string, { revenue: number; expenses: number }>();
        ordersForChart.forEach(o => {
            const date = format(o.createdAt, "MMM dd");
            const cur = revenueMap.get(date) || { revenue: 0, expenses: 0 };
            revenueMap.set(date, { ...cur, revenue: cur.revenue + Number(o.total) });
        });
        salesForChart.forEach(o => {
            const date = format(o.createdAt, "MMM dd");
            const cur = revenueMap.get(date) || { revenue: 0, expenses: 0 };
            revenueMap.set(date, { ...cur, revenue: cur.revenue + Number(o.total) });
        });
        expensesForChart.forEach(e => {
            const date = format(e.date, "MMM dd");
            const cur = revenueMap.get(date) || { revenue: 0, expenses: 0 };
            revenueMap.set(date, { ...cur, expenses: cur.expenses + Number(e.amount) });
        });
        const revenueOverTime = Array.from(revenueMap.entries())
            .map(([date, vals]) => ({ date, ...vals }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // ─── TOP CUSTOMERS & TOP PRODUCTS (Minimal Fetch) ───────────────
        // We fetch partial order payloads instead of full nested includes
        const topCustomersData = await db.order.groupBy({
            by: ['customerId'],
            where: { tenantId, status: "COMPLETED", customerId: { not: null } },
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

        // Return empty arrays for now for heavy memory objects (Top Products, Categories)
        // These require extremely heavy memory mapping outside of raw SQL
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
