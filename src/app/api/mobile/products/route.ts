import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/products — List products for BL creation
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("q") || "";
        const barcode = searchParams.get("barcode");
        const categoryId = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const where: any = {
            tenantId: user.tenantId,
            isArchived: false,
        };

        if (barcode) {
            // Barcode scan
            where.OR = [
                { barcodes: { some: { code: barcode } } },
            ];
        } else if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
            ];
        }

        if (categoryId) where.categoryId = categoryId;

        const [products, total] = await Promise.all([
            db.product.findMany({
                where,
                select: {
                    id: true, name: true, price: true, cost: true,
                    wholesalePrice: true, dealerPrice: true,
                    tvaRate: true, stock: true, minStock: true,
                    categoryId: true,
                    category: { select: { id: true, name: true } },
                    barcodes: { select: { code: true, type: true } },
                    images: { select: { url: true }, take: 1 },
                },
                orderBy: { name: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.product.count({ where }),
        ]);

        return NextResponse.json({
            products: products.map(p => ({
                ...p,
                price: Number(p.price),
                cost: p.cost ? Number(p.cost) : null,
                wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
                dealerPrice: p.dealerPrice ? Number(p.dealerPrice) : null,
                tvaRate: Number(p.tvaRate),
                imageUrl: p.images[0]?.url || null,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
