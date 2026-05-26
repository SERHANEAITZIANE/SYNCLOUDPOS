"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"

export async function createExpenseCategory(data: { name: string; type: "FIXED" | "VARIABLE" }) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const category = await db.expenseCategory.create({
            data: {
                name: data.name,
                type: data.type,
                tenantId
            }
        })

        revalidatePath("/dashboard/expenses")
        return category
    } catch (error) {
        console.error("[CREATE_EXPENSE_CATEGORY]", error)
        throw new Error("Internal Error")
    }
}

export async function getExpenseCategories() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const categories = await db.expenseCategory.findMany({
            where: { tenantId },
            orderBy: { name: "asc" }
        })

        return categories
    } catch (error) {
        console.error("[GET_EXPENSE_CATEGORIES]", error)
        return []
    }
}

export async function createExpense(data: {
    description: string
    amount: number
    categoryId: string
    accountId?: string
    date?: Date
    imageUrl?: string
}) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const expense = await db.$transaction(async (tx) => {
            const newExpense = await tx.expense.create({
                data: {
                    description: data.description,
                    amount: data.amount,
                    categoryId: data.categoryId,
                    accountId: data.accountId || undefined,
                    date: data.date || new Date(),
                    imageUrl: data.imageUrl || undefined,
                    tenantId
                }
            })

            if (data.accountId && data.amount > 0) {
                const account = await tx.treasuryAccount.findUnique({ where: { id: data.accountId, tenantId } })
                if (account) {
                    if (Number(account.balance) < data.amount) {
                        throw new Error("Insufficient funds in the selected account")
                    }

                    const updatedAccount = await tx.treasuryAccount.update({
                        where: { id: data.accountId },
                        data: { balance: { decrement: data.amount } }
                    })

                    await tx.treasuryTransaction.create({
                        data: {
                            accountId: data.accountId,
                            type: "DEBIT",
                            amount: data.amount,
                            balanceBefore: account.balance,
                            balanceAfter: updatedAccount.balance,
                            source: "EXPENSE",
                            referenceId: newExpense.id,
                            description: `Expense: ${data.description}`,
                            tenantId
                        }
                    })
                }
            }

            return newExpense
        })

        revalidatePath("/dashboard/expenses")
        revalidatePath("/dashboard/treasury")
        return { success: true, id: expense.id }
    } catch (error: any) {
        console.error("[CREATE_EXPENSE]", error)
        return { error: error.message || "Internal Error" }
    }
}

export async function getExpenses() {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const expenses = await db.expense.findMany({
            where: { tenantId },
            include: { category: true },
            orderBy: { date: "desc" }
        })

        return expenses
    } catch (error) {
        console.error("[GET_EXPENSES]", error)
        return []
    }
}

export async function deleteExpense(id: string) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        await db.expense.delete({
            where: { id, tenantId }
        })

        revalidatePath("/dashboard/expenses")
        revalidatePath("/dashboard/treasury")
        return { success: true }
    } catch (error) {
        console.error("[DELETE_EXPENSE]", error)
        throw new Error("Internal Error")
    }
}
