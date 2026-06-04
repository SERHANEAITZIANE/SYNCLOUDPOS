import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

// GET /api/mobile/gerant/daily-close — Daily cash reconciliation data
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const from = startOfDay(new Date());
        const to = endOfDay(new Date());
        const yesterday = startOfDay(subDays(new Date(), 1));

        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        const [
            posAgg,
            salesAgg,
            returnsAgg,
            expensesAgg,
            cashPaymentsAgg,
            yesterdayClose,
        ] = await Promise.all([
            // Today's POS cash sales
            db.order.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: "COMPLETED",
                    paymentMethod: "CASH",
                    createdAt: { gte: from, lte: to },
                },
                _sum: { paidAmount: true },
                _count: { id: true },
            }),
            // Today's BL sales (cash collected)
            db.salesOrder.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PAID", "PARTIAL"] },
                    paymentMethod: "CASH",
                    createdAt: { gte: from, lte: to },
                },
                _sum: { amountPaid: true, total: true },
                _count: { id: true },
            }),
            // Returns today
            db.salesOrder.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    type: "RETURN",
                    createdAt: { gte: from, lte: to },
                },
                _sum: { total: true },
            }),
            // Expenses today
            db.expense.aggregate({
                where: {
                    tenantId,
                    date: { gte: from, lte: to },
                },
                _sum: { amount: true },
                _count: { id: true },
            }),
            // Cash payments received from clients today
            db.customerPayment.aggregate({
                where: {
                    tenantId,
                    paymentMethod: "CASH",
                    date: { gte: from, lte: to },
                },
                _sum: { amount: true },
            }),
            // Yesterday's closing balance (from cash close records)
            db.cashClose.findFirst({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    date: { gte: yesterday, lt: from },
                },
                select: { closingBalance: true },
                orderBy: { date: "desc" },
            }),
        ]);

        const posCash = Number(posAgg._sum.paidAmount || 0);
        const blCash = Number(salesAgg._sum.amountPaid || 0);
        const totalSales = posCash + blCash;
        const totalReturns = Number(returnsAgg._sum.total || 0);
        const totalExpenses = Number(expensesAgg._sum.amount || 0);
        const cashPaymentsReceived = Number(cashPaymentsAgg._sum.amount || 0);
        const openingBalance = Number(yesterdayClose?.closingBalance || 0);

        const expectedCash = openingBalance + totalSales + cashPaymentsReceived - totalReturns - totalExpenses;

        const todayDate = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
        });

        return NextResponse.json({
            date: todayDate,
            expectedCash: Math.round(expectedCash),
            totalSales: Math.round(totalSales),
            totalReturns: Math.round(totalReturns),
            totalExpenses: Math.round(totalExpenses),
            totalPaymentsReceived: Math.round(cashPaymentsReceived),
            openingBalance: Math.round(openingBalance),
            transactions: [
                { label: "Ventes POS espèces", amount: Math.round(posCash), type: "in" as const },
                { label: "Ventes BL espèces", amount: Math.round(blCash), type: "in" as const },
                { label: "Encaissements clients", amount: Math.round(cashPaymentsReceived), type: "in" as const },
                { label: "Retours marchandise", amount: -Math.round(totalReturns), type: "out" as const },
                { label: "Dépenses & décaissements", amount: -Math.round(totalExpenses), type: "out" as const },
            ].filter(t => t.amount !== 0),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// POST /api/mobile/gerant/daily-close — Submit cash close record
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { countedCash, expectedCash, notes } = await req.json();

        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        // Check if already closed today
        const existingClose = await db.cashClose.findFirst({
            where: {
                tenantId,
                date: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
            },
        });

        if (existingClose) {
            return NextResponse.json({ error: "La caisse a déjà été clôturée aujourd'hui" }, { status: 400 });
        }

        const close = await db.cashClose.create({
            data: {
                tenantId,
                storeId: storeId || undefined,
                date: new Date(),
                closingBalance: countedCash,
                expectedBalance: expectedCash,
                discrepancy: countedCash - expectedCash,
                notes: notes || null,
                closedById: user.userId,
            },
        });

        return NextResponse.json({ success: true, id: close.id, discrepancy: close.discrepancy });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
