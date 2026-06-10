import { getProformas } from "@/actions/proformas"
import { ProformaClient } from "./components/client"
import { format } from "date-fns"

export default async function ProformasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; limit?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 20
  const result = await getProformas({
    page,
    limit,
    status: params.status,
  })

  const proformas = (result as any).data ?? []
  const total = (result as any).total ?? 0
  const pageCount = Math.ceil(total / limit)

  const formatted = proformas.map((p: any) => ({
    id: p.id,
    proformaNumber: p.proformaNumber,
    customer: p.customer.name,
    customerId: p.customerId,
    status: p.status,
    total: Number(p.total),
    itemsCount: p.items.length,
    deliveredCount: p.items.filter(
      (i: any) => i.quantityDelivered >= i.quantity
    ).length,
    validUntil: p.validUntil
      ? format(new Date(p.validUntil), "dd/MM/yyyy")
      : null,
    createdAt: format(new Date(p.createdAt), "dd/MM/yyyy"),
  }))

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProformaClient
          data={formatted}
          totalCount={total}
          pageCount={pageCount}
          currentPage={page}
        />
      </div>
    </div>
  )
}
