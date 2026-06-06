import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }
        const tenantId = user.tenantId;
        const { id: customerId } = await params;
        const body = await req.json();
        const { amount, note, caisseId } = body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }

        const paymentAmount = Math.round(Number(amount));

        // Verify customer exists
        const customer = await db.customer.findFirst({
            where: { id: customerId, tenantId },
            select: { id: true, name: true, balance: true, phone: true },
        });
        if (!customer) {
            return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
        }

        // Get default caisse if not specified
        let treasuryId = caisseId;
        if (!treasuryId) {
            const defaultCaisse = await db.treasuryAccount.findFirst({
                where: { tenantId, type: "CASH" },
                orderBy: { createdAt: "asc" },
                select: { id: true },
            });
            treasuryId = defaultCaisse?.id;
        }

        const oldBalance = Number(customer.balance);
        const newBalance = oldBalance - paymentAmount;

        // Record payment in a transaction
        const result = await db.$transaction(async (tx) => {
            // Update customer balance
            const updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: { balance: newBalance },
            });

            // Record treasury transaction (money IN = CREDIT)
            let treasuryTx = null;
            if (treasuryId) {
                const updatedAccount = await tx.treasuryAccount.update({
                    where: { id: treasuryId },
                    data: { balance: { increment: paymentAmount } },
                });
                treasuryTx = await tx.treasuryTransaction.create({
                    data: {
                        tenantId,
                        accountId: treasuryId,
                        type: "CREDIT",
                        amount: paymentAmount,
                        balanceBefore: Number(updatedAccount.balance) - paymentAmount,
                        balanceAfter: updatedAccount.balance,
                        source: "CUSTOMER_PAYMENT",
                        description: `Encaissement client: ${customer.name}${note ? ` - ${note}` : ""} (mobile gérant)`,
                        referenceId: customerId,
                        date: new Date(),
                    },
                });
            }

            return { updatedCustomer, treasuryTx };
        });

        return NextResponse.json({
            success: true,
            message: `Paiement de ${paymentAmount.toLocaleString("fr-FR")} DA encaissé pour ${customer.name}`,
            customer: {
                id: customer.id,
                name: customer.name,
                oldBalance: Math.round(oldBalance),
                newBalance: Math.round(newBalance),
                paid: paymentAmount,
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
