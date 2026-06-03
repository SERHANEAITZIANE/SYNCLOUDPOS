import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { subDays } from "date-fns";

// GET /api/mobile/gerant/stock-health — Stock intelligence for the manager
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

        // ── Parallel queries ────────────────────────────────────────
        const [
            allProducts,
            // Sales velocity for last 30 days
            salesVelocity,
        ] = await Promise.all([
            // All active products with stock info
            db.product.findMany({
                where: { tenantId, isArchived: false },
                select: {
                    id: true,
                    name: true,
                    stock: true,
                    minStock: true,
                    cost: true,
                    price: true,
                    storeProducts: {
                        where: storeId ? { storeId } : undefined,
                        select: { stock: true, minStock: true },
                    },
                },
            }),
            // Products sold in last 30 days (aggregated quantities)
            db.orderItem.groupBy({
                by: ["productId"],
                where: {
                    order: {
                        tenantId,
                        storeId: storeId || undefined,
                        status: "COMPLETED",
                        createdAt: { gte: thirtyDaysAgo },
                    },
                },
                _sum: { quantity: true },
            }),
        ]);

        // Build velocity map
        const velocityMap = new Map(salesVelocity.map(v => [v.productId, v._sum.quantity || 0]));

        // ── Analyze each product ────────────────────────────────────
        const zeroStock: any[] = [];
        const lowStock: any[] = [];
        const overstocked: any[] = [];
        const slowMovers: any[] = [];
        const fastMovers: any[] = [];

        let totalStockValue = 0;
        let totalRetailValue = 0;

        allProducts.forEach(p => {
            const stock = p.storeProducts.length > 0
                ? p.storeProducts.reduce((s, sp) => s + sp.stock, 0)
                : p.stock;
            const minStock = p.storeProducts.length > 0
                ? p.storeProducts.reduce((s, sp) => s + sp.minStock, 0)
                : p.minStock;
            const cost = Number(p.cost || 0);
            const price = Number(p.price || 0);
            const velocity = velocityMap.get(p.id) || 0; // units sold in 30 days
            const dailyAvg = velocity / 30;
            const daysOfStock = dailyAvg > 0 ? Math.round(stock / dailyAvg) : stock > 0 ? 999 : 0;

            totalStockValue += stock * cost;
            totalRetailValue += stock * price;

            const productInfo = {
                id: p.id,
                name: p.name,
                stock,
                minStock,
                cost: Math.round(cost),
                monthSales: velocity,
                dailyAvg: Math.round(dailyAvg * 10) / 10,
                daysOfStock,
                stockValue: Math.round(stock * cost),
            };

            // Zero stock with recent demand
            if (stock <= 0 && velocity > 0) {
                zeroStock.push(productInfo);
            }
            // Low stock (below min threshold)
            else if (stock > 0 && minStock > 0 && stock <= minStock) {
                lowStock.push(productInfo);
            }
            // Overstocked (stock > 3x monthly average)
            if (stock > 0 && velocity > 0 && stock > velocity * 3) {
                overstocked.push(productInfo);
            }
            // Slow movers (no sales in 30 days but has stock)
            if (stock > 0 && velocity === 0) {
                slowMovers.push(productInfo);
            }
            // Fast movers (high velocity)
            if (velocity > 0) {
                fastMovers.push({ ...productInfo, velocity });
            }
        });

        // Sort each category
        zeroStock.sort((a, b) => b.monthSales - a.monthSales); // Highest demand first
        lowStock.sort((a, b) => a.daysOfStock - b.daysOfStock); // Running out soonest
        overstocked.sort((a, b) => b.stockValue - a.stockValue); // Highest value tied up
        slowMovers.sort((a, b) => b.stockValue - a.stockValue); // Highest value wasted
        fastMovers.sort((a, b) => b.velocity - a.velocity); // Fastest sellers

        return NextResponse.json({
            summary: {
                totalProducts: allProducts.length,
                totalStockValue: Math.round(totalStockValue),
                totalRetailValue: Math.round(totalRetailValue),
                potentialProfit: Math.round(totalRetailValue - totalStockValue),
                zeroStockCount: zeroStock.length,
                lowStockCount: lowStock.length,
                overstockedCount: overstocked.length,
                slowMoverCount: slowMovers.length,
            },
            zeroStock: zeroStock.slice(0, 15),
            lowStock: lowStock.slice(0, 15),
            overstocked: overstocked.slice(0, 15),
            slowMovers: slowMovers.slice(0, 15),
            fastMovers: fastMovers.slice(0, 10),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
