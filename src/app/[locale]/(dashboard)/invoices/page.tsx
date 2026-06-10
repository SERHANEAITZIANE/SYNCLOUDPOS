import { getInvoices } from "@/actions/invoices"
import { InvoiceClient } from "./components/client"
import { format } from "date-fns"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; limit?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 20
  const result = await getInvoices({ page, limit, status: params.status })

  const invoices = (result as any).data ?? []
  const total = (result as any).total ?? 0
  const pageCount = Math.ceil(total / limit)

  const formatted = invoices.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customer: inv.customer.name,
    customerId: inv.customerId,
    status: inv.status,
    paymentStatus: inv.paymentStatus,
    total: Number(inv.total),
    amountPaid: Number(inv.amountPaid),
    blCount: new Set(inv.items.map((i: any) => i.salesOrderId)).size,
    createdAt: format(new Date(inv.createdAt), "dd/MM/yyyy"),
  }))

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InvoiceClient
          data={formatted}
          totalCount={total}
          pageCount={pageCount}
          currentPage={page}
        />
      </div>
    </div>
  )
}
