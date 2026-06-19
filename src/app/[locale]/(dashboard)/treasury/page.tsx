
import { getFinancialSummary, getTreasuryAccounts, getAllTreasuryTransactions } from "@/actions/treasury"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatter } from "@/lib/utils"
import { format } from "date-fns"
import { CreditCard, DollarSign, TrendingDown, TrendingUp } from "lucide-react"
import { TreasuryClient } from "./components/client"
import { TreasuryAccountColumn } from "./components/types"
import { TreasuryMovementColumn } from "./components/mouvements-columns"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

const TreasuryPage = async () => {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER" && session?.user?.role !== "ACCOUNTANT" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    const summary = await getFinancialSummary()
    const accounts = await getTreasuryAccounts()
    const transactions = await getAllTreasuryTransactions()

    const formattedAccounts: TreasuryAccountColumn[] = accounts.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        rib: item.rib,
        balance: formatter.format(Number(item.balance)),
        rawBalance: Number(item.balance),
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    const formattedMovements: TreasuryMovementColumn[] = transactions.map((item) => ({
        id: item.id,
        date: format(item.date, "MMMM do, yyyy HH:mm"),
        rawDate: item.date,
        type: item.type,
        amount: formatter.format(Number(item.amount)),
        balanceAfter: formatter.format(Number(item.balanceAfter)),
        source: item.source,
        description: item.description || "-",
        accountName: item.accountName,
        referenceId: item.referenceId,
        referenceNumber: (item as any).referenceNumber || null
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Heading title="Treasury" description="Financial overview and cash flow" />
                <Separator />

                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Revenue (Paid)
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatter.format(summary.totalSales)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Purchases
                            </CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">-{formatter.format(summary.totalPurchases)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Expenses
                            </CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">-{formatter.format(summary.totalExpenses)}</div>
                        </CardContent>
                    </Card>
                </div>

                <TreasuryClient accounts={formattedAccounts} movements={formattedMovements} />
            </div>
        </div>
    )
}

export default TreasuryPage
