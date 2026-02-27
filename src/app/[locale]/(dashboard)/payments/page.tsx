import { getCustomerPayments } from "@/actions/payments"
import { getCustomers } from "@/actions/customers"
import { PaymentsClient } from "@/components/payments/client"

export default async function PaymentsPage() {
    // 1. Fetch all historic payments initially (or limited arbitrarily to last 6 months)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // We fetch a larger range to allow client-side filtering to work well initially. 
    // In production we could default to 30 days and add a strict server-side start/end date 
    // search trigger if needed. For now, we will fetch the last 30 days as default
    const payments = await getCustomerPayments()

    // 2. Fetch customers for the filter dropdown
    const customersResponse = await getCustomers()
    let customersList: { id: string; name: string }[] = []
    if (customersResponse && 'customers' in customersResponse) {
        customersList = (customersResponse.customers as any[]).map(c => ({
            id: c.id,
            name: c.name
        }))
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PaymentsClient data={payments as any[]} customers={customersList} />
            </div>
        </div>
    )
}
