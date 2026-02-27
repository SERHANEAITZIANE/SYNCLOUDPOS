
import { getExpenseCategories } from "@/actions/expenses"
import { getTreasuryAccounts } from "@/actions/treasury"
import { ExpenseForm } from "@/components/expenses/expense-form"

const NewExpensePage = async () => {
    const categories = await getExpenseCategories()
    const accounts = await getTreasuryAccounts()

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ExpenseForm
                    initialData={null}
                    categories={categories}
                    accounts={accounts}
                />
            </div>
        </div>
    )
}

export default NewExpensePage
