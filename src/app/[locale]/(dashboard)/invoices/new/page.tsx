"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, FileText, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { formatter } from "@/lib/utils"
import { getUninvoicedBLs, createInvoiceFromBLs } from "@/actions/invoices"
import { getCustomersForSelect } from "@/actions/customers"
import { toast } from "react-hot-toast"

export default function NewInvoicePage() {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [bls, setBls] = useState<any[]>([])
  const [selectedBLs, setSelectedBLs] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("TERM")

  useEffect(() => {
    getCustomersForSelect().then((res: any) => {
      if (res?.data) {
        setCustomers(res.data.map((c: any) => ({ value: c.id, label: c.name })))
      }
    })
  }, [])

  useEffect(() => {
    if (!customerId) {
      setBls([])
      setSelectedBLs(new Set())
      return
    }
    getUninvoicedBLs(customerId).then((res: any) => {
      if (res?.data) setBls(res.data)
      else setBls([])
      setSelectedBLs(new Set())
    })
  }, [customerId])

  const toggleBL = (id: string) => {
    setSelectedBLs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedBLs.size === bls.length) {
      setSelectedBLs(new Set())
    } else {
      setSelectedBLs(new Set(bls.map((bl) => bl.id)))
    }
  }

  // Aggregate selected BL items for preview
  const aggregated: Record<string, { name: string; quantity: number; priceHt: number; tvaRate: number }> = {}
  let previewTotal = 0
  let previewTva = 0

  for (const bl of bls.filter((b) => selectedBLs.has(b.id))) {
    for (const item of bl.items) {
      const key = item.productId
      const ht = Number(item.priceHt) * item.quantity
      const tva = ht * (Number(item.tvaRate) / 100)
      if (!aggregated[key]) {
        aggregated[key] = {
          name: item.product.name,
          quantity: 0,
          priceHt: Number(item.priceHt),
          tvaRate: Number(item.tvaRate),
        }
      }
      aggregated[key].quantity += item.quantity
      previewTotal += ht + tva
      previewTva += tva
    }
  }
  const previewSubtotal = previewTotal - previewTva

  const handleCreate = async () => {
    if (!customerId) {
      toast.error("Sélectionnez un client")
      return
    }
    if (selectedBLs.size === 0) {
      toast.error("Sélectionnez au moins un BL")
      return
    }

    setLoading(true)
    try {
      const result = await createInvoiceFromBLs({
        customerId,
        salesOrderIds: Array.from(selectedBLs),
        notes: notes || undefined,
        paymentMethod,
      })

      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success(`Facture créée: ${(result.data as any).invoiceNumber}`)
        router.push(`/${locale}/invoices/${(result.data as any).id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${locale}/invoices`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Heading
            title="Nouvelle Facture"
            description="Regroupez plusieurs BLs en une seule facture"
          />
        </div>

        <Separator />

        {/* Customer select */}
        <div className="max-w-md">
          <Label>Client *</Label>
          <SearchableSelect
            options={customers}
            value={customerId}
            onChange={setCustomerId}
            placeholder="Sélectionnez un client"
          />
        </div>

        {/* BLs to select */}
        {customerId && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                BLs non facturés ({bls.length})
              </h3>
              {bls.length > 0 && (
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedBLs.size === bls.length ? "Désélectionner tout" : "Tout sélectionner"}
                </Button>
              )}
            </div>

            {bls.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Aucun BL non facturé pour ce client
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedBLs.size === bls.length && bls.length > 0}
                          onCheckedChange={selectAll}
                        />
                      </TableHead>
                      <TableHead>N° BL</TableHead>
                      <TableHead>Articles</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bls.map((bl) => (
                      <TableRow
                        key={bl.id}
                        className={`cursor-pointer ${selectedBLs.has(bl.id) ? "bg-blue-50" : ""}`}
                        onClick={() => toggleBL(bl.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedBLs.has(bl.id)}
                            onCheckedChange={() => toggleBL(bl.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {bl.receiptNumber}
                        </TableCell>
                        <TableCell>
                          {bl.items
                            .map((i: any) => `${i.quantity}×${i.product.name}`)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatter.format(Number(bl.total))}
                        </TableCell>
                        <TableCell>
                          {new Date(bl.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* Aggregated preview */}
        {selectedBLs.size > 0 && (
          <>
            <Separator />
            <h3 className="text-lg font-semibold">
              Aperçu de la facture ({selectedBLs.size} BLs sélectionnés)
            </h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-center">Quantité totale</TableHead>
                    <TableHead className="text-right">Prix HT</TableHead>
                    <TableHead className="text-right">TVA %</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(aggregated).map(([productId, data]) => (
                    <TableRow key={productId}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {data.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(data.priceHt)}
                      </TableCell>
                      <TableCell className="text-right">{data.tvaRate}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatter.format(data.priceHt * data.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span className="font-semibold">{formatter.format(previewSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA</span>
                  <span className="font-semibold">{formatter.format(previewTva)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold">Total TTC</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatter.format(previewTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Mode de paiement</Label>
                <SearchableSelect
                  options={[
                    { value: "TERM", label: "À terme" },
                    { value: "CASH", label: "Espèces" },
                    { value: "TRANSFER", label: "Virement" },
                    { value: "CHECK", label: "Chèque" },
                  ]}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur la facture..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/invoices`)}
              >
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                <FileText className="mr-2 h-4 w-4" />
                {loading ? "Création..." : "Créer la facture"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
