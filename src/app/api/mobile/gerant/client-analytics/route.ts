import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { subDays } from "date-fns";

// GET /api/mobile/gerant/client-analytics
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }
        const tenantId = user.tenantId;

        const { searchParams } = new URL(req.url);
        const segment = searchParams.get("segment") || "all"; // all | fidele | nouveau | dormant | debiteur
        const sort = searchParams.get("sort") || "revenue"; // revenue | debt | frequency
        const search = searchParams.get("search") || "";

        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);

        // Fetch customers with their orders
        const customerWhere: any = {
            tenantId,
            isArchived: false,
        };

        if (search) {
            customerWhere.name = { contains: search, mode: "insensitive" };
        }

        const customers = await db.customer.findMany({
            where: customerWhere,
            select: {
                id: true,
                name: true,
                phone: true,
                balance: true,
                clientType: true,
                createdAt: true,
                orders: {
                    select: { total: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                },
                salesOrders: {
                    select: { total: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        // Enrich and segment
        const enriched = customers.map(c => {
            const totalPosOrders = c.orders.length;
            const totalSalesOrders = c.salesOrders.length;
            const totalOrders = totalPosOrders + totalSalesOrders;

            const posRevenue = c.orders.reduce((sum, o) => sum + Number(o.total), 0);
            const salesRevenue = c.salesOrders.reduce((sum, o) => sum + Number(o.total), 0);
            const totalRevenue = Math.round(posRevenue + salesRevenue);

            const debt = Math.round(Math.abs(Number(c.balance)));
            const owesUs = Number(c.balance) < 0;

            const lastOrderDate = c.orders[0]?.createdAt || null;
            const lastSalesDate = c.salesOrders[0]?.createdAt || null;
            const lastPurchaseDate = lastOrderDate && lastSalesDate
                ? (new Date(lastOrderDate) > new Date(lastSalesDate) ? lastOrderDate : lastSalesDate)
                : lastOrderDate || lastSalesDate || null;

            const daysSinceLastPurchase = lastPurchaseDate
                ? Math.floor((now.getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
                : 9999;

            // Segmenting
            let calculatedSegment: "FIDELE" | "NOUVEAU" | "DORMANT" | "REGULIER" | "INACTIF" = "REGULIER";
            if (totalOrders === 0) {
                calculatedSegment = "INACTIF";
            } else if (daysSinceLastPurchase > 45) {
                calculatedSegment = "DORMANT";
            } else if (totalOrders >= 10) {
                calculatedSegment = "FIDELE";
            } else if (totalOrders <= 2) {
                calculatedSegment = "NOUVEAU";
            }

            return {
                id: c.id,
                name: c.name,
                phone: c.phone || "",
                clientType: c.clientType,
                debt,
                owesUs,
                totalRevenue,
                totalOrders,
                daysSinceLastPurchase: daysSinceLastPurchase === 9999 ? null : daysSinceLastPurchase,
                lastPurchaseDate: lastPurchaseDate ? new Date(lastPurchaseDate).toISOString().split("T")[0] : null,
                segment: calculatedSegment,
            };
        });

        // Apply Segment Filtering
        let filtered = enriched;
        if (segment === "fidele") {
            filtered = enriched.filter(c => c.segment === "FIDELE");
        } else if (segment === "nouveau") {
            filtered = enriched.filter(c => c.segment === "NOUVEAU");
        } else if (segment === "dormant") {
            filtered = enriched.filter(c => c.segment === "DORMANT");
        } else if (segment === "debiteur") {
            filtered = enriched.filter(c => c.owesUs && c.debt > 0);
        }

        // Apply Sorting
        if (sort === "debt") {
            filtered.sort((a, b) => b.debt - a.debt);
        } else if (sort === "frequency") {
            filtered.sort((a, b) => b.totalOrders - a.totalOrders);
        } else {
            // Default: sort by total revenue contribution
            filtered.sort((a, b) => b.totalRevenue - a.totalRevenue);
        }

        // Segment Stats
        const stats = {
            total: enriched.length,
            fidele: enriched.filter(c => c.segment === "FIDELE").length,
            nouveau: enriched.filter(c => c.segment === "NOUVEAU").length,
            dormant: enriched.filter(c => c.segment === "DORMANT").length,
            debiteurs: enriched.filter(c => c.owesUs && c.debt > 0).length,
        };

        return NextResponse.json({
            clients: filtered.slice(0, 50), // Limit results for mobile performance
            stats,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
