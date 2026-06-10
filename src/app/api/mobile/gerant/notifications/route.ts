import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { subDays } from "date-fns";

// GET /api/mobile/gerant/notifications — Proactive business notifications stream
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

        // Run queries in parallel
        const [
            zeroStockProducts,
            criticalDebtors,
            expiringPromos,
            pendingReturns,
            lowStockProducts,
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
                select: { id: true, name: true, createdAt: true },
                take: 10,
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
                    balance: true,
                    createdAt: true,
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
                take: 10,
            }),
            // 3. Promotions ending soon
            db.promotion.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    endsAt: { gte: now, lte: threeDaysFromNow },
                },
                select: { id: true, name: true, endsAt: true, discountValue: true, createdAt: true },
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
                take: 20,
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

        const notifications: Array<{
            id: string;
            type: "STOCK" | "FINANCE" | "VENTES" | "SYSTEME";
            severity: "critical" | "warning" | "info";
            title: string;
            message: string;
            timestamp: string;
            data?: any;
        }> = [];

        // 1. Stock ruptures (Critical)
        zeroStockProducts.forEach(p => {
            notifications.push({
                id: `rupture-${p.id}`,
                type: "STOCK",
                severity: "critical",
                title: "Rupture de Stock Critique",
                message: `Le produit "${p.name}" est en rupture complète de stock avec des ventes récentes.`,
                timestamp: p.createdAt.toISOString(),
                data: { productId: p.id },
            });
        });

        // 2. Low Stock (Warning)
        const actualLowStock = lowStockProducts.filter(p => {
            const sp = p.storeProducts[0];
            return sp && sp.stock <= sp.minStock && sp.minStock > 0;
        });
        actualLowStock.forEach(p => {
            notifications.push({
                id: `lowstock-${p.id}`,
                type: "STOCK",
                severity: "warning",
                title: "Niveau de Stock Faible",
                message: `Le produit "${p.name}" est sous le seuil minimum (Stock: ${p.storeProducts[0]?.stock}, Min: ${p.storeProducts[0]?.minStock}).`,
                timestamp: p.createdAt.toISOString(),
                data: { productId: p.id },
            });
        });

        // 3. Critical Debts (Critical)
        const criticalClients = criticalDebtors.filter(c => {
            const lastOrder = c.orders[0]?.createdAt || null;
            const lastSale = c.salesOrders[0]?.createdAt || null;
            const lastDate = lastOrder && lastSale
                ? (new Date(lastOrder) > new Date(lastSale) ? lastOrder : lastSale)
                : lastOrder || lastSale;
            if (!lastDate) return true;
            const days = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
            return days > 60;
        });
        criticalClients.forEach(c => {
            const debt = Math.abs(Number(c.balance));
            notifications.push({
                id: `debt-${c.id}`,
                type: "FINANCE",
                severity: "critical",
                title: "Créance Client Critique",
                message: `Le client "${c.name}" a une dette de ${debt.toLocaleString()} DA et est inactif depuis plus de 60 jours.`,
                timestamp: c.createdAt.toISOString(),
                data: { customerId: c.id },
            });
        });

        // 4. Large Unpaid Bills (Warning)
        largeUnpaidOrders.forEach(o => {
            const remaining = Math.round(Number(o.total) - Number(o.amountPaid));
            notifications.push({
                id: `unpaid-${o.id}`,
                type: "VENTES",
                severity: "warning",
                title: "Facture Impayée Importante",
                message: `Le BL ${o.receiptNumber || ""} pour "${o.customer.name}" de ${Math.round(Number(o.total)).toLocaleString()} DA est toujours en attente (Reste: ${remaining.toLocaleString()} DA).`,
                timestamp: o.createdAt.toISOString(),
                data: { salesOrderId: o.id },
            });
        });

        // 5. Pending Returns (Warning)
        pendingReturns.forEach(r => {
            notifications.push({
                id: `return-${r.id}`,
                type: "FINANCE",
                severity: "warning",
                title: "Retour Fournisseur en Attente",
                message: `Le retour fournisseur pour "${r.supplier.name}" de ${Math.round(Number(r.totalAmount)).toLocaleString()} DA est en attente d'encaissement/crédit.`,
                timestamp: r.createdAt.toISOString(),
                data: { supplierReturnId: r.id },
            });
        });

        // 6. Expiring Promos (Info)
        expiringPromos.forEach(p => {
            notifications.push({
                id: `promo-${p.id}`,
                type: "SYSTEME",
                severity: "info",
                title: "Promotion expire bientôt",
                message: `La promotion "${p.name}" (-${p.discountValue}%) expire dans moins de 3 jours.`,
                timestamp: p.createdAt.toISOString(),
                data: { promoId: p.id },
            });
        });

        // Sort notifications by timestamp desc
        notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({
            notifications,
            unreadCount: notifications.length, // Client will subtract read IDs from this count
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
