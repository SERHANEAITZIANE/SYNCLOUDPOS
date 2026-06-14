"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"
import { requirePermission } from "@/lib/rbac"
import { logAudit } from "./audit-log"

export async function getFinancialSummary() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        // 1. Total Sales (Paid)
        // POS Orders
        const posOrders = await db.order.findMany({
            where: {
                tenantId,
                status: "COMPLETED"
            },
            select: { paidAmount: true }
        })
        const posSalesTotal = posOrders.reduce((acc, order) => acc + Number(order.paidAmount), 0)

        // Sales Orders (BL / Invoice)
        const salesOrders = await db.salesOrder.findMany({
            where: {
                tenantId,
                status: { in: ["PAID", "VALIDATED", "PARTIAL"] }
            },
            select: { amountPaid: true }
        })
        const salesOrdersTotal = salesOrders.reduce((acc, order) => acc + Number(order.amountPaid), 0)

        const totalSales = posSalesTotal + salesOrdersTotal

        // 2. Total Purchases (Completed, Facture, Bon de Livraison)
        const purchases = await db.purchaseOrder.findMany({
            where: {
                tenantId,
                status: { in: ["COMPLETED", "FACTURE", "BON_LIVRAISON"] }
            },
            select: { total: true }
        })
        const totalPurchases = purchases.reduce((acc, order) => acc + Number(order.total), 0)

        // 3. Total Expenses
        const expenses = await db.expense.aggregate({
            where: { tenantId },
            _sum: { amount: true }
        })
        const totalExpenses = Number(expenses._sum.amount) || 0

        // 4. Net Profit
        const netProfit = totalSales - (totalPurchases + totalExpenses)

        return {
            totalSales,
            totalPurchases,
            totalExpenses,
            netProfit
        }
    } catch (error) {
        console.error("[GET_FINANCIAL_SUMMARY]", error)
        return {
            totalSales: 0,
            totalPurchases: 0,
            totalExpenses: 0,
            netProfit: 0
        }
    }
}

import { TreasuryAccountSchema } from "@/schemas"
import * as z from "zod"

export async function createTreasuryAccount(values: z.infer<typeof TreasuryAccountSchema>) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const validatedFields = TreasuryAccountSchema.safeParse(values)
        if (!validatedFields.success) return { error: "Invalid fields!" }

        const { name, type, balance, rib } = validatedFields.data

        const account = await db.treasuryAccount.create({
            data: {
                name,
                type,
                balance,
                rib,
                tenantId
            }
        })

        if (balance > 0) {
            await db.treasuryTransaction.create({
                data: {
                    accountId: account.id,
                    type: "CREDIT",
                    amount: balance,
                    balanceBefore: 0,
                    balanceAfter: balance,
                    source: "INITIAL_BALANCE",
                    description: "Initial Balance",
                    tenantId
                }
            })
        }

        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        logAudit({
            action: "CREATE",
            entity: "TREASURY",
            entityId: account.id,
            description: `Compte de trésorerie créé : ${name} (${type}, Solde: ${balance} DA)`,
            after: { name, type, balance, rib }
        }).catch(() => null)
        return {
            success: "Account created!",
            account: {
                ...account,
                balance: Number(account.balance)
            }
        }
    } catch (error) {
        console.error("[CREATE_TREASURY_ACCOUNT]", error)
        return { error: "Internal Error" }
    }
}

export async function getTreasuryAccounts() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const accounts = await db.treasuryAccount.findMany({
            where: { tenantId },
            orderBy: { name: "asc" }
        })

        return accounts.map(account => ({
            ...account,
            balance: Number(account.balance)
        }))
    } catch (error) {
        console.error("[GET_TREASURY_ACCOUNTS]", error)
        return []
    }
}

export async function getTreasuryAccount(id: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const account = await db.treasuryAccount.findUnique({
            where: { id, tenantId }
        })

        if (!account) return null
        return {
            ...account,
            balance: Number(account.balance)
        }
    } catch (error) {
        console.error("[GET_TREASURY_ACCOUNT]", error)
        return null
    }
}

export async function getTreasuryTransactions(accountId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        // Get ALL transactions for this account, sorted by date ASC (oldest first)
        const transactions = await db.treasuryTransaction.findMany({
            where: { accountId, tenantId },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }]
        })

        // Recalculate running balance from scratch
        let runningBalance = 0
        const recalculated = transactions.map(t => {
            const amount = Number(t.amount)
            const balanceBefore = runningBalance
            if (t.type === "CREDIT") {
                runningBalance += amount
            } else {
                runningBalance -= amount
            }
            return {
                ...t,
                amount,
                balanceBefore,
                balanceAfter: runningBalance
            }
        })

        // Return in DESC order (newest first) for display
        return recalculated.reverse()
    } catch (error) {
        console.error("[GET_TREASURY_TRANSACTIONS]", error)
        return []
    }
}

