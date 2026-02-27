import { getCustomerLoans } from "@/actions/customers"
import { getCustomers } from "@/actions/customers"
import { EmpruntClient } from "@/components/emprunt/client"

export default async function EmpruntPage() {
    const loans = await getCustomerLoans()

    const customersResponse = await getCustomers()
    let customersList: { id: string; name: string }[] = []
    if (customersResponse && "customers" in customersResponse) {
        customersList = (customersResponse.customers as any[]).map(c => ({
            id: c.id,
            name: c.name
        }))
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <EmpruntClient data={loans as any[]} customers={customersList} />
            </div>
        </div>
    )
}
