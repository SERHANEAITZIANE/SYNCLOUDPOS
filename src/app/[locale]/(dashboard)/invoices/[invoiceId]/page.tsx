import { getInvoiceById } from "@/actions/invoices"
import { notFound } from "next/navigation"
import { InvoiceDetail } from "./invoice-detail"

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  const result = await getInvoiceById(invoiceId)

  if (!result || "error" in result) return notFound()

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InvoiceDetail invoice={result.data as any} />
      </div>
    </div>
  )
}
