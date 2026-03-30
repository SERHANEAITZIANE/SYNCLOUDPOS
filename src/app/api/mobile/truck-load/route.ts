import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/truck-load — Create truck load for a tour
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const { tourId, items } = body;

        if (!tourId || !items?.length) {
            return NextResponse.json(
                { error: "Tournée et articles requis" },
                { status: 400 }
            );
        }

        // Verify tour
        const tour = await db.deliveryTour.findFirst({
            where: { id: tourId, tenantId: user.tenantId },
        });
        if (!tour) {
            return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
        }

        // Check if truck load already exists
        const existing = await db.truckLoad.findFirst({
            where: { tourId },
        });
        if (existing) {
            return NextResponse.json({ error: "Chargement déjà effectué pour cette tournée" }, { status: 409 });
        }

        // Validate stock availability
        for (const item of items) {
            const product = await db.product.findFirst({
                where: { id: item.productId, tenantId: user.tenantId },
            });
            if (!product) {
                return NextResponse.json({ error: `Produit ${item.productId} introuvable` }, { status: 404 });
            }
            if (product.stock < item.quantity) {
                return NextResponse.json(
                    { error: `Stock insuffisant pour ${product.name}: ${product.stock} disponible, ${item.quantity} demandé` },
                    { status: 400 }
                );
            }
        }

        // Create truck load
        const truckLoad = await db.truckLoad.create({
            data: {
                tenantId: user.tenantId,
                tourId,
                driverId: user.userId,
                status: "LOADED",
                loadedAt: new Date(),
                items: {
                    create: items.map((item: { productId: string; quantity: number }) => ({
                        productId: item.productId,
                        qtyLoaded: item.quantity,
                        qtyRemaining: item.quantity,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true, stock: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(truckLoad, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// GET /api/mobile/truck-load?tourId=xxx — Get truck load for tour
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const { searchParams } = new URL(req.url);
        const tourId = searchParams.get("tourId");

        if (!tourId) {
            return NextResponse.json({ error: "tourId requis" }, { status: 400 });
        }

        const truckLoad = await db.truckLoad.findFirst({
            where: { tourId, tenantId: user.tenantId },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true, stock: true },
                        },
                    },
                },
            },
        });

        if (!truckLoad) {
            return NextResponse.json({ error: "Chargement introuvable" }, { status: 404 });
        }

        return NextResponse.json(truckLoad);
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
