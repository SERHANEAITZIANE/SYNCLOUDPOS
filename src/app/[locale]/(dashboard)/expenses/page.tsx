
import { format } from "date-fns"
import { getExpenses, getExpenseCategories } from "@/actions/expenses"
import { getTreasuryAccounts } from "@/actions/treasury"
import { ExpensesClient } from "./components/client"
import { ExpenseColumn } from "@/components/expenses/types"
import { formatter } from "@/lib/utils"

const ExpensesPage = async () => {
    const expensesPromise = getExpenses()
    const categoriesPromise = getExpenseCategories()
    const accountsPromise = getTreasuryAccounts()

    const [expenses, categories, accounts] = await Promise.all([
        expensesPromise,
        categoriesPromise,
        accountsPromise
    ])

    const formattedExpenses: ExpenseColumn[] = expenses.map((item: any) => ({
        id: item.id,
        description: item.description,
        amount: formatter.format(Number(item.amount)),
        category: item.category.name,
        categoryId: item.categoryId,
        accountId: item.accountId || "none",
        accountName: item.account?.name || "Aucun",
        date: format(item.date, "MMMM do, yyyy"),
        rawDate: item.date instanceof Date ? item.date.toISOString() : new Date(item.date).toISOString(),
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
        imageUrl: item.imageUrl,
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ExpensesClient 
                    data={formattedExpenses} 
                    categories={categories}
                    accounts={accounts}
                />
            </div>
        </div>
    )
}

export default ExpensesPage
