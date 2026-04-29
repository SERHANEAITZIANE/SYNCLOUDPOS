"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Plus, Eye, FileText, Truck, BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ServerDataTable } from "@/components/ui/server-data-table"
import { ColumnDef } from "@tanstack/react-table"
import { formatter } from "@/lib/utils"

interface ProformaRow {
  id: string
  proformaNumber: string
  customer: string
  customerId: string
  status: string
  total: number
  itemsCount: number
  deliveredCount: number
  validUntil: string | null
  createdAt: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  SENT: { label: "Envoyé", variant: "default" },
  ACCEPTED: { label: "Accepté", variant: "default" },
  PARTIALLY_DELIVERED: { label: "Livraison partielle", variant: "outline" },
  COMPLETED: { label: "Complété", variant: "default" },
  REJECTED: { label: "Rejeté", variant: "destructive" },
}

export function ProformaClient({
  data,
  totalCount,
  pageCount,
  currentPage,
}: {
  data: ProformaRow[]
  totalCount: number
  pageCount: number
  currentPage: number
}) {
  const locale = useLocale()
  const router = useRouter()

  const columns: ColumnDef<ProformaRow>[] = [
    {
      accessorKey: "proformaNumber",
      header: "N° Proforma",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-sm">
          {row.original.proformaNumber}
        </span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Client",
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const cfg = statusConfig[row.original.status] ?? {
          label: row.original.status,
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
      id: "progress",
      header: "Livraison",
      cell: ({ row }) => {
        const { deliveredCount, itemsCount } = row.original
        const pct = itemsCount > 0 ? Math.round((deliveredCount / itemsCount) * 100) : 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {deliveredCount}/{itemsCount}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "validUntil",
      header: "Valide jusqu'au",
      cell: ({ row }) => row.original.validUntil ?? "—",
    },
    {
      accessorKey: "createdAt",
      header: "Date",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              router.push(`/${locale}/proformas/${row.original.id}`)
            }
            title="Voir le proforma"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {["ACCEPTED", "PARTIALLY_DELIVERED"].includes(row.original.status) && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                router.push(`/${locale}/proformas/${row.original.id}/create-bl`)
              }
              title="Créer un BL"
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Proformas (${totalCount})`}
          description="Gérez vos devis proforma et suivez les livraisons partielles"
        />
        <Button onClick={() => router.push(`/${locale}/proformas/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau proforma
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
