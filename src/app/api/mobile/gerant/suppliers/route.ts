import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/gerant/suppliers — Supplier obligation overview
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { searchParams } = new URL(req.url);
        const sort = searchParams.get("sort") || "debt"; // debt, name, recent
        const limit = parseInt(searchParams.get("limit") || "50");
        const showAll = searchParams.get("all") === "true"; // show even zero-balance suppliers

        // ── Get suppliers ───────────────────────────────────────────
        const whereClause: any = { tenantId };
        if (!showAll) {
            whereClause.balance = { not: 0 };
        }

        const suppliers = await db.supplier.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                phone: true,
                balance: true,
                purchaseOrders: {
                    select: { createdAt: true, total: true, status: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        // ── Get last payment to each supplier from treasury ─────────
        const supplierIds = suppliers.map(s => s.id);
        
        // Find payment transactions for suppliers
        const supplierPayments = supplierIds.length > 0
            ? await db.treasuryTransaction.findMany({
                where: {
                    tenantId,
                    type: "OUTFLOW",
                    source: { in: ["PURCHASE", "PAYMENT", "SUPPLIER_PAYMENT"] },
                },
                select: {
                    referenceId: true,
                    createdAt: true,
                    amount: true,
                },
                orderBy: { createdAt: "desc" },
                take: 500,
            })
            : [];

        const now = new Date();

        // ── Enrich each supplier ────────────────────────────────────
        const enriched = suppliers.map(s => {
            const balance = Number(s.balance);
            const lastPurchase = s.purchaseOrders[0] || null;
            const lastPurchaseDate = lastPurchase?.createdAt || null;
            const daysSinceLastPurchase = lastPurchaseDate
                ? Math.floor((now.getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                id: s.id,
                name: s.name,
                phone: s.phone,
                balance: Math.round(balance), // positive = we owe them, negative = they owe us (overpaid)
                status: balance > 0 ? "NOUS_DEVONS" : balance < 0 ? "ILS_DOIVENT" : "SOLDÉ",
                lastPurchaseDate: lastPurchaseDate
                    ? new Date(lastPurchaseDate).toISOString().split("T")[0]
                    : null,
                daysSinceLastPurchase,
            };
        });

        // ── Sort ────────────────────────────────────────────────────
        if (sort === "name") {
            enriched.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "recent") {
            enriched.sort((a, b) => (a.daysSinceLastPurchase ?? 9999) - (b.daysSinceLastPurchase ?? 9999));
        } else {
            // Default: highest debt first (what we owe them)
            enriched.sort((a, b) => b.balance - a.balance);
        }

        const results = enriched.slice(0, limit);

        // ── Summary ─────────────────────────────────────────────────
        const weOwe = enriched.filter(s => s.balance > 0);
        const theyOwe = enriched.filter(s => s.balance < 0);

        const totalWeOwe = weOwe.reduce((sum, s) => sum + s.balance, 0);
        const totalTheyOwe = theyOwe.reduce((sum, s) => sum + Math.abs(s.balance), 0);

        // Find recent supplier payments
        const recentPayments = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                type: "OUTFLOW",
                source: { in: ["PURCHASE", "PAYMENT", "SUPPLIER_PAYMENT"] },
            },
            select: {
                id: true,
                amount: true,
                date: true,
                description: true,
                referenceId: true,
                account: { select: { type: true } },
            },
            orderBy: { date: "desc" },
            take: 30,
        });

        const allSuppliers = await db.supplier.findMany({
            where: { tenantId },
            select: { id: true, name: true },
        });
        const nameMap = new Map(allSuppliers.map(s => [s.id, s.name]));

        const mappedPayments = recentPayments.map(p => {
            const supplierName = p.referenceId ? (nameMap.get(p.referenceId) || "Fournisseur") : "Fournisseur";
            let method: "especes" | "cheque" | "virement" = "especes";
            if (p.account?.type === "BANK") method = "virement";
            
            return {
                id: p.id,
                supplierId: p.referenceId || "",
                supplierName,
                amount: Math.round(Number(p.amount)),
                method,
                date: p.date.toLocaleDateString("fr-FR"),
                reference: p.description || "Paiement",
            };
        });

        return NextResponse.json({
            summary: {
                totalWeOwe: Math.round(totalWeOwe),
                suppliersWeOwe: weOwe.length,
                totalTheyOwe: Math.round(totalTheyOwe),
                suppliersTheyOwe: theyOwe.length,
                netPosition: Math.round(totalWeOwe - totalTheyOwe),
            },
            suppliers: results,
            payments: mappedPayments,
            meta: {
                total: enriched.length,
                returned: results.length,
                sort,
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