export async function getCashbook(accountId: string, year: number, month: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59, 999)

        const account = await db.treasuryAccount.findUnique({
            where: { id: accountId, tenantId }
        })
        if (!account) return { error: "Compte introuvable" }

        // Get ALL transactions up to end of month, sorted chronologically
        const allTransactions = await db.treasuryTransaction.findMany({
            where: { accountId, tenantId, date: { lte: endDate } },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }]
        })

        // Recalculate running balance from scratch
        let runningBalance = 0
        let openingBalance = 0
        const periodEntries: any[] = []

        for (const t of allTransactions) {
            const amount = Number(t.amount)
            const balanceBefore = runningBalance
            if (t.type === "CREDIT") {
                runningBalance += amount
            } else {
                runningBalance -= amount
            }

            if (t.date < startDate) {
                // Before period - just track running balance for opening
                openingBalance = runningBalance
            } else {
                // Within period
                periodEntries.push({
                    id: t.id,
                    date: t.date.toISOString(),
                    type: t.type,
                    amount,
                    balanceBefore,
                    balanceAfter: runningBalance,
                    source: t.source,
                    description: t.description || "-",
                    referenceId: t.referenceId
                })
            }
        }

        const totalIn = periodEntries.filter(e => e.type === "CREDIT").reduce((sum: number, e: any) => sum + e.amount, 0)
        const totalOut = periodEntries.filter(e => e.type === "DEBIT").reduce((sum: number, e: any) => sum + e.amount, 0)
        const closingBalance = periodEntries.length > 0 ? periodEntries[periodEntries.length - 1].balanceAfter : openingBalance

        return {
            entries: periodEntries,
            totals: {
                openingBalance,
                totalIn,
                totalOut,
                closingBalance
            },
            accountName: account.name,
            period: `${String(month).padStart(2, "0")}/${year}`
        }
    } catch (error) {
        console.error("[GET_CASHBOOK]", error)
        return { error: "Erreur lors du calcul du livre de caisse" }
    }
}

export async function getAllTreasuryTransactions() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const transactions = await db.treasuryTransaction.findMany({
            where: { tenantId },
            include: {
                account: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }]
        })

        // Recalculate running balance per account
        const balanceByAccount: Record<string, number> = {}
        const recalculated = transactions.map(t => {
            const accountId = t.accountId
            if (!(accountId in balanceByAccount)) {
                balanceByAccount[accountId] = 0
            }
            const amount = Number(t.amount)
            const balanceBefore = balanceByAccount[accountId]
            if (t.type === "CREDIT") {
                balanceByAccount[accountId] += amount
            } else {
                balanceByAccount[accountId] -= amount
            }
            return {
                ...t,
                amount,
                balanceBefore,
                balanceAfter: balanceByAccount[accountId],
                accountName: t.account.name
            }
        })

        // Return in DESC order (newest first) for display
        return recalculated.reverse()
    } catch (error) {
        console.error("[GET_ALL_TREASURY_TRANSACTIONS]", error)
        return []
    }
}

export async function updateTreasuryAccount(id: string, values: z.infer<typeof TreasuryAccountSchema>) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const validatedFields = TreasuryAccountSchema.safeParse(values)
        if (!validatedFields.success) return { error: "Invalid fields!" }

        const { name, type, rib } = validatedFields.data

        const existingAccount = await db.treasuryAccount.findUnique({
            where: { id, tenantId }
        })
        if (!existingAccount) return { error: "Compte introuvable" }

        const account = await db.treasuryAccount.update({
            where: { id, tenantId },
            data: {
                name,
                type,
                rib
            }
        })

        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        logAudit({
            action: "UPDATE",
            entity: "TREASURY",
            entityId: id,
            description: `Compte de trésorerie mis à jour : ${name}`,
            before: { name: existingAccount.name, type: existingAccount.type, rib: existingAccount.rib },
            after: { name, type, rib }
        }).catch(() => null)
        return {
            success: "Compte mis à jour !",
            account: {
                ...account,
                balance: Number(account.balance)
            }
        }
    } catch (error) {
        console.error("[UPDATE_TREASURY_ACCOUNT]", error)
        return { error: "Internal Error" }
    }
}

