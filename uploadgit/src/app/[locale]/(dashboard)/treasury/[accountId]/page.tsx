import { getTreasuryAccount, getTreasuryTransactions } from "@/actions/treasury"
import { formatter } from "@/lib/utils"
import { format } from "date-fns"
import { TransactionsClient } from "./components/client"
import { TreasuryTransactionColumn } from "./components/types"
import { redirect } from "@/i18n/routing"

const TransactionLogPage = async ({
    params
}: {
    params: { accountId: string, locale: string }
}) => {
    const account = await getTreasuryAccount(params.accountId)
    if (!account) {
        redirect({ href: "/treasury", locale: params.locale })
    }

    const transactions = await getTreasuryTransactions(params.accountId)

    const formattedTransactions: TreasuryTransactionColumn[] = transactions.map((item: any) => ({
        id: item.id,
        date: format(item.date, "MMMM do, yyyy HH:mm"),
        type: item.type,
        amount: formatter.format(Number(item.amount)),
        balanceAfter: formatter.format(Number(item.balanceAfter)),
        source: item.source,
        description: item.description || "-",
        referenceId: item.referenceId || null
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <TransactionsClient data={formattedTransactions} account={account as any} />
            </div>
        </div>
    )
}

export default TransactionLogPage
