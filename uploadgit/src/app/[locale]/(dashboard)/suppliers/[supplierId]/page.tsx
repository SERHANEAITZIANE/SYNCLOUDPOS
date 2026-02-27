
import { db } from "@/lib/db"
import { SupplierForm } from "@/components/suppliers/supplier-form"

export default async function SupplierPage({
    params
}: {
    params: Promise<{ supplierId: string }>
}) {
    const { supplierId } = await params

    let supplier = null

    if (supplierId !== "new") {
        supplier = await db.supplier.findUnique({
            where: {
                id: supplierId
            }
        })
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SupplierForm initialData={supplier} />
            </div>
        </div>
    )
}
