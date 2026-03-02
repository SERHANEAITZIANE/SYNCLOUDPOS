"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export type LedgerLine = {
    id: string
    date: string
    type: "SALE" | "PAYMENT"
    debit: number
    credit: number
    balance: number
    observation: string
    reference: string
}

export async function getCustomerLedger(customerId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        // @ts-expect-error tenantId
        const tenantId = session.user.tenantId

        // 1. Fetch Sales and payments in parallel, then get order IDs
        const [sales, credits, debits, customerOrders] = await Promise.all([
            db.salesOrder.findMany({
                where: {
                    tenantId,
                    customerId,
                    status: { in: ["VALIDATED", "PAID"] },
                },
                select: {
                    id: true,
                    createdAt: true,
                    total: true,
                    receiptNumber: true,
                    type: true,
                },
            }),
            // 2. Fetch Payments RECEIVED (Credits - money given by customer to us)
            db.treasuryTransaction.findMany({
                where: {
                    tenantId,
                    type: "CREDIT",
                    OR: [
                        { source: "MANUAL_IN", referenceId: customerId }, // Standard payment received
                    ]
                },
                select: {
                    id: true,
                    date: true,
                    amount: true,
                    description: true,
                    source: true,
                    referenceId: true
                }
            }),
            // 3. Fetch Loans/Advances GIVEN (Debits - money we gave to the customer)
            db.treasuryTransaction.findMany({
                where: {
                    tenantId,
                    type: "DEBIT",
                    source: "MANUAL_OUT",
                    referenceId: customerId
                },
                select: {
                    id: true,
                    date: true,
                    amount: true,
                    description: true,
                    source: true,
                    referenceId: true
                }
            }),
            db.order.findMany({
                where: { tenantId, customerId },
                select: { id: true, createdAt: true }
            })
        ]);

        const customerOrderIds = customerOrders.map(o => o.id)

        // Payments directly linked to a POS sale
        const salePayments = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                type: "CREDIT",
                source: "SALE",
                referenceId: { in: customerOrderIds }
            },
            select: {
                id: true,
                date: true,
                amount: true,
                description: true,
                source: true,
                referenceId: true
            }
        })

        const allCredits = [...credits, ...salePayments]
        // Remove duplicates if any happen to overlap
        const uniqueCredits = Array.from(new Map(allCredits.map(item => [item.id, item])).values())

        // 3. Map into a unified chronological ledger
        const ledgerLines: Omit<LedgerLine, "balance">[] = []

        // Map Sales (Debits - increases what they owe us)
        for (const sale of sales) {
            let label = "Vente"
            if (sale.type === "INVOICE") label = "Facture"
            else if (sale.type === "QUOTE") continue; // Quotes aren't debts

            ledgerLines.push({
                id: `sale-${sale.id}`,
                date: sale.createdAt.toISOString(),
                type: "SALE",
                debit: Number(sale.total),
                credit: 0,
                observation: `${label} N°: ${sale.receiptNumber || '-'}`,
                reference: sale.id
            })
        }

        // Map Loans GIVEN (Debits - increases what they owe us)
        for (const loan of debits) {
            ledgerLines.push({
                id: `loan-${loan.id}`,
                date: loan.date.toISOString(),
                type: "SALE", // Treated as a debt increase
                debit: Number(loan.amount),
                credit: 0,
                observation: loan.description || "Emprunt accordé (Avance)",
                reference: loan.referenceId || ''
            })
        }

        // Map Payments RECEIVED (Credits - decreases what they owe us)
        for (const pay of uniqueCredits) {
            let label = pay.description || "Paiement"
            if (pay.source === "SALE") label = "Paiement (Vente Directe)"
            else if (pay.source === "MANUAL_IN") label = "Règlement de dette"

            ledgerLines.push({
                id: `pay-${pay.id}`,
                date: pay.date.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: Number(pay.amount),
                observation: label,
                reference: pay.referenceId || ''
            })
        }

        // 4. Sort strictly chronologically
        ledgerLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // 5. Calculate Running Balance
        let currentBalance = 0;
        const finalizedLedger: LedgerLine[] = ledgerLines.map(line => {
            currentBalance += line.debit // They owe us more
            currentBalance -= line.credit // They paid us
            return {
                ...line,
                balance: currentBalance
            }
        })

        return {
            lines: finalizedLedger,
            finalBalance: currentBalance
        }

    } catch (error) {
        console.error("[GET_CUSTOMER_LEDGER]", error)
        return { lines: [], finalBalance: 0 }
    }
}

