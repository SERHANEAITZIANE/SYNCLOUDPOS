
import { SupplierClient } from "@/components/suppliers/client"
import { SupplierColumn } from "@/components/suppliers/types"
import { getSuppliers } from "@/actions/suppliers"
import { getTreasuryAccounts } from "@/actions/treasury"

export default async function SuppliersPage() {
    const { suppliers } = await getSuppliers()
    const accounts = await getTreasuryAccounts()
    const mappedAccounts = accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))

    const formattedSuppliers: SupplierColumn[] = ((suppliers as any) || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        contactPerson: item.contactPerson || "",
        phone: item.phone || "",
        email: item.email || "",
        address: item.address || "",
        taxId: item.taxId || "",
        balance: item.balance ?? 0,
        createdAt: item.createdAt.toISOString(),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SupplierClient data={formattedSuppliers} accounts={mappedAccounts} />
            </div>
        </div>
    )
}
