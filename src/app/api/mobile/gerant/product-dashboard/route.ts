import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { subDays } from "date-fns";

// GET /api/mobile/gerant/product-dashboard
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }
        const tenantId = user.tenantId;

        const { searchParams } = new URL(req.url);
        const sort = searchParams.get("sort") || "best_seller_revenue"; // best_seller_revenue | best_seller_qty | highest_margin | lowest_stock
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId") || "";

        // Resolve default store
        const dbUser = await db.user.findUnique({
            where: { id: user.userId },
            select: { defaultStoreId: true },
        });
        const storeId = dbUser?.defaultStoreId || (await db.store.findFirst({ where: { tenantId } }))?.id;

        const thirtyDaysAgo = subDays(new Date(), 30);

        // Fetch products matching search and category
        const productsWhereClause: any = {
            tenantId,
            isArchived: false,
        };

        if (search) {
            productsWhereClause.name = { contains: search, mode: "insensitive" };
        }

        if (categoryId) {
            productsWhereClause.categoryId = categoryId;
        }

        const [products, posItems, salesItems] = await Promise.all([
            db.product.findMany({
                where: productsWhereClause,
                select: {
                    id: true,
                    name: true,
                    price: true,
                    cost: true,
                    storeProducts: {
                        where: { storeId: storeId || undefined },
                        select: { stock: true, minStock: true },
                    },
                    category: { select: { name: true } },
                },
            }),
            db.orderItem.findMany({
                where: {
                    order: {
                        tenantId,
                        status: "COMPLETED",
                        createdAt: { gte: thirtyDaysAgo },
                    },
                },
                select: {
                    productId: true,
                    quantity: true,
                    price: true,
                },
            }),
            db.salesOrderItem.findMany({
                where: {
                    salesOrder: {
                        tenantId,
                        status: { not: "CANCELLED" },
                        createdAt: { gte: thirtyDaysAgo },
                    },
                },
                select: {
                    productId: true,
                    quantity: true,
                    unitPrice: true,
                },
            }),
        ]);

        // Aggregate 30-day sales
        const productSales: Record<string, { revenue: number; qtySold: number }> = {};

        posItems.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { revenue: 0, qtySold: 0 };
            }
            productSales[item.productId].revenue += Number(item.price) * item.quantity;
            productSales[item.productId].qtySold += item.quantity;
        });

        salesItems.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { revenue: 0, qtySold: 0 };
            }
            productSales[item.productId].revenue += Number(item.unitPrice) * item.quantity;
            productSales[item.productId].qtySold += item.quantity;
        });

        // Enrich products
        let enriched = products.map(p => {
            const sale = productSales[p.id] || { revenue: 0, qtySold: 0 };
            const stockRecord = p.storeProducts[0];
            const stock = stockRecord?.stock || 0;
            const minStock = stockRecord?.minStock || 0;
            const cost = Number(p.cost || 0);
            const price = Number(p.price);

            const marginDA = price - cost;
            const marginPct = price > 0 ? (marginDA / price) * 100 : 0;

            // Velocity is items sold per day (over 30 days)
            const velocity = Math.round((sale.qtySold / 30) * 100) / 100;

            return {
                id: p.id,
                name: p.name,
                categoryName: p.category?.name || "Sans catégorie",
                price: Math.round(price),
                cost: Math.round(cost),
                stock,
                minStock,
                qtySold30d: sale.qtySold,
                revenue30d: Math.round(sale.revenue),
                marginDA: Math.round(marginDA),
                marginPct: Math.round(marginPct * 10) / 10,
                velocity,
                status: stock <= 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "OK",
            };
        });

        // Apply Sorting
        if (sort === "best_seller_qty") {
            enriched.sort((a, b) => b.qtySold30d - a.qtySold30d);
        } else if (sort === "highest_margin") {
            enriched.sort((a, b) => b.marginPct - a.marginPct);
        } else if (sort === "lowest_stock") {
            enriched.sort((a, b) => a.stock - b.stock);
        } else {
            // Default: best_seller_revenue
            enriched.sort((a, b) => b.revenue30d - a.revenue30d);
        }

        return NextResponse.json({
            products: enriched.slice(0, 100), // Limit to top 100 results for mobile performance
            count: enriched.length,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
