"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { invalidateCache } from "@/lib/redis"
import { ChequeStatus } from "@prisma/client"

export async function getCheques() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const cheques = await db.cheque.findMany({
            where: { tenantId },
            include: {
                customer: { select: { name: true } },
                supplier: { select: { name: true } },
                account: { select: { name: true } }
            },
            orderBy: { dueDate: 'asc' }
        });
        return { data: cheques }
    } catch (error: any) {
        return { error: error.message || "Failed to fetch cheques" }
    }
}

export async function createCheque(data: any) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const cheque = await db.cheque.create({
            data: {
                number: data.number,
                bank: data.bank,
                amount: data.amount,
                dueDate: new Date(data.dueDate),
                status: data.status || "PENDING",
                type: data.type,
                customerId: data.customerId || null,
                supplierId: data.supplierId || null,
                accountId: data.accountId || null,
                tenantId
            }
        });
        
        await invalidateCache(`treasury:${tenantId}`);
        return { success: "Cheque created successfully", data: cheque }
    } catch (error: any) {
        return { error: error.message || "Failed to create cheque" }
    }
}

export async function updateChequeStatus(id: string, status: ChequeStatus, accountId?: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const cheque = await db.cheque.findFirst({ where: { id, tenantId } });
        if (!cheque) return { error: "Cheque not found" }

        if (status === "CLEARED") {
            // Process treasury transaction if it clears
            const targetAccountId = accountId || cheque.accountId;
            if (!targetAccountId) return { error: "Compte bancaire requis pour l'encaissement" }
            
            const account = await db.treasuryAccount.findFirst({ where: { id: targetAccountId, tenantId } });
            if (!account) return { error: "Compte introuvable" }

            await db.$transaction(async (tx) => {
                await tx.cheque.update({
                    where: { id },
                    data: { status, accountId: targetAccountId }
                });

                const amount = Number(cheque.amount);
                const isDebit = cheque.type === "ISSUED";
                
                await tx.treasuryTransaction.create({
                    data: {
                        tenantId,
                        accountId: targetAccountId,
                        type: isDebit ? "DEBIT" : "CREDIT",
                        amount: amount,
                        balanceBefore: account.balance,
                        balanceAfter: isDebit ? Number(account.balance) - amount : Number(account.balance) + amount,
                        source: isDebit ? "MANUAL_OUT" : "MANUAL_IN", // Treat as manual or could add "CHEQUE"
                        referenceId: cheque.id,
                        description: `Chèque ${cheque.number} - ${cheque.bank}`
                    }
                });

                await tx.treasuryAccount.update({
                    where: { id: targetAccountId },
                    data: {
                        balance: isDebit ? { decrement: amount } : { increment: amount }
                    }
                });
            });
        } else {
            await db.cheque.update({
                where: { id },
                data: { status }
            });
        }
        
        await invalidateCache(`treasury:${tenantId}`);
        return { success: "Status updated successfully" }
    } catch (error: any) {
        return { error: error.message || "Failed to update cheque" }
    }
}
