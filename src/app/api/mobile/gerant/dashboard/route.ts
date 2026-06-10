import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

function isBetween(date: Date, start: Date, end: Date) {
    const t = date.getTime();
    return t >= start.getTime() && t <= end.getTime();
}

function getChangePercent(todayVal: number, yesterdayVal: number): number {
    if (yesterdayVal === 0) {
        return todayVal > 0 ? 100 : 0;
    }
    return Math.round(((todayVal - yesterdayVal) / yesterdayVal) * 100);
}

// GET /api/mobile/gerant/dashboard — Real-time financial command center for the manager
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        // Only ADMIN and MANAGER can access gérant dashboard
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const today = startOfDay(new Date());
        const endToday = endOfDay(new Date());

        // Resolve default store
        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        // Create 7-day windows (today + 6 days past)
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                start: startOfDay(d),
                end: endOfDay(d),
            };
        });

        const startOf7Days = days[0].start;
        const endOf7Days = days[6].end;

        // ── Run all queries in parallel ──────────────────────────────
        const [
            // Today's POS orders
            posAgg,
            // Today's BL/Sales orders
            salesAgg,
            // Today's expenses
            expensesAgg,
            // Outstanding client debt (negative balances = clients owe us)
            clientDebtAgg,
            clientDebtCount,
            // Outstanding supplier debt (positive balances = we owe suppliers)
            supplierDebtAgg,
            supplierDebtCount,
            // Treasury accounts snapshot
            treasuryAccounts,
            // Today's daily close status
            todayClose,
            // Today's purchases
            purchasesAgg,
            // Today's returns (client)
            clientReturnsAgg,
            // Today's returns (supplier)
            supplierReturnsAgg,
            // Recent POS orders for activity feed
            recentOrders,
            // Recent Sales orders for activity feed
            recentSalesOrders,
            // Recent Expenses for activity feed
            recentExpenses,
            // 7-day sparkline data POS
            posForSparkline,
            // 7-day sparkline data Sales
            salesForSparkline,
            // 7-day sparkline data Expenses
            expensesForSparkline,
        ] = await Promise.all([
            // 1. POS revenue today
            db.order.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: today, lte: endToday },
                },
                _sum: { total: true, paidAmount: true },
                _count: { id: true },
            }),
            // 2. BL/Sales revenue today
            db.salesOrder.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: today, lte: endToday },
                },
                _sum: { total: true, amountPaid: true },
                _count: { id: true },
            }),
            // 3. Expenses today
            db.expense.aggregate({
                where: {
                    tenantId,
                    date: { gte: today, lte: endToday },
                },
                _sum: { amount: true },
                _count: { id: true },
            }),
            // 4. Client debt total (negative balance means client owes us)
            db.customer.aggregate({
                where: { tenantId, balance: { lt: 0 } },
                _sum: { balance: true },
            }),
            db.customer.count({
                where: { tenantId, balance: { lt: 0 } },
            }),
            // 5. Supplier debt total (positive balance means we owe supplier)
            db.supplier.aggregate({
                where: { tenantId, balance: { gt: 0 } },
                _sum: { balance: true },
            }),
            db.supplier.count({
                where: { tenantId, balance: { gt: 0 } },
            }),
            // 6. Treasury accounts
            db.treasuryAccount.findMany({
                where: { tenantId },
                select: { id: true, name: true, type: true, balance: true },
                orderBy: { name: "asc" },
            }),
            // 8. Today's daily close
            db.dailyClose.findFirst({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    date: { gte: today, lte: endToday },
                },
                select: { id: true, netCash: true, closedByUserId: true, createdAt: true },
            }),
            // 9. Purchases today
            db.purchaseOrder.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    createdAt: { gte: today, lte: endToday },
                    status: { in: ["FACTURE", "BON_LIVRAISON", "COMPLETED", "PAID"] },
                },
                _sum: { total: true },
                _count: { id: true },
            }),
            // 10. Client returns today
            db.productReturn.aggregate({
                where: {
                    tenantId,
                    createdAt: { gte: today, lte: endToday },
                },
                _sum: { totalAmount: true },
                _count: { id: true },
            }),
            // 11. Supplier returns today
            db.supplierReturn.aggregate({
                where: {
                    tenantId,
                    createdAt: { gte: today, lte: endToday },
                },
                _sum: { totalAmount: true },
                _count: { id: true },
            }),
            // 12. Recent completed POS orders for activity
            db.order.findMany({
                where: { tenantId, storeId: storeId || undefined, status: "COMPLETED" },
                take: 5,
                orderBy: { createdAt: "desc" },
                select: { id: true, total: true, createdAt: true, customer: { select: { name: true } } }
            }),
            // 13. Recent Sales Orders for activity
            db.salesOrder.findMany({
                where: { tenantId, storeId: storeId || undefined },
                take: 5,
                orderBy: { createdAt: "desc" },
                select: { id: true, total: true, createdAt: true, customer: { select: { name: true } } }
            }),
            // 14. Recent expenses for activity
            db.expense.findMany({
                where: { tenantId },
                take: 5,
                orderBy: { date: "desc" },
                select: { id: true, amount: true, description: true, date: true }
            }),
            // 15. POS data for 7-day sparkline
            db.order.findMany({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    createdAt: { gte: startOf7Days, lte: endOf7Days },
                },
                select: {
                    total: true,
                    createdAt: true,
                    items: {
                        select: {
                            quantity: true,
                            price: true,
                            product: { select: { cost: true } }
                        }
                    }
                }
            }),
            // 16. Sales order data for 7-day sparkline
            db.salesOrder.findMany({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL", "PENDING"] },
                    createdAt: { gte: startOf7Days, lte: endOf7Days },
                },
                select: {
                    total: true,
                    createdAt: true,
                    items: {
                        select: {
                            quantity: true,
                            unitPrice: true,
                            product: { select: { cost: true } }
                        }
                    }
                }
            }),
            // 17. Expenses for 7-day sparkline
            db.expense.findMany({
                where: {
                    tenantId,
                    date: { gte: startOf7Days, lte: endOf7Days },
                },
                select: {
                    amount: true,
                    date: true,
                }
            })
        ]);

        // ── Compute low stock properly ──────────────────────────────
        const lowStockProducts = await db.product.count({
            where: {
                tenantId,
                isArchived: false,
                storeProducts: {
                    some: {
                        storeId: storeId || undefined,
                        stock: { lte: 0 },
                    },
                },
            },
        });

        // ── Compute metrics ─────────────────────────────────────────
        const posRevenue = Number(posAgg._sum.total || 0);
        const posCash = Number(posAgg._sum.paidAmount || 0);
        const salesRevenue = Number(salesAgg._sum.total || 0);
        const salesCash = Number(salesAgg._sum.amountPaid || 0);

        const totalRevenue = posRevenue + salesRevenue;
        const totalCollected = posCash + salesCash;
        const totalCredit = totalRevenue - totalCollected;
        const totalExpenses = Number(expensesAgg._sum.amount || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);
        const totalClientReturns = Number(clientReturnsAgg._sum.totalAmount || 0);
        const totalSupplierReturns = Number(supplierReturnsAgg._sum.totalAmount || 0);

        const netCashFlow = totalCollected - totalExpenses;
        const clientDebt = Math.abs(Number(clientDebtAgg._sum.balance || 0));
        const supplierDebt = Number(supplierDebtAgg._sum.balance || 0);

        const totalTreasury = treasuryAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

        // ── Compute 7-day daily data for sparkline and trends ───────
        const dailyData = days.map(day => {
            const posToday = posForSparkline.filter(o => isBetween(o.createdAt, day.start, day.end));
            const posRev = posToday.reduce((sum, o) => sum + Number(o.total), 0);
            const posProfit = posToday.reduce((sum, o) => {
                const orderProfit = o.items.reduce((itemSum, item) => {
                    const cost = Number(item.product?.cost || 0);
                    const price = Number(item.price || 0);
                    return itemSum + (price - cost) * item.quantity;
                }, 0);
                return sum + orderProfit;
            }, 0);

            const salesToday = salesForSparkline.filter(o => isBetween(o.createdAt, day.start, day.end));
            const salesRev = salesToday.reduce((sum, o) => sum + Number(o.total), 0);
            const salesProfit = salesToday.reduce((sum, o) => {
                const orderProfit = o.items.reduce((itemSum, item) => {
                    const cost = Number(item.product?.cost || 0);
                    const price = Number(item.unitPrice || 0);
                    return itemSum + (price - cost) * item.quantity;
                }, 0);
                return sum + orderProfit;
            }, 0);

            const expToday = expensesForSparkline.filter(e => isBetween(e.date, day.start, day.end));
            const expTotal = expToday.reduce((sum, e) => sum + Number(e.amount), 0);

            return {
                revenue: posRev + salesRev,
                profit: posProfit + salesProfit,
                expense: expTotal,
            };
        });

        const todayRev = dailyData[6].revenue;
        const yesterdayRev = dailyData[5].revenue;
        const todayProf = dailyData[6].profit;
        const yesterdayProf = dailyData[5].profit;
        const todayExp = dailyData[6].expense;
        const yesterdayExp = dailyData[5].expense;

        const revenueChangePercent = getChangePercent(todayRev, yesterdayRev);
        const profitChangePercent = getChangePercent(todayProf, yesterdayProf);
        const expenseChangePercent = getChangePercent(todayExp, yesterdayExp);

        // Calculate total profit today
        const totalProfitToday = todayProf;

        // ── Format recent activity feed ─────────────────────────────
        const activityFeed: any[] = [];
        recentOrders.forEach(o => {
            activityFeed.push({
                id: `pos-${o.id}`,
                type: "SALE_POS",
                description: `Vente POS${o.customer?.name ? ` — ${o.customer.name}` : ""}`,
                amount: Math.round(Number(o.total)),
                timestamp: o.createdAt.toISOString(),
            });
        });
        recentSalesOrders.forEach(so => {
            activityFeed.push({
                id: `bl-${so.id}`,
                type: "SALE_BL",
                description: `Bon de Livraison — ${so.customer?.name || "Client"}`,
                amount: Math.round(Number(so.total)),
                timestamp: so.createdAt.toISOString(),
            });
        });
        recentExpenses.forEach(e => {
            activityFeed.push({
                id: `exp-${e.id}`,
                type: "EXPENSE",
                description: e.description,
                amount: Math.round(Number(e.amount)),
                timestamp: e.date.toISOString(),
            });
        });

        const sortedActivity = activityFeed
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);

        return NextResponse.json({
            date: new Date().toISOString().split("T")[0],
            today: {
                revenue: {
                    total: Math.round(totalRevenue),
                    pos: Math.round(posRevenue),
                    bl: Math.round(salesRevenue),
                    ordersCount: posAgg._count.id,
                    salesCount: salesAgg._count.id,
                },
                profit: {
                    total: Math.round(totalProfitToday),
                },
                collections: {
                    total: Math.round(totalCollected),
                    creditGiven: Math.round(totalCredit),
                },
                expenses: {
                    total: Math.round(totalExpenses),
                    count: expensesAgg._count.id,
                },
                purchases: {
                    total: Math.round(totalPurchases),
                    count: purchasesAgg._count.id,
                },
                returns: {
                    clientTotal: Math.round(totalClientReturns),
                    clientCount: clientReturnsAgg._count.id,
                    supplierTotal: Math.round(totalSupplierReturns),
                    supplierCount: supplierReturnsAgg._count.id,
                },
                netCashFlow: Math.round(netCashFlow),
            },
            debts: {
                clientsOweUs: Math.round(clientDebt),
                clientDebtorCount: clientDebtCount,
                weOweSuppliers: Math.round(supplierDebt),
                supplierCreditorCount: supplierDebtCount,
            },
            treasury: {
                totalBalance: Math.round(totalTreasury),
                accounts: treasuryAccounts.map(a => ({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    balance: Math.round(Number(a.balance)),
                })),
            },
            stock: {
                lowStockCount: lowStockProducts,
            },
            dailyClose: todayClose
                ? {
                    isClosed: true,
                    netCash: Math.round(Number(todayClose.netCash)),
                    closedAt: todayClose.createdAt,
                }
                : {
                    isClosed: false,
                    netCash: null,
                    closedAt: null,
                },
            trends: {
                revenueLast7Days: dailyData.map(d => d.revenue),
                profitLast7Days: dailyData.map(d => d.profit),
                expenseLast7Days: dailyData.map(d => d.expense),
                revenueChangePercent,
                profitChangePercent,
                expenseChangePercent,
            },
            recentActivity: sortedActivity,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
