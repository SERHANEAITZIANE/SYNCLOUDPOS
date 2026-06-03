import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { subDays } from "date-fns";

// GET /api/mobile/gerant/alerts — Smart business alerts for the manager
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
        const thirtyDaysAgo = subDays(now, 30);
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // ── Run all alert queries in parallel ───────────────────────
        const [
            // 1. Stock ruptures — products at 0 stock that had sales recently
            zeroStockProducts,
            // 2. Critical debts — clients with > 90 days no purchase and debt
            criticalDebtors,
            // 3. Expiring promotions
            expiringPromos,
            // 4. Pending supplier returns (not yet credited)
            pendingReturns,
            // 5. Low stock products (below min threshold)
            lowStockProducts,
            // 6. Large unpaid orders (> 50,000 DA)
            largeUnpaidOrders,
        ] = await Promise.all([
            // 1. Zero stock products with recent sales
            db.product.findMany({
                where: {
                    tenantId,
                    isArchived: false,
                    stock: { lte: 0 },
                    orderItems: {
                        some: {
                            order: {
                                status: "COMPLETED",
                                createdAt: { gte: thirtyDaysAgo },
                            },
                        },
                    },
                },
                select: { id: true, name: true, stock: true },
                take: 20,
            }),
            // 2. Critical debtors (balance < -10000 and no recent activity)
            db.customer.findMany({
                where: {
                    tenantId,
                    balance: { lt: -10000 },
                    isArchived: false,
                },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    balance: true,
                    orders: {
                        select: { createdAt: true },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                    salesOrders: {
                        select: { createdAt: true },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
                take: 20,
            }),
            // 3. Promotions ending soon
            db.promotion.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    endsAt: { gte: now, lte: threeDaysFromNow },
                },
                select: { id: true, name: true, endsAt: true, discountValue: true },
            }),
            // 4. Pending supplier returns
            db.supplierReturn.findMany({
                where: {
                    tenantId,
                    status: { in: ["PENDING", "EN_ATTENTE"] },
                },
                select: {
                    id: true,
                    totalAmount: true,
                    createdAt: true,
                    supplier: { select: { name: true } },
                },
                take: 10,
            }),
            // 5. Low stock products (stock <= minStock but > 0)
            db.product.findMany({
                where: {
                    tenantId,
                    isArchived: false,
                    stock: { gt: 0 },
                    storeProducts: {
                        some: {
                            storeId: storeId || undefined,
                        },
                    },
                },
                include: {
                    storeProducts: {
                        where: { storeId: storeId || undefined },
                        select: { stock: true, minStock: true },
                    },
                },
                take: 100,
            }),
            // 6. Large unpaid BLs
            db.salesOrder.findMany({
                where: {
                    tenantId,
                    paymentStatus: { in: ["PENDING", "PARTIAL"] },
                    total: { gte: 50000 },
                },
                select: {
                    id: true,
                    receiptNumber: true,
                    total: true,
                    amountPaid: true,
                    createdAt: true,
                    customer: { select: { name: true } },
                },
                orderBy: { total: "desc" },
                take: 10,
            }),
        ]);

        // ── Process alerts ──────────────────────────────────────────
        const alerts: Array<{
            type: string;
            severity: "critical" | "warning" | "info";
            title: string;
            message: string;
            data?: any;
        }> = [];

        // Stock ruptures
        if (zeroStockProducts.length > 0) {
            alerts.push({
                type: "STOCK_RUPTURE",
                severity: "critical",
                title: `${zeroStockProducts.length} rupture(s) de stock`,
                message: `Produits à 0 stock avec des ventes récentes: ${zeroStockProducts.slice(0, 3).map(p => p.name).join(", ")}${zeroStockProducts.length > 3 ? "..." : ""}`,
                data: zeroStockProducts.map(p => ({ id: p.id, name: p.name })),
            });
        }

        // Low stock products
        const actualLowStock = lowStockProducts.filter(p => {
            const sp = p.storeProducts[0];
            return sp && sp.stock <= sp.minStock && sp.minStock > 0;
        });
        if (actualLowStock.length > 0) {
            alerts.push({
                type: "LOW_STOCK",
                severity: "warning",
                title: `${actualLowStock.length} produit(s) en stock faible`,
                message: `Produits sous le seuil minimum: ${actualLowStock.slice(0, 3).map(p => p.name).join(", ")}${actualLowStock.length > 3 ? "..." : ""}`,
                data: actualLowStock.slice(0, 10).map(p => ({
                    id: p.id,
                    name: p.name,
                    stock: p.storeProducts[0]?.stock || 0,
                    minStock: p.storeProducts[0]?.minStock || 0,
                })),
            });
        }

        // Critical debtors (debt > 10k DA and no activity in 60+ days)
        const criticalClients = criticalDebtors.filter(c => {
            const lastOrder = c.orders[0]?.createdAt || null;
            const lastSale = c.salesOrders[0]?.createdAt || null;
            const lastDate = lastOrder && lastSale
                ? (new Date(lastOrder) > new Date(lastSale) ? lastOrder : lastSale)
                : lastOrder || lastSale;
            if (!lastDate) return true; // Never purchased, has debt somehow
            const days = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
            return days > 60;
        });

        if (criticalClients.length > 0) {
            alerts.push({
                type: "CRITICAL_DEBT",
                severity: "critical",
                title: `${criticalClients.length} créance(s) critique(s)`,
                message: `Clients avec dette > 10 000 DA et inactifs depuis 60+ jours`,
                data: criticalClients.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    debt: Math.abs(Number(c.balance)),
                })),
            });
        }

        // Expiring promotions
        if (expiringPromos.length > 0) {
            alerts.push({
                type: "EXPIRING_PROMO",
                severity: "info",
                title: `${expiringPromos.length} promotion(s) expire(nt) bientôt`,
                message: expiringPromos.map(p => `"${p.name}" (-${p.discountValue}%)`).join(", "),
                data: expiringPromos,
            });
        }

        // Pending supplier returns
        if (pendingReturns.length > 0) {
            const totalPending = pendingReturns.reduce((s, r) => s + Number(r.totalAmount), 0);
            alerts.push({
                type: "PENDING_SUPPLIER_RETURN",
                severity: "warning",
                title: `${pendingReturns.length} retour(s) fournisseur en attente`,
                message: `Montant total: ${Math.round(totalPending).toLocaleString()} DA`,
                data: pendingReturns.map(r => ({
                    id: r.id,
                    supplier: r.supplier.name,
                    amount: Math.round(Number(r.totalAmount)),
                    date: r.createdAt.toISOString().split("T")[0],
                })),
            });
        }

        // Large unpaid orders
        if (largeUnpaidOrders.length > 0) {
            alerts.push({
                type: "LARGE_UNPAID",
                severity: "warning",
                title: `${largeUnpaidOrders.length} grosse(s) facture(s) impayée(s)`,
                message: `BLs > 50 000 DA en attente de paiement`,
                data: largeUnpaidOrders.map(o => ({
                    id: o.id,
                    receipt: o.receiptNumber,
                    customer: o.customer.name,
                    total: Math.round(Number(o.total)),
                    paid: Math.round(Number(o.amountPaid)),
                    remaining: Math.round(Number(o.total) - Number(o.amountPaid)),
                })),
            });
        }

        // Sort by severity: critical first, then warning, then info
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return NextResponse.json({
            alertCount: alerts.length,
            criticalCount: alerts.filter(a => a.severity === "critical").length,
            warningCount: alerts.filter(a => a.severity === "warning").length,
            infoCount: alerts.filter(a => a.severity === "info").length,
            alerts,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
