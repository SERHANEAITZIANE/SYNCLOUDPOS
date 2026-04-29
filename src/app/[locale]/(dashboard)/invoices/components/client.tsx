"use client"

import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Plus, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ServerDataTable } from "@/components/ui/server-data-table"
import { ColumnDef } from "@tanstack/react-table"
import { formatter } from "@/lib/utils"

interface InvoiceRow {
  id: string
  invoiceNumber: string
  customer: string
  customerId: string
  status: string
  paymentStatus: string
  total: number
  amountPaid: number
  blCount: number
  createdAt: string
}

const paymentBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Non payée", variant: "destructive" },
  PARTIAL: { label: "Partiel", variant: "outline" },
  PAID: { label: "Payée", variant: "default" },
}

export function InvoiceClient({
  data,
  totalCount,
  pageCount,
  currentPage,
}: {
  data: InvoiceRow[]
  totalCount: number
  pageCount: number
  currentPage: number
}) {
  const locale = useLocale()
  const router = useRouter()

  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "N° Facture",
      cell: ({ row }) => (
        <span className="font-mono font-semibold">{row.original.invoiceNumber}</span>
      ),
    },
    { accessorKey: "customer", header: "Client" },
    {
      accessorKey: "paymentStatus",
      header: "Paiement",
      cell: ({ row }) => {
        const cfg = paymentBadge[row.original.paymentStatus] ?? {
          label: row.original.paymentStatus,
          variant: "secondary",
        }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">{formatter.format(row.original.total)}</span>
      ),
    },
    {
      id: "paid",
      header: "Payé",
      cell: ({ row }) => (
        <span>
          {formatter.format(row.original.amountPaid)} / {formatter.format(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: "blCount",
      header: "BLs",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.blCount} BL(s)</Badge>
      ),
    },
    { accessorKey: "createdAt", header: "Date" },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => router.push(`/${locale}/invoices/${row.original.id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Factures (${totalCount})`}
          description="Factures regroupant les bons de livraison"
        />
        <Button onClick={() => router.push(`/${locale}/invoices/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>
      <Separator />
      <ServerDataTable
        columns={columns}
        data={data}
        pageCount={pageCount}
        currentPage={currentPage}
        searchKey="customer"
      />
    </>
  )
}
