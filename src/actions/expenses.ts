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
        revalidatePath("/[locale]/(dashboard)/expenses", "page")
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
        revalidatePath("/[locale]/(dashboard)/expenses", "page")
        revalidatePath("/[locale]/(dashboard)/treasury", "page")
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
            include: { category: true, account: true },
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

        await db.$transaction(async (tx) => {
            const expense = await tx.expense.findUnique({
                where: { id, tenantId }
            })

            if (!expense) throw new Error("Expense not found")

            // If it had a treasury account imputed, refund it
            if (expense.accountId && Number(expense.amount) > 0) {
                const account = await tx.treasuryAccount.findUnique({
                    where: { id: expense.accountId, tenantId }
                })
                if (account) {
                    await tx.treasuryAccount.update({
                        where: { id: expense.accountId },
                        data: { balance: { increment: expense.amount } }
                    })

                    // Delete the treasury transaction
                    await tx.treasuryTransaction.deleteMany({
                        where: {
                            source: "EXPENSE",
                            referenceId: id,
                            tenantId
                        }
                    })
                }
            }

            await tx.expense.delete({
                where: { id, tenantId }
            })
        })

        revalidatePath("/dashboard/expenses")
        revalidatePath("/dashboard/treasury")
        revalidatePath("/[locale]/(dashboard)/expenses", "page")
        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        return { success: true }
    } catch (error: any) {
        console.error("[DELETE_EXPENSE]", error)
        return { error: error.message || "Internal Error" }
    }
}

export async function getExpense(id: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        const expense = await db.expense.findUnique({
            where: { id, tenantId },
            include: { category: true }
        })

        return expense
    } catch (error) {
        console.error("[GET_EXPENSE]", error)
        return null
    }
}

export async function updateExpense(
    id: string,
    data: {
        description: string
        amount: number
        categoryId: string
        accountId?: string
        date?: Date
        imageUrl?: string
    }
) {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const tenantId = session.user.tenantId

        await db.$transaction(async (tx) => {
            const oldExpense = await tx.expense.findUnique({
                where: { id, tenantId }
            })

            if (!oldExpense) throw new Error("Expense not found")

            // 1. Undo old treasury effect
            if (oldExpense.accountId && Number(oldExpense.amount) > 0) {
                const oldAccount = await tx.treasuryAccount.findUnique({
                    where: { id: oldExpense.accountId, tenantId }
                })
                if (oldAccount) {
                    await tx.treasuryAccount.update({
                        where: { id: oldExpense.accountId },
                        data: { balance: { increment: oldExpense.amount } }
                    })

                    await tx.treasuryTransaction.deleteMany({
                        where: {
                            source: "EXPENSE",
                            referenceId: id,
                            tenantId
                        }
                    })
                }
            }

            // 2. Apply new treasury effect
            if (data.accountId && data.accountId !== "none" && data.amount > 0) {
                const newAccount = await tx.treasuryAccount.findUnique({
                    where: { id: data.accountId, tenantId }
                })
                if (!newAccount) throw new Error("Selected treasury account not found")

                if (Number(newAccount.balance) < data.amount) {
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
                        balanceBefore: newAccount.balance,
                        balanceAfter: updatedAccount.balance,
                        source: "EXPENSE",
                        referenceId: id,
                        description: `Expense: ${data.description}`,
                        tenantId
                    }
                })
            }

            // 3. Update expense row
            await tx.expense.update({
                where: { id, tenantId },
                data: {
                    description: data.description,
                    amount: data.amount,
                    categoryId: data.categoryId,
                    accountId: data.accountId === "none" ? null : (data.accountId || null),
                    date: data.date || new Date(),
                    imageUrl: data.imageUrl || null
                }
            })
        })

        revalidatePath("/dashboard/expenses")
        revalidatePath("/dashboard/treasury")
        revalidatePath("/[locale]/(dashboard)/expenses", "page")
        revalidatePath("/[locale]/(dashboard)/treasury", "page")
        return { success: true }
    } catch (error: any) {
        console.error("[UPDATE_EXPENSE]", error)
        return { error: error.message || "Internal Error" }
    }
}
