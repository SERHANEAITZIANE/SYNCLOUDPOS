import { UnpaidClient } from "@/components/customers/unpaid-client"
import { CustomerColumn } from "@/components/customers/types"
import { getUnpaidCustomers } from "@/actions/customers"
import { getTreasuryAccounts } from "@/actions/treasury"

export default async function UnpaidCustomersPage() {
    const { customers } = await getUnpaidCustomers()
    const accounts = await getTreasuryAccounts()

    // Filter accounts if we only want banks or safe (caisse). Right now grabbing all.
    const mappedAccounts = accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))

    const formattedCustomers: CustomerColumn[] = ((customers as any) || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone || "",
        email: item.email || "",
        address: item.address || "",
        city: item.city || "",
        taxId: item.taxId || "",
        balance: Number(item.balance ?? 0),
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <UnpaidClient data={formattedCustomers} accounts={mappedAccounts} />
            </div>
        </div>
    )
}
