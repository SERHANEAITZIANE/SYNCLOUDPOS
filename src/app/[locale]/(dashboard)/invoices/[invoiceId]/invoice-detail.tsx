"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, CreditCard, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { formatter } from "@/lib/utils"
import { recordInvoicePayment } from "@/actions/invoices"
import { toast } from "react-hot-toast"

interface InvoiceDetailProps {
  invoice: {
    id: string
    invoiceNumber: string
    status: string
    paymentStatus: string
    paymentMethod: string | null
    subtotal: number
    tvaAmount: number
    stampTax: number
    total: number
    amountPaid: number
    dueDate: string | null
    notes: string | null
    createdAt: string
    customer: { id: string; name: string; phone?: string; email?: string }
    store: { id: string; name: string } | null
    items: {
      id: string
      productId: string
      quantity: number
      unitPrice: number
      tvaRate: number
      priceHt: number
      product: { id: string; name: string }
      salesOrder: { id: string; receiptNumber: string; createdAt: string }
    }[]
  }
}

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const router = useRouter()
  const locale = useLocale()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(
    Number(invoice.total) - Number(invoice.amountPaid)
  )
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [loading, setLoading] = useState(false)

  const remaining = Number(invoice.total) - Number(invoice.amountPaid)

  const handlePayment = async () => {
    if (paymentAmount <= 0 || paymentAmount > remaining) {
      toast.error(`Montant invalide (max: ${formatter.format(remaining)})`)
      return
    }
    setLoading(true)
    try {
      const result = await recordInvoicePayment({
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentMethod,
      })
      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success("Paiement enregistré")
        setPaymentOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  // Group items by BL for display
  const byBL: Record<string, typeof invoice.items> = {}
  for (const item of invoice.items) {
    const blId = item.salesOrder.id
    if (!byBL[blId]) byBL[blId] = []
    byBL[blId].push(item)
  }

  // Aggregate products across all BLs
  const aggregated: Record<string, { name: string; totalQty: number; priceHt: number; tvaRate: number }> = {}
  for (const item of invoice.items) {
    if (!aggregated[item.productId]) {
      aggregated[item.productId] = {
        name: item.product.name,
        totalQty: 0,
        priceHt: Number(item.priceHt),
        tvaRate: Number(item.tvaRate),
      }
    }
    aggregated[item.productId].totalQty += item.quantity
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${locale}/invoices`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Heading
            title={`Facture ${invoice.invoiceNumber}`}
            description={`Client: ${invoice.customer.name}`}
          />
          <Badge
            variant={
              invoice.paymentStatus === "PAID"
                ? "default"
                : invoice.paymentStatus === "PARTIAL"
                  ? "outline"
                  : "destructive"
            }
          >
            {invoice.paymentStatus === "PAID"
              ? "Payée"
              : invoice.paymentStatus === "PARTIAL"
                ? "Partiel"
                : "Non payée"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {remaining > 0 && (
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Enregistrer paiement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enregistrer un paiement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Montant restant</Label>
                    <p className="text-lg font-bold text-red-600">
                      {formatter.format(remaining)}
                    </p>
                  </div>
                  <div>
                    <Label>Montant à payer</Label>
                    <Input
                      type="number"
                      step="0.01"
                      max={remaining}
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label>Mode de paiement</Label>
                    <SearchableSelect
                      options={[
                        { value: "CASH", label: "Espèces" },
                        { value: "TRANSFER", label: "Virement" },
                        { value: "CHECK", label: "Chèque" },
                      ]}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePayment}
                    disabled={loading}
                  >
                    {loading ? "Enregistrement..." : "Confirmer le paiement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
        </div>
      </div>

      <Separator />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Sous-total HT</p>
          <p className="text-lg font-semibold">{formatter.format(Number(invoice.subtotal))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">TVA</p>
          <p className="text-lg font-semibold">{formatter.format(Number(invoice.tvaAmount))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total TTC</p>
          <p className="text-lg font-bold text-green-600">{formatter.format(Number(invoice.total))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Payé</p>
          <p className="text-lg font-bold text-blue-600">{formatter.format(Number(invoice.amountPaid))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Restant</p>
          <p className={`text-lg font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatter.format(remaining)}
          </p>
        </div>
      </div>

      {/* Aggregated product summary */}
      <Heading title="Résumé des produits" description="Quantités agrégées de tous les BLs" />
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-center">Quantité totale</TableHead>
              <TableHead className="text-right">Prix HT unitaire</TableHead>
              <TableHead className="text-right">TVA %</TableHead>
              <TableHead className="text-right">Total HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(aggregated).map(([productId, data]) => (
              <TableRow key={productId}>
                <TableCell className="font-medium">{data.name}</TableCell>
                <TableCell className="text-center font-semibold">{data.totalQty}</TableCell>
                <TableCell className="text-right">{formatter.format(data.priceHt)}</TableCell>
                <TableCell className="text-right">{data.tvaRate}%</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatter.format(data.priceHt * data.totalQty)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail by BL */}
      <Heading title="Détail par BL" description="Articles ventilés par bon de livraison" />
      {Object.entries(byBL).map(([blId, items]) => (
        <div key={blId} className="border rounded-lg p-4 space-y-2">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded"
            onClick={() => router.push(`/${locale}/sales/${blId}`)}
          >
            <span className="font-mono font-semibold text-blue-600">
              {items[0].salesOrder.receiptNumber}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(items[0].salesOrder.createdAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Qté</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(Number(item.priceHt) * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </>
  )
}
