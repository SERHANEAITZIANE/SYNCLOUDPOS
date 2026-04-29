import { getCustomerPayments } from "@/actions/payments"
import { getCustomers } from "@/actions/customers"
import { getTreasuryAccounts } from "@/actions/treasury"
import { PaymentsClient } from "@/components/payments/client"

export default async function PaymentsPage() {
    const payments = await getCustomerPayments()

    const customersResponse = await getCustomers(1, 10000)
    let customersList: { id: string; name: string }[] = []
    if (customersResponse && 'customers' in customersResponse) {
        customersList = (customersResponse.customers as any[]).map(c => ({
            id: c.id,
            name: c.name
        }))
    }

    const accounts = await getTreasuryAccounts()
    const mappedAccounts = accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PaymentsClient 
                    data={payments as any[]} 
                    customers={customersList}
                    accounts={mappedAccounts}
                />
            </div>
        </div>
    )
}
