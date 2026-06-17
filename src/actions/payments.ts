"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "./audit-log"

// ─── Customer Payments ──────────────────────────────────────────────────────

export async function getCustomerPayments(dateRange?: { from: Date; to: Date }, customerId?: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        // Build where clause
        const where: any = {
            tenantId,
            source: { in: ["SALE", "MANUAL_IN", "CUSTOMER_PAYMENT"] },
            type: "CREDIT"
        }

        // Date filter
        if (dateRange?.from) {
            where.date = { gte: dateRange.from }
            if (dateRange.to) {
                where.date.lte = dateRange.to
            }
        }

        // Query transactions
        const transactions = await db.treasuryTransaction.findMany({
            where,
            include: {
                account: {
                    select: { name: true }
                }
            },
            orderBy: { date: "desc" }
        })

        // Now we need to map these to customers. 
        // For SALE, referenceId points to Order.id (or SalesOrder). 
        // For MANUAL_IN, we just updated it to point to Customer.id

        // Let's fetch the necessary Orders, Customers, and Cheques to resolve the names
        const orderIds = transactions.filter(t => t.source === "SALE" && t.referenceId).map(t => t.referenceId as string)
        const customerIdsFromManual = transactions.filter(t => (t.source === "MANUAL_IN" || t.source === "CUSTOMER_PAYMENT") && t.referenceId).map(t => t.referenceId as string)

        const orders = await db.order.findMany({
            where: { id: { in: orderIds }, tenantId },
            include: { customer: { select: { id: true, name: true } } }
        })

        // Fallback for sales that might be using SalesOrder
        const salesOrders = await db.salesOrder.findMany({
            where: { id: { in: orderIds }, tenantId },
            include: { customer: { select: { id: true, name: true } } }
        })

        const customers = await db.customer.findMany({
            where: { id: { in: customerIdsFromManual }, tenantId },
            select: { id: true, name: true }
        })

        const cheques = await db.cheque.findMany({
            where: { id: { in: customerIdsFromManual }, tenantId },
            include: { customer: { select: { id: true, name: true } } }
        })

        // Map everything together
        let mappedPayments = transactions.map(t => {
            let customerName = "Client de passage"
            let foundCustomerId = undefined
            // Determine payment method from the account name or source
            let paymentMethod = t.account?.name || "Inconnu"

            if (t.source === "SALE") {
                const order = orders.find(o => o.id === t.referenceId)
                if (order?.customer) {
                    customerName = order.customer.name
                    foundCustomerId = order.customer.id
                } else {
                    const sOrder = salesOrders.find(o => o.id === t.referenceId)
                    if (sOrder?.customer) {
                        customerName = sOrder.customer.name
                        foundCustomerId = sOrder.customer.id
                    }
                }
            } else if (t.source === "MANUAL_IN" || t.source === "CUSTOMER_PAYMENT") {
                const customer = customers.find(c => c.id === t.referenceId)
                if (customer) {
                    customerName = customer.name
                    foundCustomerId = customer.id
                } else {
                    const cheque = cheques.find(c => c.id === t.referenceId)
                    if (cheque?.customer) {
                        customerName = cheque.customer.name
                        foundCustomerId = cheque.customer.id
                    } else {
                        customerName = "Ancien Impayé (Non lié)"
                    }
                }
            }

            return {
                id: t.id,
                date: t.date.toISOString(),
                amount: Number(t.amount),
                source: t.source,
                description: t.description || "",
                accountName: paymentMethod,
                accountId: t.accountId,
                customerName,
                customerId: foundCustomerId
            }
        })

        // Filter by customer if requested (since we map it post-query for SALES due to the relation hop)
        if (customerId && customerId !== "ALL") {
            mappedPayments = mappedPayments.filter(p => p.customerId === customerId)
        }

        return mappedPayments
    } catch (error) {
        console.error("[GET_CUSTOMER_PAYMENTS]", error)
        return []
    }
}

// ─── Supplier Payments ──────────────────────────────────────────────────────

