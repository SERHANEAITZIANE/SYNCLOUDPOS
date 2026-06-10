import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { subDays, startOfDay, endOfDay } from "date-fns";

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
        const thisWeekStart = startOfDay(subDays(now, 6)); // Last 7 days including today
        const thisWeekEnd = endOfDay(now);

        const lastWeekStart = startOfDay(subDays(now, 13));
        const lastWeekEnd = endOfDay(subDays(now, 7));

        // Queries for this week
        const [
            thisWeekPOS,
            thisWeekBL,
            thisWeekExpenses,
            thisWeekNewDebt,
            posItemsThisWeek,
            blItemsThisWeek,
        ] = await Promise.all([
            db.order.aggregate({
                where: { tenantId, storeId: storeId || undefined, status: "COMPLETED", createdAt: { gte: thisWeekStart, lte: thisWeekEnd } },
                _sum: { total: true }
            }),
            db.salesOrder.aggregate({
                where: { tenantId, storeId: storeId || undefined, status: { in: ["PAID", "PARTIAL", "PENDING"] }, createdAt: { gte: thisWeekStart, lte: thisWeekEnd } },
                _sum: { total: true, amountPaid: true }
            }),
            db.expense.aggregate({
                where: { tenantId, date: { gte: thisWeekStart, lte: thisWeekEnd } },
                _sum: { amount: true }
            }),
            db.salesOrder.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PARTIAL", "PENDING"] },
                    createdAt: { gte: thisWeekStart, lte: thisWeekEnd }
                },
                _sum: { total: true, amountPaid: true }
            }),
            db.orderItem.findMany({
                where: { order: { tenantId, storeId: storeId || undefined, status: "COMPLETED", createdAt: { gte: thisWeekStart, lte: thisWeekEnd } } },
                select: { quantity: true, product: { select: { cost: true } } }
            }),
            db.salesOrderItem.findMany({
                where: { salesOrder: { tenantId, storeId: storeId || undefined, status: { in: ["PAID", "PARTIAL", "PENDING"] }, createdAt: { gte: thisWeekStart, lte: thisWeekEnd } } },
                select: { quantity: true, product: { select: { cost: true } } }
            }),
        ]);

        const thisWeekRevenue = Number(thisWeekPOS._sum.total || 0) + Number(thisWeekBL._sum.total || 0);
        const thisWeekExpensesVal = Number(thisWeekExpenses._sum.amount || 0);
        const thisWeekDebtVal = Math.max(0, Number(thisWeekNewDebt._sum.total || 0) - Number(thisWeekNewDebt._sum.amountPaid || 0));

        let thisWeekCOGS = 0;
        posItemsThisWeek.forEach(item => { thisWeekCOGS += item.quantity * Number(item.product?.cost || 0); });
        blItemsThisWeek.forEach(item => { thisWeekCOGS += item.quantity * Number(item.product?.cost || 0); });
        const thisWeekProfit = thisWeekRevenue - thisWeekCOGS;

        // Queries for last week (for comparison)
        const [
            lastWeekPOS,
            lastWeekBL,
            lastWeekExpenses,
            lastWeekNewDebt,
            posItemsLastWeek,
            blItemsLastWeek,
        ] = await Promise.all([
            db.order.aggregate({
                where: { tenantId, storeId: storeId || undefined, status: "COMPLETED", createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
                _sum: { total: true }
            }),
            db.salesOrder.aggregate({
                where: { tenantId, storeId: storeId || undefined, status: { in: ["PAID", "PARTIAL", "PENDING"] }, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
                _sum: { total: true, amountPaid: true }
            }),
            db.expense.aggregate({
                where: { tenantId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
                _sum: { amount: true }
            }),
            db.salesOrder.aggregate({
                where: {
                    tenantId,
                    storeId: storeId || undefined,
                    status: { in: ["PARTIAL", "PENDING"] },
                    createdAt: { gte: lastWeekStart, lte: lastWeekEnd }
                },
                _sum: { total: true, amountPaid: true }
            }),
            db.orderItem.findMany({
                where: { order: { tenantId, storeId: storeId || undefined, status: "COMPLETED", createdAt: { gte: lastWeekStart, lte: lastWeekEnd } } },
                select: { quantity: true, product: { select: { cost: true } } }
            }),
            db.salesOrderItem.findMany({
                where: { salesOrder: { tenantId, storeId: storeId || undefined, status: { in: ["PAID", "PARTIAL", "PENDING"] }, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } } },
                select: { quantity: true, product: { select: { cost: true } } }
            }),
        ]);

        const lastWeekRevenue = Number(lastWeekPOS._sum.total || 0) + Number(lastWeekBL._sum.total || 0);
        const lastWeekExpensesVal = Number(lastWeekExpenses._sum.amount || 0);
        const lastWeekDebtVal = Math.max(0, Number(lastWeekNewDebt._sum.total || 0) - Number(lastWeekNewDebt._sum.amountPaid || 0));

        let lastWeekCOGS = 0;
        posItemsLastWeek.forEach(item => { lastWeekCOGS += item.quantity * Number(item.product?.cost || 0); });
        blItemsLastWeek.forEach(item => { lastWeekCOGS += item.quantity * Number(item.product?.cost || 0); });
        const lastWeekProfit = lastWeekRevenue - lastWeekCOGS;

        // Fetch low stock items count
        const lowStockCount = await db.product.count({
            where: {
                tenantId,
                isArchived: false,
                stock: { lte: 0 } // rupture only
            }
        });

        // Compute changes in percent
        const getPct = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? 100 : 0;
            return Math.round(((cur - prev) / prev) * 100);
        };

        const revenueChange = getPct(thisWeekRevenue, lastWeekRevenue);
        const profitChange = getPct(thisWeekProfit, lastWeekProfit);
        const expensesChange = getPct(thisWeekExpensesVal, lastWeekExpensesVal);
        const debtChange = getPct(thisWeekDebtVal, lastWeekDebtVal);

        // Generate AI executive summary paragraph
        let aiSummary = "";
        if (thisWeekRevenue > lastWeekRevenue) {
            aiSummary = `Cette semaine a été positive pour votre commerce avec un Chiffre d'Affaires en hausse de ${revenueChange}% par rapport à la semaine dernière, totalisant ${thisWeekRevenue.toLocaleString()} DA. `;
        } else if (thisWeekRevenue < lastWeekRevenue) {
            aiSummary = `Votre activité a ralenti cette semaine avec une baisse de ${Math.abs(revenueChange)}% de votre Chiffre d'Affaires, s'élevant à ${thisWeekRevenue.toLocaleString()} DA. `;
        } else {
            aiSummary = `Votre Chiffre d'Affaires est resté stable cette semaine à ${thisWeekRevenue.toLocaleString()} DA. `;
        }

        if (thisWeekProfit > thisWeekExpensesVal) {
            aiSummary += `Vos bénéfices nets de ${thisWeekProfit.toLocaleString()} DA couvrent largement vos dépenses de ${thisWeekExpensesVal.toLocaleString()} DA. `;
        } else if (thisWeekProfit < thisWeekExpensesVal) {
            aiSummary += `⚠️ Attention : Vos dépenses de la semaine (${thisWeekExpensesVal.toLocaleString()} DA) dépassent vos bénéfices (${thisWeekProfit.toLocaleString()} DA). `;
        }

        if (thisWeekDebtVal > 0) {
            aiSummary += `De nouvelles créances clients à hauteur de ${thisWeekDebtVal.toLocaleString()} DA ont été générées. Pensez à les relancer rapidement. `;
        }

        if (lowStockCount > 0) {
            aiSummary += `De plus, vous avez ${lowStockCount} produits en rupture de stock qui nécessitent un réapprovisionnement.`;
        } else {
            aiSummary += `Votre niveau de stock est sain avec aucune alerte de rupture critique.`;
        }

        return NextResponse.json({
            metrics: {
                revenue: Math.round(thisWeekRevenue),
                profit: Math.round(thisWeekProfit),
                expenses: Math.round(thisWeekExpensesVal),
                newDebt: Math.round(thisWeekDebtVal),
                stockAlerts: lowStockCount,
            },
            comparison: {
                revenueChange,
                profitChange,
                expensesChange,
                debtChange,
            },
            aiSummary,
            period: {
                start: thisWeekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
                end: thisWeekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
            }
        });
    } catch (e: any) {
        return mobileErrorResponse(e);
    }
}
