import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/returns — Record a product return
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const { customerId, productId, quantity, reason, notes, photoUrl, tourStopId } = body;

        if (!customerId || !productId || !quantity || !reason) {
            return NextResponse.json(
                { error: "Client, produit, quantité et motif requis" },
                { status: 400 }
            );
        }

        // Get product info for pricing
        const product = await db.product.findFirst({
            where: { id: productId, tenantId: user.tenantId },
        });
        if (!product) {
            return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
        }

        const unitPrice = Number(product.price);
        const totalAmount = quantity * unitPrice;

        // Create return record
        const productReturn = await db.productReturn.create({
            data: {
                tenantId: user.tenantId,
                customerId,
                driverId: user.userId,
                productId,
                quantity,
                unitPrice,
                totalAmount,
                reason,
                notes: notes || null,
                photoUrl: photoUrl || null,
                tourStopId: tourStopId || null,
                status: "PENDING",
            },
            include: {
                product: { select: { name: true } },
                customer: { select: { name: true, balance: true } },
            },
        });

        // Credit return amount to customer balance (reduce their debt)
        await db.customer.update({
            where: { id: customerId },
            data: { balance: { decrement: totalAmount } },
        });

        // Restock the returned product
        await db.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } },
        });

        // Update tour stop if applicable
        if (tourStopId) {
            await db.tourStop.update({
                where: { id: tourStopId },
                data: { returnAmount: { increment: totalAmount } },
            });
        }

        // Audit log
        await db.auditLog.create({
            data: {
                tenantId: user.tenantId,
                userId: user.userId,
                userName: user.name,
                action: "CREATE",
                entity: "PRODUCT_RETURN",
                entityId: productReturn.id,
                description: `Retour mobile: ${quantity}x ${product.name} — ${reason} — Client: ${productReturn.customer.name}`,
            },
        });

        return NextResponse.json(productReturn, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