export async function getSupplierLedger(supplierId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        // @ts-expect-error tenantId
        const tenantId = session.user.tenantId

        // 1. Fetch Purchases (Credits - money we owe to supplier)
        // Similar to sales, we count purchases that are validated/paid as raising our debt.
        const purchases = await db.purchaseOrder.findMany({
            where: {
                tenantId,
                supplierId,
                status: { in: ["VALIDATED", "PAID"] },
            },
            select: {
                id: true,
                createdAt: true,
                total: true,
                status: true,
            },
        })

        // 2. Fetch Outbound Payments (Debits - money we paid out to the supplier)
        // This includes manual out payments or purchase direct payments
        const payments = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                type: "DEBIT",
                OR: [
                    { source: "MANUAL_OUT", referenceId: supplierId }, // Standard payment sent to supplier
                    { source: "PURCHASE", referenceId: { in: purchases.map(p => p.id) } }
                ]
            },
            select: {
                id: true,
                date: true,
                amount: true,
                description: true,
                source: true,
                referenceId: true
            }
        })

        // 3. Fetch Inbound Advances (Credits - money they advanced to us)
        const advances = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                type: "CREDIT",
                source: "MANUAL_IN",
                referenceId: supplierId
            },
            select: {
                id: true,
                date: true,
                amount: true,
                description: true,
                source: true,
                referenceId: true
            }
        })

        // 3. Map into a unified chronological ledger
        const ledgerLines: Omit<LedgerLine, "balance">[] = []

        // Map Purchases (Credits from our perspective => Increases Supplier Balance)
        for (const purchase of purchases) {
            ledgerLines.push({
                id: `purchase-${purchase.id}`,
                date: purchase.createdAt.toISOString(),
                type: "SALE", // Meaning 'Transaction' increasing debt in UI context
                debit: Number(purchase.total), // Debit in this context means "our debt increased"
                credit: 0,
                observation: `Bon de Réception: ${purchase.id.substring(0, 8)}`,
                reference: purchase.id
            })
        }

        // Map Advances from Supplier (Credits => Increases Supplier Balance, we owe them more)
        for (const advance of advances) {
            ledgerLines.push({
                id: `advance-${advance.id}`,
                date: advance.date.toISOString(),
                type: "SALE", // Meaning 'Transaction' increasing debt in UI context
                debit: Number(advance.amount), // Debt increases
                credit: 0,
                observation: advance.description || "Avance reçue du fournisseur",
                reference: advance.referenceId || ''
            })
        }

        // Map Payments (We paid them => Decreases Supplier Balance)
        for (const pay of payments) {
            let label = pay.description || "Paiement envoyé"
            if (pay.source === "PURCHASE") label = "Paiement sur Achat"
            else if (pay.source === "MANUAL_OUT") label = "Règlement / Avance"

            ledgerLines.push({
                id: `pay-${pay.id}`,
                date: pay.date.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: Number(pay.amount), // Amount we gave them decreases debt
                observation: label,
                reference: pay.referenceId || ''
            })
        }

        // 4. Sort strictly chronologically
        ledgerLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // 5. Calculate Running Balance
        let currentBalance = 0;
        const finalizedLedger: LedgerLine[] = ledgerLines.map(line => {
            currentBalance += line.debit // Debt increases with purchases or advances
            currentBalance -= line.credit // Debt decreases with payments out
            return {
                ...line,
                balance: currentBalance
            }
        })

        return {
            lines: finalizedLedger,
            finalBalance: currentBalance
        }

    } catch (error) {
        console.error("[GET_SUPPLIER_LEDGER]", error)
        return { lines: [], finalBalance: 0 }
    }
}
