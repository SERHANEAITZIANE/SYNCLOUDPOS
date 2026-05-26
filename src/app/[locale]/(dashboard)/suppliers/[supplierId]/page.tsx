
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { SupplierForm } from "@/components/suppliers/supplier-form"

export default async function SupplierPage({
    params
}: {
    params: Promise<{ supplierId: string }>
}) {
    const { supplierId } = await params

    const session = await auth()
    const tenantId = session?.user?.tenantId

    let supplier = null

    if (supplierId !== "new" && tenantId) {
        supplier = await db.supplier.findFirst({
            where: {
                id: supplierId,
                tenantId
            }
        })
    }

    let formattedSupplier = null
    if (supplier) {
        formattedSupplier = {
            ...supplier,
            balance: supplier.balance ? Number(supplier.balance) : 0
        }
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SupplierForm initialData={formattedSupplier} />
            </div>
        </div>
    )
}
