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
    category?: "PURCHASE" | "SALE" | "LOAN" | "PAYMENT" | "RETURN" | "INITIAL"
}

export async function getCustomerLedger(customerId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        // 1. Fetch Sales, invoices, cheques, customer orders, returns, and customer details in parallel
        const [allSalesOrders, invoices, cheques, customerOrders, clientReturns, customer] = await Promise.all([
            db.salesOrder.findMany({
                where: {
                    tenantId,
                    customerId,
                },
                select: {
                    id: true,
                    createdAt: true,
                    total: true,
                    receiptNumber: true,
                    type: true,
                    status: true,
                },
            }),
            db.invoice.findMany({
                where: { tenantId, customerId },
                select: { id: true }
            }),
            db.cheque.findMany({
                where: { tenantId, customerId },
                select: { id: true }
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
                    returnType: true,
                    product: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            db.customer.findUnique({
                where: { id: customerId, tenantId },
                select: { balance: true, initialBalance: true, createdAt: true }
            })
        ]);

        const sales = allSalesOrders.filter(so => ["VALIDATED", "PAID"].includes(so.status))
        const customerOrderIds = customerOrders.map(o => o.id)
        const salesOrderIds = allSalesOrders.map(so => so.id)
        const invoiceIds = invoices.map(i => i.id)
        const chequeIds = cheques.map(c => c.id)

        const referenceIds = [
            customerId,
            ...customerOrderIds,
            ...salesOrderIds,
            ...invoiceIds,
            ...chequeIds
        ]

        // Fetch Payments RECEIVED (Credits) and Loans GIVEN (Debits) referencing any of our customer entities
        const [credits, debits] = await Promise.all([
            db.treasuryTransaction.findMany({
                where: {
                    tenantId,
                    type: "CREDIT",
                    referenceId: { in: referenceIds }
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
            db.treasuryTransaction.findMany({
                where: {
                    tenantId,
                    type: "DEBIT",
                    referenceId: { in: referenceIds }
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
        ])

        // Map into a unified chronological ledger
        const ledgerLines: Omit<LedgerLine, "balance">[] = []

        // Map Sales (Debits - increases what they owe us)
        for (const sale of sales) {
            const isCreditNote = sale.type === "CREDIT_NOTE"
            let label = "Vente"
            if (sale.type === "INVOICE") label = "Facture"
            else if (sale.type === "CREDIT_NOTE") label = "Avoir"
            else if (sale.type === "QUOTE") continue; // Quotes aren't debts

            ledgerLines.push({
                id: `sale-${sale.id}`,
                date: sale.createdAt.toISOString(),
                type: isCreditNote ? "PAYMENT" : "SALE",
                debit: isCreditNote ? 0 : Number(sale.total),
                credit: isCreditNote ? Number(sale.total) : 0,
                observation: `${label} N°: ${sale.receiptNumber || '-'}`,
                reference: sale.id,
                category: isCreditNote ? "RETURN" : "SALE"
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
                reference: loan.referenceId || '',
                category: "LOAN"
            })
        }

        // Map Payments RECEIVED (Credits - decreases what they owe us)
        for (const pay of credits) {
            let label = pay.description || "Paiement"
            if (pay.source === "SALE") label = `Paiement (${pay.description || "Vente"})`
            else if (pay.source === "MANUAL_IN" || pay.source === "CUSTOMER_PAYMENT") label = pay.description || "Règlement de dette"

            ledgerLines.push({
                id: `pay-${pay.id}`,
                date: pay.date.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: Number(pay.amount),
                observation: label,
                reference: pay.referenceId || '',
                category: "PAYMENT"
            })
        }

        // Map Client Returns (Credits - decreases what they owe us)
        for (const ret of clientReturns) {
            const isCash = ret.returnType === "CASH"
            ledgerLines.push({
                id: `return-${ret.id}`,
                date: ret.createdAt.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: isCash ? 0 : Number(ret.totalAmount),
                observation: `Retour Client ${isCash ? "Remboursé (Cash)" : "Crédité (Solde)"}: ${ret.product?.name || "Produit"} (N° ${ret.id.substring(0, 8)})`,
                reference: ret.id,
                category: "RETURN"
            })
        }

        // Calculate Initial Balance (Use stored initial balance)
        const initialBalance = Number(customer?.initialBalance || 0)

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
            reference: customerId,
            category: "INITIAL"
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
            lines: finalizedLedger.reverse(),
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

        // Step 1: Fetch purchases, supplier details, returns, and cheques in parallel
        const [purchases, supplier, supplierReturns, cheques] = await Promise.all([
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
            db.supplierReturn.findMany({
                where: {
                    tenantId,
                    supplierId,
                },
                include: {
                    product: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            db.cheque.findMany({
                where: { tenantId, supplierId },
                select: { id: true }
            })
        ]);

        if (!supplier) throw new Error("Fournisseur introuvable")

        // Step 2: Fetch all treasury transactions linked to the supplier, purchases, or cheques
        const purchaseIds = purchases.map(p => p.id)
        const chequeIds = cheques.map(c => c.id)
        const referenceIds = [supplierId, ...purchaseIds, ...chequeIds]

        const treasuryTransactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                referenceId: { in: referenceIds }
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
                reference: purchase.id,
                category: "PURCHASE"
            })
        }

        // Map Treasury Transactions (Payments and Advances/Loans)
        for (const tx of treasuryTransactions) {
            if (tx.type === "DEBIT") {
                // Money leaving our treasury => Payment to supplier (reduces our debt to them)
                let label = tx.description || "Paiement envoyé"
                if (tx.source === "PURCHASE") label = "Paiement sur Achat"
                else if (tx.source === "MANUAL_OUT" || tx.source === "SUPPLIER_PAYMENT") label = "Règlement / Avance"

                ledgerLines.push({
                    id: `pay-${tx.id}`,
                    date: tx.date.toISOString(),
                    type: "PAYMENT",
                    debit: 0,
                    credit: Number(tx.amount),
                    observation: label,
                    reference: tx.referenceId || '',
                    category: "PAYMENT"
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
                    reference: tx.referenceId || '',
                    category: "LOAN"
                })
            }
        }

        // Map Supplier Returns (Credits => Decreases Supplier Balance / we owe them less)
        for (const ret of supplierReturns) {
            const isCash = ret.returnType === "CASH"
            ledgerLines.push({
                id: `return-${ret.id}`,
                date: ret.createdAt.toISOString(),
                type: "PAYMENT",
                debit: 0,
                credit: isCash ? 0 : Number(ret.totalAmount),
                observation: `Retour Fournisseur ${isCash ? "Remboursé (Cash)" : "Crédité (Solde)"}: ${ret.product?.name || "Produit"} (Qté: ${ret.quantity})`,
                reference: ret.id,
                category: "RETURN"
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
            reference: supplierId,
            category: "INITIAL"
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
            lines: finalizedLedger.reverse(),
            finalBalance: currentBalance
        }

    } catch (error) {
        console.error("[GET_SUPPLIER_LEDGER]", error)
        return { lines: [], finalBalance: 0 }
    }
}
