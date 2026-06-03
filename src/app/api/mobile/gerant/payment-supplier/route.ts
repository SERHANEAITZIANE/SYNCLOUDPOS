import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/gerant/payment-supplier — Pay a supplier from mobile
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const body = await req.json();
        const { supplierId, amount, paymentMethod = "CASH", accountId, notes } = body;

        if (!supplierId || !amount || amount <= 0) {
            return NextResponse.json(
                { error: "Fournisseur et montant requis (montant > 0)" },
                { status: 400 }
            );
        }

        // Verify supplier exists and belongs to tenant
        const supplier = await db.supplier.findFirst({
            where: { id: supplierId, tenantId },
        });

        if (!supplier) {
            return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
        }

        // Get treasury account
        let finalAccountId = accountId;
        if (!finalAccountId) {
            const cashAccount = await db.treasuryAccount.findFirst({
                where: { tenantId, type: "CASH" },
            });
            if (cashAccount) {
                finalAccountId = cashAccount.id;
            }
        }

        // Update supplier balance (decrement = we paid them, reducing what we owe)
        await db.supplier.update({
            where: { id: supplierId },
            data: { balance: { decrement: amount } },
        });

        // Create treasury outflow
        if (finalAccountId) {
            const account = await db.treasuryAccount.findUnique({
                where: { id: finalAccountId },
            });

            if (account) {
                const balanceBefore = Number(account.balance);
                const balanceAfter = balanceBefore - amount;

                await db.treasuryAccount.update({
                    where: { id: finalAccountId },
                    data: { balance: { decrement: amount } },
                });

                await db.treasuryTransaction.create({
                    data: {
                        accountId: finalAccountId,
                        tenantId,
                        type: "OUTFLOW",
                        amount,
                        balanceBefore,
                        balanceAfter,
                        source: "SUPPLIER_PAYMENT",
                        referenceId: supplierId,
                        description: `Paiement mobile fournisseur: ${supplier.name}${notes ? ` — ${notes}` : ""}`,
                    },
                });
            }
        }

        // Get updated supplier
        const updatedSupplier = await db.supplier.findUnique({
            where: { id: supplierId },
            select: { id: true, name: true, balance: true },
        });

        return NextResponse.json({
            success: true,
            payment: {
                supplierId,
                supplierName: supplier.name,
                amount,
                paymentMethod,
                previousBalance: Number(supplier.balance),
                newBalance: Number(updatedSupplier?.balance || 0),
                date: new Date().toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
