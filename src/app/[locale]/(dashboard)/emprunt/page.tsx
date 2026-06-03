import { getCustomerLoans, getCustomers } from "@/actions/customers"
import { getTreasuryAccounts } from "@/actions/treasury"
import { EmpruntClient } from "@/components/emprunt/client"
import LoanLayout from "@/components/emprunt/loan-layout"

export default async function EmpruntPage() {
    const loans = await getCustomerLoans()
    const treasuryAccounts = await getTreasuryAccounts()

    const customersResponse = await getCustomers(1, 10000)
    let customersList: { id: string; name: string }[] = []
    if (customersResponse && "customers" in customersResponse) {
        customersList = (customersResponse.customers as any[]).map(c => ({
            id: c.id,
            name: c.name
        }))
    }

    return (
        <LoanLayout>
            <div className="flex-col">
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <EmpruntClient data={loans as any[]} customers={customersList} treasuryAccounts={treasuryAccounts} />
                </div>
            </div>
        </LoanLayout>
    )
}
