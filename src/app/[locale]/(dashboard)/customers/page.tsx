import { CustomerClient } from "@/components/customers/client"
import { CustomerColumn } from "@/components/customers/types"
import { getCustomers } from "@/actions/customers"
import { getTreasuryAccounts } from "@/actions/treasury"

export default async function CustomersPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string, name?: string }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const pageSize = 20
    const search = params.name || ""

    const { customers, totalCount } = await getCustomers(page, pageSize, search) as { customers: any[], totalCount: number }
    const accounts = await getTreasuryAccounts()
    const mappedAccounts = accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))

    const formattedCustomers: CustomerColumn[] = (customers || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone || "",
        email: item.email || "",
        address: item.address || "",
        city: item.city || "",
        taxId: item.taxId || "",
        balance: Number(item.balance ?? 0),
        clientType: item.clientType || "RETAIL",
        createdAt: item.createdAt.toISOString(),
    }))

    const pageCount = Math.ceil(totalCount / pageSize)

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CustomerClient
                    data={formattedCustomers}
                    accounts={mappedAccounts}
                    totalCount={totalCount}
                    pageCount={pageCount}
                    currentPage={page}
                />
            </div>
        </div>
    )
}
