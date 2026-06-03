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

        const tenantId = session.user.tenantId

        // 1. Fetch Sales, payments, returns, and customer details in parallel
        const [sales, credits, debits, customerOrders, clientReturns, customer] = await Promise.all([
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
            // Fetch Payments RECEIVED (Credits - money given by customer to us)
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
            // Fetch Loans/Advances GIVEN (Debits - money we gave to the customer)
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
            }),
            db.productReturn.findMany({
                where: {
                    tenantId,
                    customerId,
                },
                select: {
                    id: true,
                    createdAt: true,
                    totalAmount: true,
                    product: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            db.customer.findUnique({
                where: { id: customerId, tenantId },
                select: { balance: true, createdAt: true }
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

        // Map into a unified chronological ledger
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

        // Map Client Returns (Credits - decreases what they owe us)
        for (const ret of clientReturns) {
            ledgerLines.push({
                id: `return-${ret.id}`,
                date: ret.createdAt.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: Number(ret.totalAmount),
                observation: `Retour Client: ${ret.product?.name || "Produit"} (N° ${ret.id.substring(0, 8)})`,
                reference: ret.id
            })
        }

        // Calculate Initial Balance (Current Balance - Debits + Credits)
        const totalDebits = ledgerLines.reduce((sum, line) => sum + line.debit, 0)
        const totalCredits = ledgerLines.reduce((sum, line) => sum + line.credit, 0)
        const initialBalance = Number(customer?.balance || 0) - totalDebits + totalCredits

        // Push Initial Balance line (make date 1s before earliest txn so it sorts first)
        const earliestTxTime = ledgerLines.length > 0
            ? Math.min(...ledgerLines.map(l => new Date(l.date).getTime()))
            : new Date().getTime()
        const initialBalanceDate = new Date(Math.min(earliestTxTime - 1000, customer?.createdAt.getTime() || earliestTxTime))

        ledgerLines.push({
            id: `initial-balance-${customerId}`,
            date: initialBalanceDate.toISOString(),
            type: "SALE",
            debit: initialBalance > 0 ? initialBalance : 0,
            credit: initialBalance < 0 ? -initialBalance : 0,
            observation: "Solde Initial",
            reference: customerId
        })

        // Sort strictly chronologically
        ledgerLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Calculate Running Balance
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

        const tenantId = session.user.tenantId

        // Step 1: Fetch purchases, supplier details, and returns in parallel
        const [purchases, supplier, movements] = await Promise.all([
            db.purchaseOrder.findMany({
                where: {
                    tenantId,
                    supplierId,
                },
                select: {
                    id: true,
                    createdAt: true,
                    total: true,
                    status: true,
                },
            }),
            db.supplier.findUnique({
                where: { id: supplierId, tenantId },
                select: { name: true, balance: true, createdAt: true }
            }),
            db.stockMovement.findMany({
                where: {
                    tenantId,
                    reason: { startsWith: "Retour Fournisseur:" }
                },
                include: {
                    product: {
                        select: {
                            name: true,
                            cost: true,
                            price: true
                        }
                    }
                }
            })
        ]);

        if (!supplier) throw new Error("Fournisseur introuvable")

        // Step 2: Fetch all treasury transactions linked to the supplier or their purchases
        const purchaseIds = purchases.map(p => p.id)
        const treasuryTransactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                OR: [
                    { referenceId: supplierId },
                    { referenceId: { in: purchaseIds } }
                ]
            },
            select: {
                id: true,
                date: true,
                amount: true,
                description: true,
                source: true,
                type: true,
                referenceId: true
            }
        })

        // Filter returns in memory for this specific supplier
        const supplierReturns = movements.filter(m => m.reason?.includes(`Retour Fournisseur: ${supplier.name}`))

        // Map into a unified chronological ledger
        const ledgerLines: Omit<LedgerLine, "balance">[] = []

        // Map Purchases (Debits - increases what we owe them)
        for (const purchase of purchases) {
            let label = "Achat"
            let debitValue = Number(purchase.total)
            if (purchase.status === "BON_LIVRAISON") {
                label = "Bon de Réception"
            } else if (purchase.status === "FACTURE") {
                label = "Facture Achat"
            } else if (purchase.status === "PENDING") {
                label = "Achat en attente"
            } else if (purchase.status === "CANCELLED") {
                label = "Achat Annulé"
                debitValue = 0 // Cancelled purchases don't add to debt
            } else if (purchase.status === "COMPLETED") {
                label = "Achat Complété"
            }

            ledgerLines.push({
                id: `purchase-${purchase.id}`,
                date: purchase.createdAt.toISOString(),
                type: "SALE",
                debit: debitValue,
                credit: 0,
                observation: `${label} N°: ${purchase.id.substring(0, 8)}`,
                reference: purchase.id
            })
        }

        // Map Treasury Transactions (Payments and Advances/Loans)
        for (const tx of treasuryTransactions) {
            if (tx.type === "DEBIT") {
                // Money leaving our treasury => Payment to supplier (reduces our debt to them)
                let label = tx.description || "Paiement envoyé"
                if (tx.source === "PURCHASE") label = "Paiement sur Achat"
                else if (tx.source === "MANUAL_OUT") label = "Règlement / Avance"

                ledgerLines.push({
                    id: `pay-${tx.id}`,
                    date: tx.date.toISOString(),
                    type: "PAYMENT",
                    debit: 0,
                    credit: Number(tx.amount),
                    observation: label,
                    reference: tx.referenceId || ''
                })
            } else if (tx.type === "CREDIT") {
                // Money entering our treasury => Loan from supplier (increases our debt to them)
                let label = tx.description || "Emprunt Fournisseur"
                if (label.startsWith("Avance reçue du fournisseur:")) {
                    label = label.replace("Avance reçue du fournisseur:", "Emprunt Fournisseur:")
                }

                ledgerLines.push({
                    id: `advance-${tx.id}`,
                    date: tx.date.toISOString(),
                    type: "SALE",
                    debit: Number(tx.amount),
                    credit: 0,
                    observation: label,
                    reference: tx.referenceId || ''
                })
            }
        }

        // Map Supplier Returns (Credits => Decreases Supplier Balance / we owe them less)
        for (const ret of supplierReturns) {
            const costPrice = Number(ret.product.cost ?? ret.product.price)
            const totalAmount = Math.abs(ret.quantity) * costPrice

            ledgerLines.push({
                id: `return-${ret.id}`,
                date: ret.createdAt.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: totalAmount,
                observation: `Retour Fournisseur: ${ret.product.name} (Qté: ${Math.abs(ret.quantity)})`,
                reference: ret.id
            })
        }

        // Calculate Initial Balance (Current Balance - Debits + Credits)
        const totalDebits = ledgerLines.reduce((sum, line) => sum + line.debit, 0)
        const totalCredits = ledgerLines.reduce((sum, line) => sum + line.credit, 0)
        const initialBalance = Number(supplier.balance || 0) - totalDebits + totalCredits

        // Push Initial Balance line (make date 1s before earliest txn so it sorts first)
        const earliestTxTime = ledgerLines.length > 0
            ? Math.min(...ledgerLines.map(l => new Date(l.date).getTime()))
            : new Date().getTime()
        const initialBalanceDate = new Date(Math.min(earliestTxTime - 1000, supplier.createdAt.getTime() || earliestTxTime))

        ledgerLines.push({
            id: `initial-balance-${supplierId}`,
            date: initialBalanceDate.toISOString(),
            type: "SALE",
            debit: initialBalance > 0 ? initialBalance : 0,
            credit: initialBalance < 0 ? -initialBalance : 0,
            observation: "Solde Initial",
            reference: supplierId
        })

        // Sort strictly chronologically
        ledgerLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Calculate Running Balance
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
