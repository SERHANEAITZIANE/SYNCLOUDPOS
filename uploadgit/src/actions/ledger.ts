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

        // 1. Fetch Sales (Debits - money owed by customer)
        // Only consider sales that actually affect inventory/debts
        // In our system, "VALIDATED" and "PAID" SalesOrders mean the goods left and they owe us (or paid us).
        // (If PAID, the corresponding payment will zero it out below).
        const sales = await db.salesOrder.findMany({
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
        })

        // 2. Fetch Payments (Credits - money given by customer)
        const payments = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                type: "CREDIT",
                OR: [
                    // Manual payments explicitly linked to this customer
                    { source: "MANUAL_IN", referenceId: customerId },
                    // Sale payments linked to any of this customer's Orders
                    // Note: TreasuryTransaction referenceId for SALES often points to the Order.id, not SalesOrder.id.
                    // We need to fetch all Orders for this customer to map them.
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

        // To reliably get SALE payments, let's fetch Orders for this customer
        const customerOrders = await db.order.findMany({
            where: { tenantId, customerId },
            select: { id: true, createdAt: true }
        })

        const customerOrderIds = customerOrders.map(o => o.id)

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

        const allPayments = [...payments, ...salePayments]
        // Remove duplicates if any happen to overlap
        const uniquePayments = Array.from(new Map(allPayments.map(item => [item.id, item])).values())

        // 3. Map into a unified chronological ledger
        const ledgerLines: Omit<LedgerLine, "balance">[] = []

        // Map Sales (Debits)
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

        // Map Payments (Credits)
        for (const pay of uniquePayments) {
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
                    { source: "MANUAL_OUT", referenceId: supplierId },
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

        // 3. Map into a unified chronological ledger
        const ledgerLines: Omit<LedgerLine, "balance">[] = []

        // Map Purchases (Credits from our perspective => Increases Supplier Balance)
        for (const purchase of purchases) {
            ledgerLines.push({
                id: `purchase-${purchase.id}`,
                date: purchase.createdAt.toISOString(),
                type: "SALE", // Meaning 'Purchase' in UI context (transaction)
                debit: Number(purchase.total), // Debit in this context means "our debt increased"
                credit: 0,
                observation: `Bon de Réception: ${purchase.id.substring(0, 8)}`,
                reference: purchase.id
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
            currentBalance += line.debit // Debt increases with purchases
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
