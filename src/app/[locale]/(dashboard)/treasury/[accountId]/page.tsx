import { getTreasuryAccount, getTreasuryTransactions } from "@/actions/treasury"
import { formatter } from "@/lib/utils"
import { format } from "date-fns"
import { TransactionsClient } from "./components/client"
import { TreasuryTransactionColumn } from "./components/types"
import { redirect } from "@/i18n/routing"

const TransactionLogPage = async ({
    params
}: {
    params: Promise<{ accountId: string, locale: string }>
}) => {
    const { accountId, locale } = await params;
    const account = await getTreasuryAccount(accountId)
    if (!account) {
        redirect({ href: "/treasury", locale })
    }

    const transactions = await getTreasuryTransactions(accountId)

    const formattedTransactions: TreasuryTransactionColumn[] = transactions.map((item: any) => ({
        id: item.id,
        date: format(item.date, "MMMM do, yyyy HH:mm"),
        rawDate: item.date,
        type: item.type,
        amount: formatter.format(Number(item.amount)),
        rawAmount: Number(item.amount),
        balanceBefore: formatter.format(Number(item.balanceBefore)),
        rawBalanceBefore: Number(item.balanceBefore),
        balanceAfter: formatter.format(Number(item.balanceAfter)),
        rawBalanceAfter: Number(item.balanceAfter),
        source: item.source,
        description: item.description || "-",
        accountName: account.name,
        referenceId: item.referenceId,
        referenceNumber: (item as any).referenceNumber || null
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <TransactionsClient data={formattedTransactions} account={account as any} locale={locale} />
            </div>
        </div>
    )
}

export default TransactionLogPage