export async function deleteTreasuryAccount(id: string) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const existingAccount = await db.treasuryAccount.findUnique({
            where: { id, tenantId }
        })

        await db.treasuryAccount.delete({
            where: { id, tenantId }
        })

        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        logAudit({
            action: "DELETE",
            entity: "TREASURY",
            entityId: id,
            description: `Compte de trésorerie supprimé : ${existingAccount?.name || id}`,
            before: existingAccount ? { name: existingAccount.name, type: existingAccount.type, balance: Number(existingAccount.balance) } : undefined
        }).catch(() => null)
        return { success: "Account deleted!" }
    } catch (error) {
        console.error("[DELETE_TREASURY_ACCOUNT]", error)
        return { error: "Internal Error" }
    }
}

export async function transferFunds(fromAccountId: string, toAccountId: string, amount: number, description?: string) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        if (amount <= 0) return { error: "Amount must be greater than 0" }
        if (fromAccountId === toAccountId) return { error: "Cannot transfer to the same account" }

        await db.$transaction(async (tx) => {
            const fromAccount = await tx.treasuryAccount.findUnique({ where: { id: fromAccountId, tenantId } })
            const toAccount = await tx.treasuryAccount.findUnique({ where: { id: toAccountId, tenantId } })

            if (!fromAccount || !toAccount) {
                throw new Error("Account not found")
            }

            if (Number(fromAccount.balance) < amount) {
                throw new Error("Insufficient funds in source account")
            }

            // Update balances
            const updatedFrom = await tx.treasuryAccount.update({
                where: { id: fromAccountId },
                data: { balance: { decrement: amount } }
            })

            const updatedTo = await tx.treasuryAccount.update({
                where: { id: toAccountId },
                data: { balance: { increment: amount } }
            })

            // Record Transactions
            await tx.treasuryTransaction.create({
                data: {
                    accountId: fromAccountId,
                    type: "DEBIT",
                    amount,
                    balanceBefore: fromAccount.balance,
                    balanceAfter: updatedFrom.balance,
                    source: "TRANSFER",
                    description: description || `Transfer to ${toAccount.name}`,
                    tenantId
                }
            })

            await tx.treasuryTransaction.create({
                data: {
                    accountId: toAccountId,
                    type: "CREDIT",
                    amount,
                    balanceBefore: toAccount.balance,
                    balanceAfter: updatedTo.balance,
                    source: "TRANSFER",
                    description: description || `Transfer from ${fromAccount.name}`,
                    tenantId
                }
            })
        })

        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        logAudit({
            action: "TRANSFER",
            entity: "TREASURY",
            description: `Transfert de fonds : ${amount} DA transférés (Compte source ID: ${fromAccountId} → Compte destination ID: ${toAccountId})`,
            after: { fromAccountId, toAccountId, amount, description }
        }).catch(() => null)
        return { success: "Transfer completed successfully!" }
    } catch (error: any) {
        console.error("[TRANSFER_FUNDS]", error)
        return { error: error.message || "Internal Error" }
    }
}

export async function createManualTransaction(accountId: string, type: "CREDIT" | "DEBIT", amount: number, description: string) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        if (amount <= 0) return { error: "Amount must be greater than 0" }

        await db.$transaction(async (tx) => {
            const account = await tx.treasuryAccount.findUnique({ where: { id: accountId, tenantId } })
            if (!account) throw new Error("Account not found")

            if (type === "DEBIT" && Number(account.balance) < amount) {
                throw new Error("Insufficient funds in account")
            }

            const updatedAccount = await tx.treasuryAccount.update({
                where: { id: accountId },
                data: {
                    balance: type === "CREDIT" ? { increment: amount } : { decrement: amount }
                }
            })

            await tx.treasuryTransaction.create({
                data: {
                    accountId,
                    type,
                    amount,
                    balanceBefore: account.balance,
                    balanceAfter: updatedAccount.balance,
                    source: type === "CREDIT" ? "MANUAL_IN" : "MANUAL_OUT",
                    description,
                    tenantId
                }
            })
        })

        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        logAudit({
            action: type === "CREDIT" ? "CREATE" : "VOID",
            entity: "TREASURY",
            description: `Opération manuelle sur compte ID ${accountId} : ${type === "CREDIT" ? "Entrée" : "Sortie"} de ${amount} DA (${description})`,
            after: { accountId, type, amount, description }
        }).catch(() => null)
        return { success: "Transaction completed!" }
    } catch (error: any) {
        console.error("[MANUAL_TRANSACTION]", error)
        return { error: error.message || "Internal Error" }
    }
}

