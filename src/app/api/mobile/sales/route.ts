import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/sales — Create a BL (Bon de Livraison) from mobile
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const {
            customerId, tourStopId, type = "ORDER",
            items, paymentMethod = "CASH",
            paymentAmount = 0, notes,
        } = body;

        if (!customerId || !items?.length) {
            return NextResponse.json(
                { error: "Client et articles requis" },
                { status: 400 }
            );
        }

        // Get tenant settings for stamp tax, TVA etc.
        const tenant = await db.tenant.findUnique({
            where: { id: user.tenantId },
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
        }

        // Generate receipt number using sequence counter
        const currentYear = new Date().getFullYear();
        const prefix = type === "INVOICE" ? "FA" : type === "QUOTE" ? "DE" : "BL";

        const counter = await db.sequenceCounter.upsert({
            where: {
                tenantId_prefix_year: {
                    tenantId: user.tenantId,
                    prefix,
                    year: currentYear,
                },
            },
            update: { lastValue: { increment: 1 } },
            create: {
                tenantId: user.tenantId,
                prefix,
                year: currentYear,
                lastValue: 1,
            },
        });

        const receiptNumber = `${prefix}-${currentYear}-${String(counter.lastValue).padStart(5, "0")}`;

        // Calculate totals from items
        let subtotalTTC = 0;
        let totalHT = 0;
        let totalTVA = 0;

        const salesItems = await Promise.all(
            items.map(async (item: { productId: string; quantity: number; unitPrice?: number }) => {
                const product = await db.product.findFirst({
                    where: { id: item.productId, tenantId: user.tenantId },
                });
                if (!product) throw new Error(`Produit ${item.productId} introuvable`);

                const unitPrice = item.unitPrice || Number(product.price);
                const tvaRate = Number(product.tvaRate);
                const lineTTC = item.quantity * unitPrice;
                const lineHT = lineTTC / (1 + tvaRate / 100);
                const lineTVA = lineTTC - lineHT;

                subtotalTTC += lineTTC;
                totalHT += lineHT;
                totalTVA += lineTVA;

                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice,
                    priceHt: lineHT / item.quantity,
                    tvaRate,
                    total: lineTTC,
                };
            })
        );

        let stampTax = 0;
        if (tenant.stampTaxEnabled && paymentMethod === "CASH") {
            const stampRate = 1; // Assuming 1%
            stampTax = Math.ceil(subtotalTTC * stampRate / 100);
        }

        const totalWithStamp = subtotalTTC + stampTax;

        // Create BL / Sales Order
        const salesOrder = await db.salesOrder.create({
            data: {
                tenantId: user.tenantId,
                userId: user.userId,
                customerId,
                type: type as any,
                receiptNumber,
                subtotal: totalHT,
                tvaAmount: totalTVA,
                stampTax,
                total: totalWithStamp,
                paymentMethod,
                paymentStatus: paymentAmount >= totalWithStamp ? "PAID" : paymentAmount > 0 ? "PARTIAL" : "PENDING",
                amountPaid: paymentAmount,
                notes: notes || null,
                source: "MOBILE",
                items: {
                    create: salesItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        priceHt: item.priceHt,
                        tvaRate: item.tvaRate,
                        total: item.total,
                    })),
                },
            },
            include: {
                items: {
                    include: { product: { select: { name: true } } },
                },
                customer: {
                    select: { id: true, name: true, balance: true },
                },
            },
        });

        // Update customer balance
        const balanceChange = totalWithStamp - paymentAmount;
        if (balanceChange !== 0) {
            await db.customer.update({
                where: { id: customerId },
                data: {
                    balance: { increment: balanceChange },
                },
            });
        }

        // Deduct stock
        for (const item of salesItems) {
            await db.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }

        // Update truck load if applicable
        if (tourStopId) {
            // Update the tour stop with the sales order
            await db.tourStop.update({
                where: { id: tourStopId },
                data: {
                    salesOrderId: salesOrder.id,
                    paymentAmount,
                    paymentMethod,
                },
            });
        }

        return NextResponse.json({
            ...salesOrder,
            subtotal: Number(salesOrder.subtotal),
            tvaAmount: Number(salesOrder.tvaAmount),
            total: Number(salesOrder.total),
            stampTax: Number(salesOrder.stampTax),
            amountPaid: Number(salesOrder.amountPaid),
        }, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// GET /api/mobile/sales — List recent sales by driver
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");
        const customerId = searchParams.get("customerId");

        const where: any = {
            tenantId: user.tenantId,
            source: "MOBILE",
        };

        if (dateStr) {
            const date = new Date(dateStr);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.createdAt = { gte: date, lt: nextDay };
        }

        if (customerId) where.customerId = customerId;

        const sales = await db.salesOrder.findMany({
            where,
            include: {
                customer: { select: { name: true, balance: true } },
                items: {
                    include: { product: { select: { name: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return NextResponse.json(
            sales.map(s => ({
                ...s,
                subtotal: Number(s.subtotal),
                tvaAmount: Number(s.tvaAmount),
                total: Number(s.total),
                stampTax: Number(s.stampTax),
                amountPaid: Number(s.amountPaid),
            }))
        );
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
