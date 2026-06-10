import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/gerant/debts — Client debt overview with aging brackets
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { searchParams } = new URL(req.url);
        const segment = searchParams.get("segment"); // all, overdue, critical
        const sort = searchParams.get("sort") || "debt"; // debt, name, recent
        const limit = parseInt(searchParams.get("limit") || "50");
        const clientType = searchParams.get("clientType"); // RETAIL, WHOLESALE, RESELLER, or null

        // ── Get all clients with debt ───
        const customerFilter: any = {
            tenantId,
            balance: { lt: 0 },
            isArchived: false,
        };

        if (clientType) {
            customerFilter.clientType = clientType;
        }

        const debtors = await db.customer.findMany({
            where: customerFilter,
            select: {
                id: true,
                name: true,
                phone: true,
                city: true,
                balance: true,
                // Get most recent order to compute "days since last purchase"
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
        });

        const now = new Date();

        // ── Process and enrich each debtor ──────────────────────────
        const enrichedDebtors = debtors.map(d => {
            const debt = Math.abs(Number(d.balance));

            // Last purchase date — take the most recent between orders and salesOrders
            const lastOrderDate = d.orders[0]?.createdAt || null;
            const lastSalesDate = d.salesOrders[0]?.createdAt || null;
            const lastPurchaseDate = lastOrderDate && lastSalesDate
                ? (new Date(lastOrderDate) > new Date(lastSalesDate) ? lastOrderDate : lastSalesDate)
                : lastOrderDate || lastSalesDate || null;

            const daysSinceLastPurchase = lastPurchaseDate
                ? Math.floor((now.getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
                : 9999;

            // Aging bracket
            let aging: "0-30" | "30-60" | "60-90" | "90+" = "0-30";
            if (daysSinceLastPurchase > 90) aging = "90+";
            else if (daysSinceLastPurchase > 60) aging = "60-90";
            else if (daysSinceLastPurchase > 30) aging = "30-60";

            return {
                id: d.id,
                name: d.name,
                phone: d.phone,
                city: d.city,
                debt,
                lastPurchaseDate: lastPurchaseDate ? new Date(lastPurchaseDate).toISOString().split("T")[0] : null,
                daysSinceLastPurchase: daysSinceLastPurchase === 9999 ? null : daysSinceLastPurchase,
                aging,
            };
        });

        // ── Filter by segment ───────────────────────────────────────
        let filtered = enrichedDebtors;
        if (segment === "overdue") {
            filtered = enrichedDebtors.filter(d => (d.daysSinceLastPurchase || 9999) > 30);
        } else if (segment === "critical") {
            filtered = enrichedDebtors.filter(d => (d.daysSinceLastPurchase || 9999) > 90);
        }

        // ── Sort ────────────────────────────────────────────────────
        if (sort === "name") {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "recent") {
            filtered.sort((a, b) => (a.daysSinceLastPurchase || 9999) - (b.daysSinceLastPurchase || 9999));
        } else {
            // Default: sort by highest debt
            filtered.sort((a, b) => b.debt - a.debt);
        }

        // Limit results
        const results = filtered.slice(0, limit);

        // ── Aging summary ───────────────────────────────────────────
        const agingSummary = {
            "0-30": { count: 0, total: 0 },
            "30-60": { count: 0, total: 0 },
            "60-90": { count: 0, total: 0 },
            "90+": { count: 0, total: 0 },
        };

        enrichedDebtors.forEach(d => {
            agingSummary[d.aging].count++;
            agingSummary[d.aging].total += d.debt;
        });

        // Round totals
        Object.values(agingSummary).forEach(v => { v.total = Math.round(v.total); });

        const totalDebt = enrichedDebtors.reduce((sum, d) => sum + d.debt, 0);

        return NextResponse.json({
            summary: {
                totalDebt: Math.round(totalDebt),
                debtorCount: enrichedDebtors.length,
                aging: agingSummary,
            },
            clients: results.map(r => ({
                ...r,
                debt: Math.round(r.debt),
            })),
            meta: {
                total: filtered.length,
                returned: results.length,
                segment: segment || "all",
                sort,
            },
            debtors: results.map(r => ({
                id: r.id,
                name: r.name,
                phone: r.phone || "",
                balance: Math.round(r.debt),
                agingBucket: r.aging,
                lastSaleDate: r.lastPurchaseDate,
                daysOverdue: r.daysSinceLastPurchase || 0,
            })),
            aging: {
                bucket0_30: Math.round(agingSummary["0-30"].total),
                bucket30_60: Math.round(agingSummary["30-60"].total),
                bucket60_90: Math.round(agingSummary["60-90"].total),
                bucket90plus: Math.round(agingSummary["90+"].total),
            },
            totals: {
                clientsOweUs: Math.round(totalDebt),
                clientDebtorCount: enrichedDebtors.length,
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
