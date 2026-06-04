import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

// GET /api/mobile/gerant/g50 — Monthly TVA G50 declaration data (last 12 months)
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        const MONTH_COUNT = 12;
        const months = [];
        for (let i = 0; i < MONTH_COUNT; i++) {
            months.push(subMonths(new Date(), i));
        }

        const monthlyData = await Promise.all(
            months.map(async (monthDate) => {
                const from = startOfMonth(monthDate);
                const to = endOfMonth(monthDate);

                const [salesAgg, posAgg, purchasesAgg, posItemsTVA, salesItemsTVA] = await Promise.all([
                    // Sales orders (BL) in this month
                    db.salesOrder.aggregate({
                        where: {
                            tenantId,
                            storeId: storeId || undefined,
                            status: { in: ["PAID", "PARTIAL", "PENDING"] },
                            createdAt: { gte: from, lte: to },
                        },
                        _sum: { total: true },
                    }),
                    // POS orders in this month
                    db.order.aggregate({
                        where: {
                            tenantId,
                            storeId: storeId || undefined,
                            status: "COMPLETED",
                            createdAt: { gte: from, lte: to },
                        },
                        _sum: { total: true },
                    }),
                    // Purchases in this month
                    db.purchaseOrder.aggregate({
                        where: {
                            tenantId,
                            storeId: storeId || undefined,
                            status: { in: ["FACTURE", "BON_LIVRAISON", "COMPLETED", "PAID"] },
                            createdAt: { gte: from, lte: to },
                        },
                        _sum: { total: true },
                    }),
                    // POS items TVA — group by tvaRate
                    db.orderItem.findMany({
                        where: {
                            order: {
                                tenantId,
                                storeId: storeId || undefined,
                                status: "COMPLETED",
                                createdAt: { gte: from, lte: to },
                            },
                        },
                        select: { price: true, quantity: true, product: { select: { tvaRate: true } } },
                    }),
                    // Sales items TVA
                    db.salesOrderItem.findMany({
                        where: {
                            salesOrder: {
                                tenantId,
                                storeId: storeId || undefined,
                                status: { in: ["PAID", "PARTIAL", "PENDING"] },
                                createdAt: { gte: from, lte: to },
                            },
                        },
                        select: { unitPrice: true, quantity: true, product: { select: { tvaRate: true } } },
                    }),
                ]);

                // Compute TVA from actual items
                let tvaCollected = 0;
                let taxableSales = 0;
                [...posItemsTVA, ...salesItemsTVA].forEach((item: any) => {
                    const tvaRate = Number(item.product?.tvaRate || 19) / 100;
                    const price = Number(item.price ?? item.unitPrice ?? 0);
                    const qty = Number(item.quantity ?? 1);
                    const ttc = price * qty;
                    const ht = ttc / (1 + tvaRate);
                    tvaCollected += ttc - ht;
                    taxableSales += ht;
                });

                const totalPurchases = Number(purchasesAgg._sum.total || 0);
                // Estimate TVA deductible on purchases at 19% blended rate
                const tvaDeductible = totalPurchases * 0.19 / 1.19;
                const taxablePurchases = totalPurchases - tvaDeductible;
                const netTva = tvaCollected - tvaDeductible;

                const now = new Date();
                const isCurrentMonth = from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear();
                const isPast = to < now && !isCurrentMonth;
                const status = isCurrentMonth ? "à_déposer" : isPast ? "payé" : "à_déposer";

                return {
                    month: format(from, "MMM", { locale: undefined }),
                    monthKey: format(from, "yyyy-MM"),
                    year: from.getFullYear(),
                    taxableSales: Math.round(taxableSales),
                    tvaCollected: Math.round(tvaCollected),
                    taxablePurchases: Math.round(taxablePurchases),
                    tvaDeductible: Math.round(tvaDeductible),
                    netTva: Math.round(netTva),
                    status,
                };
            })
        );

        // Sort chronologically (oldest first)
        monthlyData.reverse();

        return NextResponse.json({ months: monthlyData });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
