import { getCustomerLedger } from "@/actions/ledger"
import { getCustomers } from "@/actions/customers"
import { LedgerClient } from "@/components/customers/ledger-client"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export default async function CustomerLedgerPage({
    params
}: {
    params: Promise<{ customerId: string, locale: string }>
}) {
    const { customerId, locale } = await params;

    const session = await auth()
    const storeId = session?.user?.defaultStoreId
    let storeName = "SYNCLOUDPOS"
    if (storeId) {
        const store = await db.store.findUnique({ where: { id: storeId }, select: { name: true } })
        if (store) storeName = store.name
    }

    const { customers } = await getCustomers(1, 10000)
    const customer = (customers as any[]).find((c: any) => c.id === customerId)

    if (!customer) {
        redirect(`/${locale}/dashboard/customers`)
    }

    const { lines, finalBalance } = await getCustomerLedger(customerId)

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <LedgerClient
                    data={lines}
                    finalBalance={finalBalance}
                    customerName={customer.name}
                    customerPhone={customer.phone || undefined}
                    customerAddress={customer.address || undefined}
                    customerCity={customer.city || undefined}
                    customerTaxId={customer.nif || customer.taxId || undefined}
                    customerType={customer.clientType || "RETAIL"}
                    storeName={storeName}
                />
            </div>
        </div>
    )
}
