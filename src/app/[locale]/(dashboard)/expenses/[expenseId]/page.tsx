import { getExpenseCategories, getExpense } from "@/actions/expenses"
import { getTreasuryAccounts } from "@/actions/treasury"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { redirect } from "next/navigation"

const ExpensePage = async ({
    params
}: {
    params: Promise<{ expenseId: string }>
}) => {
    const { expenseId } = await params

    const categories = await getExpenseCategories()
    const accounts = await getTreasuryAccounts()
    const expense = await getExpense(expenseId)

    if (!expense) {
        redirect("/expenses")
    }

    // Serialize Prisma objects (like Decimal) into plain JSON
    const safeExpense = JSON.parse(JSON.stringify(expense))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ExpenseForm
                    initialData={safeExpense}
                    categories={categories}
                    accounts={accounts}
                />
            </div>
        </div>
    )
}

export default ExpensePage
