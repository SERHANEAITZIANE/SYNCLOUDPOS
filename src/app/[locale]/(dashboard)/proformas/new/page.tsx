"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, Plus, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatter } from "@/lib/utils"
import { createProforma } from "@/actions/proformas"
import { getCustomersForSelect } from "@/actions/customers"
import { getProductsForSelect } from "@/actions/products"
import { toast } from "react-hot-toast"

interface ProformaItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  tvaRate: number
  priceHt: number
}

export default function NewProformaPage() {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ProformaItem[]>([])
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    getCustomersForSelect().then((res: any) => {
      if (res?.data) {
        setCustomers(
          res.data.map((c: any) => ({ value: c.id, label: c.name }))
        )
      }
    })
    getProductsForSelect().then((res: any) => {
      if (res?.data) {
        setProducts(res.data)
      }
    })
  }, [])

  const addItem = (productId: string) => {
    if (items.find((i) => i.productId === productId)) return
    const product = products.find((p: any) => p.id === productId)
    if (!product) return
    const tvaRate = Number(product.tvaRate)
    const priceTtc = Number(product.price)
    const priceHt = priceTtc / (1 + tvaRate / 100)

    setItems((prev) => [
      ...prev,
      {
        productId,
        productName: product.name,
        quantity: 1,
        unitPrice: priceTtc,
        tvaRate,
        priceHt: Math.round(priceHt * 100) / 100,
      },
    ])
  }

  const updateItem = (index: number, field: string, value: number) => {
    setItems((prev) => {
      const updated = [...prev]
      ;(updated[index] as any)[field] = value
      // Recalc priceHt if unitPrice changes
      if (field === "unitPrice") {
        updated[index].priceHt =
          Math.round(
            (value / (1 + updated[index].tvaRate / 100)) * 100
          ) / 100
      }
      return updated
    })
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce(
    (sum, i) => sum + i.priceHt * i.quantity,
    0
  )
  const tvaAmount = items.reduce(
    (sum, i) => sum + i.priceHt * i.quantity * (i.tvaRate / 100),
    0
  )
  const total = subtotal + tvaAmount

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Sélectionnez un client")
      return
    }
    if (items.length === 0) {
      toast.error("Ajoutez au moins un article")
      return
    }

    setLoading(true)
    try {
      const result = await createProforma({
        customerId,
        notes: notes || undefined,
        subtotal,
        tvaAmount,
        stampTax: 0,
        total,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          tvaRate: i.tvaRate,
          priceHt: i.priceHt,
        })),
      })

      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success("Proforma créé avec succès!")
        router.push(`/${locale}/proformas/${(result.data as any).id}`)
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
            onClick={() => router.push(`/${locale}/proformas`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Heading
            title="Nouveau Proforma"
            description="Créez un devis proforma pour votre client"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Client *</Label>
            <SearchableSelect
              options={customers}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Sélectionnez un client"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes..."
            />
          </div>
        </div>

        <Separator />

        {/* Product selector */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchableSelect
              options={products.map((p: any) => ({
                value: p.id,
                label: `${p.name} — ${formatter.format(Number(p.price))}`,
              }))}
              value=""
              onChange={(v) => v && addItem(v)}
              placeholder="Ajouter un produit..."
            />
          </div>
        </div>

        {/* Items table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead className="text-right">Prix TTC</TableHead>
                <TableHead className="text-right">TVA %</TableHead>
                <TableHead className="text-right">Prix HT</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                      }
                      className="w-20 mx-auto text-center"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      className="w-28 ml-auto text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right">{item.tvaRate}%</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(item.priceHt)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatter.format(item.priceHt * item.quantity)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Ajoutez des produits ci-dessus
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-semibold">{formatter.format(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-semibold">{formatter.format(tvaAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-bold">Total TTC</span>
              <span className="font-bold text-green-600 text-lg">
                {formatter.format(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/proformas`)}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer le proforma"}
          </Button>
        </div>
      </div>
    </div>
  )
}
