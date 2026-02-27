import { getCustomerLedger } from "@/actions/ledger"
import { getCustomers } from "@/actions/customers"
import { LedgerClient } from "@/components/customers/ledger-client"
import { redirect } from "next/navigation"

export default async function CustomerLedgerPage({
    params
}: {
    params: Promise<{ customerId: string, locale: string }>
}) {
    const { customerId, locale } = await params;

    const { customers } = await getCustomers()
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
                />
            </div>
        </div>
    )
}
