import { getSupplierLedger } from "@/actions/ledger"
import { getSuppliers } from "@/actions/suppliers"
import { SupplierLedgerClient } from "@/components/suppliers/ledger-client"
import { redirect } from "next/navigation"

export default async function SupplierLedgerPage({
    params
}: {
    params: Promise<{ supplierId: string, locale: string }>
}) {
    // Await params to fix Next15 async-route warning
    const { supplierId, locale } = await params;

    const { suppliers } = await getSuppliers()
    const supplier = (suppliers as any[]).find((c: any) => c.id === supplierId)

    if (!supplier) {
        redirect(`/${locale}/dashboard/suppliers`)
    }

    const { lines, finalBalance } = await getSupplierLedger(supplierId)

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SupplierLedgerClient
                    data={lines}
                    finalBalance={finalBalance}
                    supplierName={supplier.name}
                />
            </div>
        </div>
    )
}
