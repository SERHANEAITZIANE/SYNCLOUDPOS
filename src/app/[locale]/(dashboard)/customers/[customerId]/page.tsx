
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { CustomerForm } from "@/components/customers/customer-form"

export default async function CustomerPage({
    params
}: {
    params: Promise<{ customerId: string }>
}) {
    const { customerId } = await params

    // If it's "new", we pass null. DB search might fail for "new" if uuid validation was strict,
    // but here we just check if it matches a record.

    const session = await auth()
    const tenantId = session?.user?.tenantId

    let customer = null

    if (customerId !== "new" && tenantId) {
        customer = await db.customer.findFirst({
            where: {
                id: customerId,
                tenantId
            }
        })
    }

    let formattedCustomer = null
    if (customer) {
        formattedCustomer = {
            ...customer,
            balance: customer.balance ? Number(customer.balance) : 0
        }
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CustomerForm initialData={formattedCustomer} />
            </div>
        </div>
    )
}