export async function getSupplierPayments() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        // Supplier payments are DEBIT/MANUAL_OUT (paying suppliers) or PURCHASE
        const transactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                OR: [
                    { source: "MANUAL_OUT", type: "DEBIT" },
                    { source: "PURCHASE", type: "DEBIT" },
                    { source: "SUPPLIER_PAYMENT", type: "DEBIT" }
                ]
            },
            include: {
                account: { select: { name: true } }
            },
            orderBy: { date: "desc" }
        })

        // Resolve supplier names
        const supplierIds = transactions.filter(t => (t.source === "MANUAL_OUT" || t.source === "SUPPLIER_PAYMENT") && t.referenceId).map(t => t.referenceId as string)
        const purchaseIds = transactions.filter(t => t.source === "PURCHASE" && t.referenceId).map(t => t.referenceId as string)

        const suppliers = await db.supplier.findMany({
            where: { id: { in: supplierIds }, tenantId },
            select: { id: true, name: true }
        })

        const purchaseOrders = await db.purchaseOrder.findMany({
            where: { id: { in: purchaseIds }, tenantId },
            include: { supplier: { select: { id: true, name: true } } }
        })

        const cheques = await db.cheque.findMany({
            where: { id: { in: supplierIds }, tenantId },
            include: { supplier: { select: { id: true, name: true } } }
        })

        const mappedPayments = transactions.map(t => {
            let supplierName = "Fournisseur inconnu"
            let foundSupplierId: string | undefined = undefined
            const paymentMethod = t.account?.name || "Inconnu"

            if (t.source === "MANUAL_OUT" || t.source === "SUPPLIER_PAYMENT") {
                const supplier = suppliers.find(s => s.id === t.referenceId)
                if (supplier) {
                    supplierName = supplier.name
                    foundSupplierId = supplier.id
                } else {
                    const cheque = cheques.find(c => c.id === t.referenceId)
                    if (cheque?.supplier) {
                        supplierName = cheque.supplier.name
                        foundSupplierId = cheque.supplier.id
                    }
                }
            } else if (t.source === "PURCHASE") {
                const po = purchaseOrders.find(p => p.id === t.referenceId)
                if (po?.supplier) {
                    supplierName = po.supplier.name
                    foundSupplierId = po.supplier.id
                }
            }

            return {
                id: t.id,
                date: t.date.toISOString(),
                amount: Number(t.amount),
                source: t.source,
                description: t.description || "",
                accountName: paymentMethod,
                accountId: t.accountId,
                supplierName,
                supplierId: foundSupplierId,
                imageUrl: t.imageUrl,
            }
        })

        return mappedPayments
    } catch (error) {
        console.error("[GET_SUPPLIER_PAYMENTS]", error)
        return []
    }
}

// ─── Update Payment (Treasury Transaction) ──────────────────────────────────

export async function updatePayment(id: string, data: {
    amount: number
    description?: string
    date?: string
    accountId?: string
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        let oldPaymentCopy: any = null
        const result = await db.$transaction(async (tx) => {
            // Get the existing transaction
            const existing = await tx.treasuryTransaction.findFirst({
                where: { id, tenantId }
            })
            if (!existing) throw new Error("Paiement introuvable")
            oldPaymentCopy = existing

            const oldAmount = Number(existing.amount)
            const newAmount = data.amount
            const diff = newAmount - oldAmount
            const hasAccountChanged = data.accountId && data.accountId !== existing.accountId

            if (hasAccountChanged) {
                // 1. Revert old amount from old account
                await tx.treasuryAccount.update({
                    where: { id: existing.accountId },
                    data: {
                        balance: existing.type === "CREDIT"
                            ? { decrement: oldAmount }
                            : { increment: oldAmount }
                    }
                })

                // 2. Apply new amount to new account
                // Verify new account has enough funds if DEBIT
                const newAccount = await tx.treasuryAccount.findFirst({
                    where: { id: data.accountId, tenantId }
                })
                if (!newAccount) throw new Error("Nouveau compte introuvable")

                if (existing.type === "DEBIT" && Number(newAccount.balance) < newAmount) {
                    throw new Error("Fonds insuffisants dans le nouveau compte de trésorerie")
                }

                await tx.treasuryAccount.update({
                    where: { id: data.accountId },
                    data: {
                        balance: existing.type === "CREDIT"
                            ? { increment: newAmount }
                            : { decrement: newAmount }
                    }
                })
            } else {
                if (diff !== 0) {
                    // Check if existing account has enough funds if DEBIT and diff > 0
                    if (existing.type === "DEBIT" && diff > 0) {
                        const account = await tx.treasuryAccount.findFirst({
                            where: { id: existing.accountId, tenantId }
                        })
                        if (!account) throw new Error("Compte de trésorerie introuvable")
                        if (Number(account.balance) < diff) {
                            throw new Error("Fonds insuffisants dans le compte de trésorerie")
                        }
                    }

                    // Adjust treasury account balance
                    await tx.treasuryAccount.update({
                        where: { id: existing.accountId },
                        data: {
                            balance: existing.type === "CREDIT"
                                ? { increment: diff }
                                : { decrement: diff }
                        }
                    })
                }
            }

            // Update the transaction itself
            await tx.treasuryTransaction.update({
                where: { id },
                data: {
                    amount: data.amount,
                    accountId: data.accountId || undefined,
                    description: data.description,
                    date: data.date ? new Date(data.date) : undefined,
                }
            })

            if (diff !== 0) {
                // Adjust customer/supplier balance if this is a MANUAL transaction
                if (existing.referenceId) {
                    const isCustomer = await tx.customer.findFirst({ where: { id: existing.referenceId, tenantId: existing.tenantId } });
                    const isSupplier = await tx.supplier.findFirst({ where: { id: existing.referenceId, tenantId: existing.tenantId } });

                    if (isCustomer) {
                        if (existing.source === "MANUAL_IN" || existing.source === "CUSTOMER_PAYMENT") {
                            // Customer payment: more payment = less debt
                            await tx.customer.update({ where: { id: isCustomer.id }, data: { balance: { decrement: diff } } });
                        } else if (existing.source === "MANUAL_OUT" || existing.source === "CUSTOMER_LOAN") {
                            // Customer loan: more loan = more debt 
                            await tx.customer.update({ where: { id: isCustomer.id }, data: { balance: { increment: diff } } });
                        }
                    } else if (isSupplier) {
                        if (existing.source === "MANUAL_OUT" || existing.source === "SUPPLIER_PAYMENT") {
                            // Supplier payment: more payment = less debt
                            await tx.supplier.update({ where: { id: isSupplier.id }, data: { balance: { decrement: diff } } });
                        } else if (existing.source === "MANUAL_IN" || existing.source === "SUPPLIER_LOAN") {
                            // Supplier loan: more loan = more debt
                            await tx.supplier.update({ where: { id: isSupplier.id }, data: { balance: { increment: diff } } });
                        }
                    }
                }
            }

            return { success: "Paiement modifié avec succès" }
        })

        revalidatePath("/(dashboard)/payments")
        revalidatePath("/(dashboard)/treasury")
        revalidatePath("/(dashboard)/emprunt")
        revalidatePath("/(dashboard)/emprunt-fournisseur")
        logAudit({
            action: "UPDATE",
            entity: "PAYMENT",
            entityId: id,
            description: `Paiement mis à jour : ${data.description || id} (Montant: ${data.amount} DA)`,
            before: oldPaymentCopy ? { amount: Number(oldPaymentCopy.amount), description: oldPaymentCopy.description, accountId: oldPaymentCopy.accountId } : undefined,
            after: { amount: data.amount, description: data.description, accountId: data.accountId }
        }).catch(() => null)
        return result
    } catch (error) {
        console.error("[UPDATE_PAYMENT]", error)
        return { error: error instanceof Error ? error.message : "Erreur lors de la modification" }
    }
}

