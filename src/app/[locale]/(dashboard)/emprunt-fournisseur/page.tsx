import { getSupplierLoans } from "@/actions/suppliers"
import { getSuppliers } from "@/actions/suppliers"
import { EmpruntFournisseurClient } from "@/components/emprunt-fournisseur/client"

export default async function EmpruntFournisseurPage() {
    const loans = await getSupplierLoans()

    const suppliersResponse = await getSuppliers()
    let suppliersList: { id: string; name: string }[] = []
    if (suppliersResponse && "suppliers" in suppliersResponse) {
        suppliersList = (suppliersResponse.suppliers as any[]).map(s => ({
            id: s.id,
            name: s.name
        }))
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <EmpruntFournisseurClient data={loans as any[]} suppliers={suppliersList} />
            </div>
        </div>
    )
}
