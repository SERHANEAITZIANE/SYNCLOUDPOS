"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"
import { requirePermission } from "@/lib/rbac"

export async function getFinancialSummary() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        // 1. Total Sales (Paid)
        const sales = await db.salesOrder.findMany({
            where: {
                tenantId,
                status: "PAID"
            },
            select: { total: true }
        })
        const totalSales = sales.reduce((acc, order) => acc + Number(order.total), 0)

        // 2. Total Purchases (Completed)
        const purchases = await db.purchaseOrder.findMany({
            where: {
                tenantId,
                status: "COMPLETED"
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

        const transactions = await db.treasuryTransaction.findMany({
            where: { accountId, tenantId },
            orderBy: { date: "desc" }
        })

        return transactions.map(t => ({
            ...t,
            amount: Number(t.amount),
            balanceBefore: Number(t.balanceBefore),
            balanceAfter: Number(t.balanceAfter)
        }))
    } catch (error) {
        console.error("[GET_TREASURY_TRANSACTIONS]", error)
        return []
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
            orderBy: { date: "desc" }
        })

        return transactions.map(t => ({
            ...t,
            amount: Number(t.amount),
            balanceBefore: Number(t.balanceBefore),
            balanceAfter: Number(t.balanceAfter),
            accountName: t.account.name
        }))
    } catch (error) {
        console.error("[GET_ALL_TREASURY_TRANSACTIONS]", error)
        return []
    }
}

export async function deleteTreasuryAccount(id: string) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        await db.treasuryAccount.delete({
            where: { id, tenantId }
        })

        revalidatePath("/[locale]/(dashboard)/treasury", "page")
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
        return { success: "Transaction completed!" }
    } catch (error: any) {
        console.error("[MANUAL_TRANSACTION]", error)
        return { error: error.message || "Internal Error" }
    }
}

