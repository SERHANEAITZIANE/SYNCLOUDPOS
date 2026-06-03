import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay } from "date-fns";

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
            // Low stock products count
            lowStockCount,
            // Today's daily close status
            todayClose,
            // Today's purchases
            purchasesAgg,
            // Today's returns (client)
            clientReturnsAgg,
            // Today's returns (supplier)
            supplierReturnsAgg,
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
            // 7. Low stock count (placeholder — computed separately below)
            Promise.resolve(0),
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
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
