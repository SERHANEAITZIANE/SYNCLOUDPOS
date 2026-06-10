import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

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

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // sales, purchases, expenses, all
        const limit = parseInt(searchParams.get("limit") || "30", 10);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const skip = (page - 1) * limit;

        const fetchSales = type === "sales" || type === "all" || !type;
        const fetchPurchases = type === "purchases" || type === "all" || !type;
        const fetchExpenses = type === "expenses" || type === "all" || !type;

        const promises = [];

        if (fetchSales) {
            promises.push(
                db.order.findMany({
                    where: { tenantId, storeId: storeId || undefined, status: "COMPLETED" },
                    take: limit + skip,
                    orderBy: { createdAt: "desc" },
                    select: { id: true, total: true, createdAt: true, customer: { select: { name: true } } }
                }).then(res => res.map(o => ({
                    id: `pos-${o.id}`,
                    type: "sale_pos",
                    title: `Vente POS · ${o.customer?.name || "Client Comptant"}`,
                    description: `Vente validée de ${o.total.toLocaleString()} DA`,
                    amount: o.total,
                    createdAt: o.createdAt,
                })))
            );
            promises.push(
                db.salesOrder.findMany({
                    where: { tenantId, storeId: storeId || undefined, status: { not: "CANCELLED" } },
                    take: limit + skip,
                    orderBy: { createdAt: "desc" },
                    select: { id: true, total: true, createdAt: true, customer: { select: { name: true } } }
                }).then(res => res.map(o => ({
                    id: `bl-${o.id}`,
                    type: "sale_bl",
                    title: `Bon de Livraison · ${o.customer?.name || "Client Direct"}`,
                    description: `BL d'un montant de ${o.total.toLocaleString()} DA`,
                    amount: o.total,
                    createdAt: o.createdAt,
                })))
            );
        }

        if (fetchPurchases) {
            promises.push(
                db.purchaseOrder.findMany({
                    where: { tenantId, storeId: storeId || undefined },
                    take: limit + skip,
                    orderBy: { createdAt: "desc" },
                    select: { id: true, total: true, createdAt: true, supplier: { select: { name: true } } }
                }).then(res => res.map(o => ({
                    id: `po-${o.id}`,
                    type: "purchase",
                    title: `Achat · ${o.supplier?.name || "Fournisseur"}`,
                    description: `Achat d'un montant de ${o.total.toLocaleString()} DA`,
                    amount: -o.total,
                    createdAt: o.createdAt,
                })))
            );
        }

        if (fetchExpenses) {
            promises.push(
                db.expense.findMany({
                    where: { tenantId },
                    take: limit + skip,
                    orderBy: { date: "desc" },
                    select: { id: true, amount: true, description: true, date: true }
                }).then(res => res.map(e => ({
                    id: `exp-${e.id}`,
                    type: "expense",
                    title: `Dépense · ${e.description}`,
                    description: `Dépense enregistrée`,
                    amount: -e.amount,
                    createdAt: e.date,
                })))
            );
        }

        const results = await Promise.all(promises);
        const allEvents = results.flat();

        // Sort descending by date
        allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const paginatedEvents = allEvents.slice(skip, skip + limit);

        return NextResponse.json({
            events: paginatedEvents,
            hasMore: allEvents.length > skip + limit,
        });
    } catch (e: any) {
        return mobileErrorResponse(e);
    }
}
