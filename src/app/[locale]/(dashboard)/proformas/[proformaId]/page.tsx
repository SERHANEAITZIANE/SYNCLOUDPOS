import { getProformaById } from "@/actions/proformas"
import { notFound } from "next/navigation"
import { ProformaDetail } from "./proforma-detail"

export default async function ProformaDetailPage({
  params,
}: {
  params: Promise<{ proformaId: string }>
}) {
  const { proformaId } = await params
  const result = await getProformaById(proformaId)

  if (!result || "error" in result) return notFound()

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProformaDetail proforma={result.data as any} />
      </div>
    </div>
  )
}
