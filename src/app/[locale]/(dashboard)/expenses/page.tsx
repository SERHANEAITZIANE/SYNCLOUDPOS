
import { format } from "date-fns"
import { getExpenses } from "@/actions/expenses"
import { ExpensesClient } from "./components/client"
import { ExpenseColumn } from "@/components/expenses/types"
import { formatter } from "@/lib/utils"

const ExpensesPage = async () => {
    const expenses = await getExpenses()

    const formattedExpenses: ExpenseColumn[] = expenses.map((item) => ({
        id: item.id,
        description: item.description,
        amount: formatter.format(Number(item.amount)),
        category: item.category.name,
        date: format(item.date, "MMMM do, yyyy"),
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
        imageUrl: item.imageUrl,
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ExpensesClient data={formattedExpenses} />
            </div>
        </div>
    )
}

export default ExpensesPage