// ─── Delete Payment (Treasury Transaction) ──────────────────────────────────

export async function deletePayment(id: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        let oldPaymentCopy: any = null
        const result = await db.$transaction(async (tx) => {
            const existing = await tx.treasuryTransaction.findFirst({
                where: { id, tenantId }
            })
            if (!existing) throw new Error("Paiement introuvable")
            oldPaymentCopy = existing

            const amount = Number(existing.amount)

            // Reverse treasury account balance
            await tx.treasuryAccount.update({
                where: { id: existing.accountId },
                data: {
                    balance: existing.type === "CREDIT"
                        ? { decrement: amount }
                        : { increment: amount }
                }
            })

            // Reverse customer/supplier balance if this is a MANUAL transaction
            if (existing.referenceId) {
                const isCustomer = await tx.customer.findFirst({ where: { id: existing.referenceId, tenantId: existing.tenantId } });
                const isSupplier = await tx.supplier.findFirst({ where: { id: existing.referenceId, tenantId: existing.tenantId } });

                if (isCustomer) {
                    if (existing.source === "MANUAL_IN" || existing.source === "CUSTOMER_PAYMENT") {
                        // Reverse Customer payment: debt comes back (+amount)
                        await tx.customer.update({ where: { id: isCustomer.id }, data: { balance: { increment: amount } } });
                    } else if (existing.source === "MANUAL_OUT" || existing.source === "CUSTOMER_LOAN") {
                        // Reverse Customer loan: debt goes away (-amount)
                        await tx.customer.update({ where: { id: isCustomer.id }, data: { balance: { decrement: amount } } });
                    }
                } else if (isSupplier) {
                    if (existing.source === "MANUAL_OUT" || existing.source === "SUPPLIER_PAYMENT") {
                        // Reverse Supplier payment: debt comes back (+amount)
                        await tx.supplier.update({ where: { id: isSupplier.id }, data: { balance: { increment: amount } } });
                    } else if (existing.source === "MANUAL_IN" || existing.source === "SUPPLIER_LOAN") {
                        // Reverse Supplier loan: debt goes away (-amount)
                        await tx.supplier.update({ where: { id: isSupplier.id }, data: { balance: { decrement: amount } } });
                    }
                }
            }

            // Delete the transaction
            await tx.treasuryTransaction.delete({ where: { id } })

            return { success: "Paiement supprimé avec succès" }
        })

        revalidatePath("/(dashboard)/payments")
        revalidatePath("/(dashboard)/treasury")
        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/suppliers")
        revalidatePath("/(dashboard)/emprunt")
        revalidatePath("/(dashboard)/emprunt-fournisseur")
        logAudit({
            action: "DELETE",
            entity: "PAYMENT",
            entityId: id,
            description: `Paiement supprimé : ${oldPaymentCopy?.description || id} (Montant: ${oldPaymentCopy?.amount ? Number(oldPaymentCopy.amount) : 0} DA)`,
            before: oldPaymentCopy ? { amount: Number(oldPaymentCopy.amount), description: oldPaymentCopy.description, accountId: oldPaymentCopy.accountId } : undefined
        }).catch(() => null)
        return result
    } catch (error) {
        console.error("[DELETE_PAYMENT]", error)
        return { error: error instanceof Error ? error.message : "Erreur lors de la suppression" }
    }
}
