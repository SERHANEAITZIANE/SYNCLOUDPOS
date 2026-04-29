import { getSupplierPayments } from "@/actions/payments"
import { getSuppliers } from "@/actions/suppliers"
import { getTreasuryAccounts } from "@/actions/treasury"
import { SupplierPaymentsClient } from "@/components/payments/supplier-client"

export default async function SupplierPaymentsPage() {
    const payments = await getSupplierPayments()
    
    const suppliersResponse = await getSuppliers(1, 10000)
    let suppliersList: { id: string; name: string }[] = []
    if (suppliersResponse && 'suppliers' in suppliersResponse) {
        suppliersList = (suppliersResponse.suppliers as any[]).map(s => ({
            id: s.id,
            name: s.name
        }))
    }

    const accounts = await getTreasuryAccounts()
    const mappedAccounts = accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SupplierPaymentsClient 
                    data={payments as any[]} 
                    suppliers={suppliersList}
                    accounts={mappedAccounts}
                />
            </div>
        </div>
    )
}
