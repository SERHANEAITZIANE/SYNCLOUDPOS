"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Truck, FileText, ArrowLeft, CheckCircle, XCircle, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { formatter } from "@/lib/utils"
import { createBLFromProforma, updateProformaStatus } from "@/actions/proformas"
import { toast } from "react-hot-toast"

interface ProformaDetailProps {
  proforma: {
    id: string
    proformaNumber: string
    status: string
    subtotal: number
    tvaAmount: number
    stampTax: number
    total: number
    notes: string | null
    validUntil: string | null
    createdAt: string
    customer: { id: string; name: string; phone?: string; email?: string }
    items: {
      id: string
      productId: string
      quantity: number
      quantityDelivered: number
      unitPrice: number
      tvaRate: number
      priceHt: number
      product: { id: string; name: string }
    }[]
    salesOrders: {
      id: string
      receiptNumber: string
      status: string
      total: number
      createdAt: string
      items: { productId: string; quantity: number; product: { name: string } }[]
    }[]
  }
}

export function ProformaDetail({ proforma }: ProformaDetailProps) {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [blMode, setBlMode] = useState(false)
  const [blQuantities, setBlQuantities] = useState<Record<string, number>>({})

  // Initialize BL quantities with remaining amounts
  const openBlCreation = () => {
    const quantities: Record<string, number> = {}
    for (const item of proforma.items) {
      const remaining = item.quantity - item.quantityDelivered
      if (remaining > 0) {
        quantities[item.id] = remaining
      }
    }
    setBlQuantities(quantities)
    setBlMode(true)
  }

  const handleCreateBL = async () => {
    setLoading(true)
    try {
      const itemsToDeliver = proforma.items
        .filter((item) => (blQuantities[item.id] || 0) > 0)
        .map((item) => ({
          productId: item.productId,
          proformaItemId: item.id,
          quantity: blQuantities[item.id],
          unitPrice: Number(item.unitPrice),
          tvaRate: Number(item.tvaRate),
          priceHt: Number(item.priceHt),
        }))

      if (itemsToDeliver.length === 0) {
        toast.error("Sélectionnez au moins un article à livrer")
        return
      }

      const result = await createBLFromProforma({
        proformaId: proforma.id,
        items: itemsToDeliver,
      })

      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success(`BL créé: ${(result.data as any).receiptNumber}`)
        setBlMode(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    setLoading(true)
    try {
      const result = await updateProformaStatus(proforma.id, status)
      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success("Statut mis à jour")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const canCreateBL = ["ACCEPTED", "PARTIALLY_DELIVERED"].includes(proforma.status)
  const canAccept = proforma.status === "DRAFT" || proforma.status === "SENT"

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${locale}/proformas`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Heading
            title={`Proforma ${proforma.proformaNumber}`}
            description={`Client: ${proforma.customer.name}`}
          />
          <Badge
            variant={
              proforma.status === "COMPLETED"
                ? "default"
                : proforma.status === "REJECTED"
                  ? "destructive"
                  : "secondary"
            }
          >
            {proforma.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {proforma.status === "DRAFT" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("SENT")}
              disabled={loading}
            >
              <Send className="mr-2 h-4 w-4" />
              Envoyer
            </Button>
          )}
          {canAccept && (
            <>
              <Button
                onClick={() => handleStatusChange("ACCEPTED")}
                disabled={loading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accepter
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusChange("REJECTED")}
                disabled={loading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeter
              </Button>
            </>
          )}
          {canCreateBL && !blMode && (
            <Button onClick={openBlCreation} disabled={loading}>
              <Truck className="mr-2 h-4 w-4" />
              Créer un BL
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Proforma Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Sous-total HT</p>
          <p className="text-lg font-semibold">{formatter.format(Number(proforma.subtotal))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">TVA</p>
          <p className="text-lg font-semibold">{formatter.format(Number(proforma.tvaAmount))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total TTC</p>
          <p className="text-lg font-bold text-green-600">{formatter.format(Number(proforma.total))}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="text-lg font-semibold">{new Date(proforma.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
      </div>

      {/* Items Table - with BL creation mode */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-center">Qté commandée</TableHead>
              <TableHead className="text-center">Déjà livré</TableHead>
              <TableHead className="text-center">Restant</TableHead>
              {blMode && (
                <TableHead className="text-center text-blue-600">
                  Qté à livrer
                </TableHead>
              )}
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead className="text-right">Total HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proforma.items.map((item) => {
              const remaining = item.quantity - item.quantityDelivered
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.quantityDelivered >= item.quantity ? "default" : "secondary"}>
                      {item.quantityDelivered}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {remaining > 0 ? (
                      <span className="text-orange-500 font-semibold">{remaining}</span>
                    ) : (
                      <span className="text-green-500">✓</span>
                    )}
                  </TableCell>
                  {blMode && (
                    <TableCell className="text-center">
                      {remaining > 0 ? (
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          value={blQuantities[item.id] || 0}
                          onChange={(e) => {
                            const val = Math.min(
                              Math.max(0, parseInt(e.target.value) || 0),
                              remaining
                            )
                            setBlQuantities((prev) => ({
                              ...prev,
                              [item.id]: val,
                            }))
                          }}
                          className="w-20 mx-auto text-center"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {formatter.format(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">{Number(item.tvaRate)}%</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatter.format(Number(item.priceHt) * item.quantity)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* BL creation controls */}
      {blMode && (
        <div className="flex justify-end gap-2 p-4 bg-blue-50 rounded-lg">
          <p className="flex-1 text-sm text-muted-foreground mt-2">
            Saisissez les quantités à livrer pour ce BL. Vous pourrez créer d&apos;autres BLs plus tard pour le restant.
          </p>
          <Button variant="outline" onClick={() => setBlMode(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleCreateBL} disabled={loading}>
            <Truck className="mr-2 h-4 w-4" />
            {loading ? "Création..." : "Confirmer le BL"}
          </Button>
        </div>
      )}

      {/* Historical BLs from this proforma */}
      {proforma.salesOrders.length > 0 && (
        <>
          <Heading
            title="Bons de livraison"
            description="BLs créés depuis ce proforma"
          />
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° BL</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proforma.salesOrders.map((bl) => (
                  <TableRow
                    key={bl.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/sales/${bl.id}`)}
                  >
                    <TableCell className="font-mono font-semibold">
                      {bl.receiptNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{bl.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {bl.items.map((i) => `${i.quantity}×${i.product.name}`).join(", ")}
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
        </>
      )}
    </>
  )
}
