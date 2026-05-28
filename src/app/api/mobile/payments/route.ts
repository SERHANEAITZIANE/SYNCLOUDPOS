import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/payments — Record a payment from client
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const { customerId, amount, paymentMethod = "CASH", notes, tourStopId, treasuryAccountId } = body;

        if (!customerId || !amount || amount <= 0) {
            return NextResponse.json(
                { error: "Client et montant requis" },
                { status: 400 }
            );
        }

        // Get customer current balance
        const customer = await db.customer.findFirst({
            where: { id: customerId, tenantId: user.tenantId },
        });

        if (!customer) {
            return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
        }

        const previousBalance = Number(customer.balance);

        // Deduct payment from customer balance
        const updated = await db.customer.update({
            where: { id: customerId },
            data: {
                balance: { decrement: amount },
            },
        });

        const newBalance = Number(updated.balance);

        // Update tour stop if applicable
        if (tourStopId) {
            await db.tourStop.update({
                where: { id: tourStopId },
                data: {
                    paymentAmount: { increment: amount },
                    paymentMethod,
                },
            });
        }

        // Update treasury account and log inflow transaction if applicable
        let finalAccountId = treasuryAccountId;
        if (!finalAccountId) {
            // Find default cash or bank account based on payment method
            const defaultAcc = await db.treasuryAccount.findFirst({
                where: { 
                    tenantId: user.tenantId, 
                    type: paymentMethod === "CASH" ? "CASH" : "BANK" 
                }
            });
            if (defaultAcc) {
                finalAccountId = defaultAcc.id;
            }
        }

        if (finalAccountId) {
            const account = await db.treasuryAccount.findUnique({
                where: { id: finalAccountId }
            });

            if (account) {
                const balanceBefore = Number(account.balance);
                const balanceAfter = balanceBefore + amount;

                // Update caisse balance
                await db.treasuryAccount.update({
                    where: { id: finalAccountId },
                    data: { balance: { increment: amount } }
                });

                // Create transaction
                await db.treasuryTransaction.create({
                    data: {
                        accountId: finalAccountId,
                        type: "INFLOW",
                        amount,
                        balanceBefore,
                        balanceAfter,
                        source: "PAYMENT",
                        description: `Paiement de créance mobile — Client: ${customer.name} (${paymentMethod})`,
                    }
                });
            }
        }

        // Create audit log for payment tracking
        await db.auditLog.create({
            data: {
                tenantId: user.tenantId,
                userId: user.userId,
                userName: user.name,
                action: "CREATE",
                entity: "PAYMENT",
                entityId: customerId,
                description: `Paiement mobile de ${amount} DA par ${paymentMethod} — Client: ${customer.name}`,
                before: JSON.stringify({ balance: previousBalance }),
                after: JSON.stringify({ balance: newBalance, paymentAmount: amount }),
            },
        });

        return NextResponse.json({
            success: true,
            customerId,
            customerName: customer.name,
            amount,
            paymentMethod,
            previousBalance,
            newBalance,
            date: new Date().toISOString(),
        }, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
