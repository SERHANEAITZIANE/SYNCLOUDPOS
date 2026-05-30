"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { withCache } from "@/lib/redis"
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns"

export async function getAnalyticsData(dateRange?: { from: Date; to: Date }) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const tenantId = session.user.tenantId;
        const defaultStoreId = session.user.defaultStoreId;
        const toDate = dateRange?.to || endOfDay(new Date());
        const fromDate = dateRange?.from || startOfDay(new Date());
        const storeIdToUse = defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        const dateKey = `${format(fromDate, 'yyyyMMdd')}-${format(toDate, 'yyyyMMdd')}`
        const cacheKey = `analytics:${tenantId}:${storeIdToUse}:${dateKey}`

        return withCache(cacheKey, async () => {

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
                    where: { tenantId, storeId: storeIdToUse, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                    _sum: { total: true, paidAmount: true },
                    _count: { id: true }
                }),
                // 2. Total Revenue & Cash (SalesOrders)
                db.salesOrder.aggregate({
                    where: { tenantId, storeId: storeIdToUse, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
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
                    where: { tenantId, storeId: storeIdToUse, status: { in: ["COMPLETED", "PAID", "DELIVERED", "PENDING"] }, createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                    _sum: { total: true }
                }),
                // 5. COGS: Pos items sum
                db.orderItem.groupBy({
                    by: ['productId'],
                    where: { order: { tenantId, storeId: storeIdToUse, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
                    _sum: { quantity: true }
                }),
                // 6. COGS: Sales items sum
                db.salesOrderItem.groupBy({
                    by: ['productId'],
                    where: { salesOrder: { tenantId, storeId: storeIdToUse, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
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
                    where: { tenantId, isArchived: false, storeProducts: { some: { storeId: storeIdToUse, stock: { lte: 10 } } } },
                    include: { storeProducts: { where: { storeId: storeIdToUse } } },
                    take: 50
                }),
                // 10. Recent Orders
                db.order.findMany({
                    where: { tenantId, storeId: storeIdToUse, status: "COMPLETED" },
                    include: { customer: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 8
                }),
                // 11-13. Revenue over time charts — GROUP BY at DB level instead of fetching all rows
                db.order.groupBy({
                    by: ['createdAt'],
                    where: { tenantId, storeId: storeIdToUse, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                    _sum: { total: true },
                    _count: { id: true }
                }),
                db.salesOrder.groupBy({
                    by: ['createdAt'],
                    where: { tenantId, storeId: storeIdToUse, status: "PAID", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                    _sum: { total: true },
                    _count: { id: true }
                }),
                db.expense.groupBy({
                    by: ['date'],
                    where: { tenantId, date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
                    _sum: { amount: true }
                }),
                // 14. Top customers data
                db.order.groupBy({
                    by: ['customerId'],
                    where: { tenantId, storeId: storeIdToUse, status: "COMPLETED", customerId: { not: null }, createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } },
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

            const [productsCost, topCustomersDetails, topProductsData, categoryPerfData] = await Promise.all([
                db.product.findMany({
                    where: { id: { in: productIds } },
                    select: { id: true, cost: true }
                }),
                db.customer.findMany({
                    where: { id: { in: customerIds } },
                    select: { id: true, name: true }
                }),
                // Top selling products — aggregated at DB level
                db.orderItem.groupBy({
                    by: ['productId'],
                    where: { order: { tenantId, storeId: storeIdToUse, status: "COMPLETED", createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) } } },
                    _sum: { quantity: true, price: true },
                    orderBy: { _sum: { price: 'desc' } },
                    take: 10
                }),
                // Category performance — aggregated at DB level
                db.product.groupBy({
                    by: ['categoryId'],
                    where: { tenantId, isArchived: false, categoryId: { not: null } },
                    _count: { id: true }
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
                .map(p => {
                    const stock = p.storeProducts.reduce((sum, sp) => sum + sp.stock, 0);
                    const minStock = p.storeProducts.reduce((sum, sp) => sum + sp.minStock, 0);
                    return { ...p, stock, minStock };
                })
                .filter(p => p.stock <= p.minStock)
                .sort((a, b) => a.stock - b.stock)
                .slice(0, 8);

            const recentOrders = recentOrdersRaw.map(o => ({
                id: o.id,
                customerName: o.customer?.name || "Client de passage",
                total: Number(o.total),
                paidAmount: Number(o.paidAmount),
                date: format(o.createdAt, "dd/MM HH:mm")
            }));

            // Build revenue over time chart from pre-aggregated data
            const revenueMap = new Map<string, { revenue: number; expenses: number }>();

            // Initialize the map with 0s for every day in the interval
            const days = eachDayOfInterval({ start: fromDate, end: toDate });
            days.forEach(day => {
                revenueMap.set(format(day, "MMM dd"), { revenue: 0, expenses: 0 });
            });

            // Now iterate pre-grouped data (much fewer rows)
            ordersForChart.forEach(o => {
                const dateStr = format(o.createdAt, "MMM dd");
                if (revenueMap.has(dateStr)) {
                    const cur = revenueMap.get(dateStr)!;
                    cur.revenue += Number(o._sum.total || 0);
                }
            });

            salesForChart.forEach(o => {
                const dateStr = format(o.createdAt, "MMM dd");
                if (revenueMap.has(dateStr)) {
                    const cur = revenueMap.get(dateStr)!;
                    cur.revenue += Number(o._sum.total || 0);
                }
            });

            expensesForChart.forEach(e => {
                const dateStr = format(e.date, "MMM dd");
                if (revenueMap.has(dateStr)) {
                    const cur = revenueMap.get(dateStr)!;
                    cur.expenses += Number(e._sum.amount || 0);
                }
            });

            const revenueOverTime = Array.from(revenueMap.entries())
                .map(([date, vals]) => ({ date, ...vals }));


            const customerNameMap = new Map(topCustomersDetails.map(c => [c.id, c.name]));
            const topCustomers = topCustomersData.map(tc => ({
                name: customerNameMap.get(tc.customerId as string) || "Unknown",
                spent: Number(tc._sum.total || 0)
            }));

            // Build top products list from aggregated data
            const topProductIds = topProductsData.map(tp => tp.productId);
            const topProductNames = topProductIds.length > 0
                ? await db.product.findMany({
                    where: { id: { in: topProductIds } },
                    select: { id: true, name: true, cost: true }
                })
                : [];
            const productNameMap = new Map(topProductNames.map(p => [p.id, { name: p.name, cost: Number(p.cost || 0) }]));
            const topProducts = topProductsData.map(tp => ({
                id: tp.productId,
                name: productNameMap.get(tp.productId)?.name || "Unknown",
                quantity: tp._sum.quantity || 0,
                revenue: Number(tp._sum.price || 0),
            }));

            // Build category performance from aggregated data
            const categoryIds = categoryPerfData.map(c => c.categoryId).filter(Boolean) as string[];
            const categoryNames = categoryIds.length > 0
                ? await db.category.findMany({
                    where: { id: { in: categoryIds } },
                    select: { id: true, name: true }
                })
                : [];
            const categoryNameMap = new Map(categoryNames.map(c => [c.id, c.name]));
            const categoryPerformance = categoryPerfData.map(cp => ({
                name: categoryNameMap.get(cp.categoryId as string) || "Sans catégorie",
                products: cp._count.id,
            }));

            return JSON.parse(JSON.stringify({
                totalRevenue, posRevenue, invoiceRevenue,
                totalExpenses, totalPurchases, cashCollected,
                totalCOGS, netProfit, ordersCount, salesCount,
                outstandingDebt, revenueOverTime,
                topProducts, categoryPerformance,
                recentOrders, topCustomers,
                lowStock, debtors: formattedDebtors
            }));
        }, 30) // 30 second cache

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

export async function getSalesData(tenantId: string, days: number = 60): Promise<{ date: string; sales: number }[]> {
    try {
        const toDate = new Date();
        const fromDate = subDays(toDate, days);

        const [posOrders, salesOrders] = await Promise.all([
            db.order.findMany({
                where: {
                    tenantId,
                    status: "COMPLETED",
                    createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
                },
                select: { createdAt: true, total: true }
            }),
            db.salesOrder.findMany({
                where: {
                    tenantId,
                    status: "PAID",
                    createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
                },
                select: { createdAt: true, total: true }
            })
        ]);

        const salesMap = new Map<string, number>();

        const intervalDays = eachDayOfInterval({ start: fromDate, end: toDate });
        intervalDays.forEach(day => {
            salesMap.set(format(day, "yyyy-MM-dd"), 0);
        });

        posOrders.forEach(o => {
            const dateStr = format(o.createdAt, "yyyy-MM-dd");
            salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + Number(o.total));
        });

        salesOrders.forEach(so => {
            const dateStr = format(so.createdAt, "yyyy-MM-dd");
            salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + Number(so.total));
        });

        return Array.from(salesMap.entries()).map(([date, sales]) => ({
            date,
            sales
        }));
    } catch (error) {
        console.error("[GET_SALES_DATA]", error);
        return [];
    }
}
