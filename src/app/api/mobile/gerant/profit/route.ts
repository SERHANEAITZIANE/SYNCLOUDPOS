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

        // Parse query filters
        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");
        const clientType = searchParams.get("clientType"); // RETAIL, WHOLESALE, RESELLER, or null

        const fromDate = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(subDays(new Date(), 30));
        const toDate = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());

        // Fetch all active products
        const products = await db.product.findMany({
            where: { tenantId, isArchived: false },
            select: {
                id: true,
                name: true,
                cost: true,
                category: { select: { name: true } },
            },
        });

        // Setup filter clauses for POS orders
        const orderFilter: any = {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: fromDate, lte: toDate },
        };

        if (clientType) {
            if (clientType === "RETAIL") {
                orderFilter.OR = [
                    { customer: { clientType: "RETAIL" } },
                    { customerId: null }
                ];
            } else {
                orderFilter.customer = { clientType };
            }
        }

        // Fetch sold items in the period (POS)
        const posItems = await db.orderItem.findMany({
            where: { order: orderFilter },
            select: {
                productId: true,
                quantity: true,
                price: true,
            },
        });

        // Setup filter clauses for Sales Orders (BL)
        const salesOrderFilter: any = {
            tenantId,
            status: { not: "CANCELLED" },
            createdAt: { gte: fromDate, lte: toDate },
        };

        if (clientType) {
            salesOrderFilter.customer = { clientType };
        }

        // Fetch sold items in the period (Sales Orders/BL)
        const salesItems = await db.salesOrderItem.findMany({
            where: { salesOrder: salesOrderFilter },
            select: {
                productId: true,
                quantity: true,
                unitPrice: true,
            },
        });

        // Aggregate by product
        const salesByProduct: Record<string, { revenue: number; qtySold: number }> = {};

        posItems.forEach(item => {
            if (!salesByProduct[item.productId]) {
                salesByProduct[item.productId] = { revenue: 0, qtySold: 0 };
            }
            salesByProduct[item.productId].revenue += Number(item.price) * item.quantity;
            salesByProduct[item.productId].qtySold += item.quantity;
        });

        salesItems.forEach(item => {
            if (!salesByProduct[item.productId]) {
                salesByProduct[item.productId] = { revenue: 0, qtySold: 0 };
            }
            salesByProduct[item.productId].revenue += Number(item.unitPrice) * item.quantity;
            salesByProduct[item.productId].qtySold += item.quantity;
        });

        // Compute product profit items
        const profitProducts: any[] = [];
        const categoryMap: Record<string, { name: string; revenue: number; cost: number; marginDA: number }> = {};

        products.forEach(p => {
            const sale = salesByProduct[p.id];
            if (!sale || sale.qtySold === 0) return;

            const revenue = sale.revenue;
            const cost = sale.qtySold * Number(p.cost || 0);
            const marginDA = revenue - cost;
            const marginPct = revenue > 0 ? (marginDA / revenue) * 100 : 0;

            const categoryName = p.category?.name || "Sans catégorie";

            profitProducts.push({
                name: p.name,
                revenue: Math.round(revenue),
                cost: Math.round(cost),
                marginDA: Math.round(marginDA),
                marginPct: Math.round(marginPct * 10) / 10,
                qtySold: sale.qtySold,
            });

            // Aggregate by category
            if (!categoryMap[categoryName]) {
                categoryMap[categoryName] = { name: categoryName, revenue: 0, cost: 0, marginDA: 0 };
            }
            categoryMap[categoryName].revenue += revenue;
            categoryMap[categoryName].cost += cost;
            categoryMap[categoryName].marginDA += marginDA;
        });

        // Convert categories map to array
        const profitCategories = Object.values(categoryMap).map(c => {
            const marginPct = c.revenue > 0 ? (c.marginDA / c.revenue) * 100 : 0;
            return {
                name: c.name,
                revenue: Math.round(c.revenue),
                cost: Math.round(c.cost),
                marginDA: Math.round(c.marginDA),
                marginPct: Math.round(marginPct * 10) / 10,
            };
        });

        // Totals
        const totalRevenue = profitProducts.reduce((s, p) => s + p.revenue, 0);
        const totalCost = profitProducts.reduce((s, p) => s + p.cost, 0);
        const totalMarginDA = totalRevenue - totalCost;
        const totalMarginPct = totalRevenue > 0 ? (totalMarginDA / totalRevenue) * 100 : 0;

        return NextResponse.json({
            totalRevenue,
            totalCost,
            totalMarginDA,
            totalMarginPct: Math.round(totalMarginPct * 10) / 10,
            products: profitProducts,
            categories: profitCategories,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
