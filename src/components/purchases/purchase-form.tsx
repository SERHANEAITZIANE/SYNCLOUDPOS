"use client"

import * as z from "zod"
import { useState, useEffect, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useReactToPrint } from "react-to-print"
import { Trash, Plus, Printer, CheckCircle, TruckIcon, FileText, Package } from "lucide-react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { toast } from "react-hot-toast"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductSearchCombobox } from "@/components/ui/product-search-combobox"
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus
} from "@/actions/purchase-orders"
import { OcrReceiptUploader } from "./ocr-receipt-uploader"
import { MissingProductsForm } from "./missing-products-form"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    supplierId: z.string().min(1, "Fournisseur requis"),
    accountId: z.string().optional(),
    status: z.enum(["PENDING", "BON_COMMANDE", "BON_LIVRAISON", "FACTURE", "COMPLETED", "CANCELLED"]),
    notes: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1, "Produit requis"),
        quantity: z.number().min(1),
        costPrice: z.number().min(0)
    })).min(1, "Ajoutez au moins un article")
})

type FormValues = z.infer<typeof formSchema>

interface PurchaseOrderFormProps {
    initialData: any | null
    suppliers: any[]
    products: any[]
    categories: any[]
    brands: any[]
    accounts: any[]
}

const STATUS_CONFIG = {
    PENDING: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: Package },
    BON_COMMANDE: { label: "Bon de Commande", color: "bg-blue-100 text-blue-700", icon: FileText },
    BON_LIVRAISON: { label: "Bon de Livraison", color: "bg-amber-100 text-amber-700", icon: TruckIcon },
    FACTURE: { label: "Facture", color: "bg-purple-100 text-purple-700", icon: FileText },
    COMPLETED: { label: "Payé ✓", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700", icon: Trash },
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
    initialData,
    suppliers,
    products,
    categories,
    brands,
    accounts
}) => {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [ocrItems, setOcrItems] = useState<{ name: string, price: number, quantity: number }[]>([])
    const printRef = useRef<HTMLDivElement>(null)

    const isEditMode = !!initialData
    const canEdit = !isEditMode || ["PENDING", "BON_COMMANDE"].includes(initialData?.status)

    const title = isEditMode ? `Bon #${initialData?.id?.slice(-8).toUpperCase()}` : "Nouveau bon d'achat"
    const currentStatus = initialData?.status || "PENDING"
    const statusConf = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            supplierId: initialData.supplierId,
            accountId: initialData.accountId || "none",
            status: initialData.status,
            notes: initialData.notes || "",
            items: initialData.items.map((item: any) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                costPrice: Number(item.costPrice)
            }))
        } : {
            supplierId: "",
            accountId: "none",
            status: "BON_COMMANDE",
            notes: "",
            items: [{ productId: "", quantity: 1, costPrice: 0 }]
        }
    })

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })

    const watchItems = form.watch("items")
    const watchSupplierId = form.watch("supplierId")
    const selectedSupplier = suppliers.find(s => s.id === watchSupplierId)

    const total = watchItems.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0)

    const onSubmit = async (values: FormValues) => {
        try {
            setLoading(true)
            if (!isEditMode) {
                const result = await createPurchaseOrder({ ...values, total })
                if (result?.error) { toast.error(result.error); return }
                toast.success("Bon créé avec succès.")
                router.push(`/purchases`)
                router.refresh()
            } else {
                const result = await updatePurchaseOrder(initialData.id, { ...values, total })
                if (result?.error) { toast.error(result.error); return }
                toast.success("Bon modifié.")
                router.refresh()
            }
        } catch { toast.error("Une erreur est survenue.") }
        finally { setLoading(false) }
    }

    const handleStatusChange = async (newStatus: string, accountId?: string) => {
        if (!initialData) return
        try {
            setLoading(true)
            const result = await updatePurchaseOrderStatus(initialData.id, newStatus, accountId)
            if (result?.error) { toast.error(result.error); return }
            toast.success(result.success || "Statut mis à jour.")
            router.refresh()
            window.location.reload()
        } catch { toast.error("Erreur lors de la mise à jour.") }
        finally { setLoading(false) }
    }

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    })

    // Keyboard: Insert key = add item
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Insert" && ocrItems.length === 0) {
                e.preventDefault()
                append({ productId: "", quantity: 1, costPrice: 0 })
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [append, ocrItems.length])

    const handleOcrExtracted = (items: { name: string, price: number, quantity: number }[], supplierName?: string) => {
        setOcrItems(items)
        // Auto-select supplier if Gemini detected one
        if (supplierName && supplierName.trim()) {
            const lower = supplierName.trim().toLowerCase()
            const match = suppliers.find(s =>
                s.name.toLowerCase() === lower ||
                s.name.toLowerCase().includes(lower) ||
                lower.includes(s.name.toLowerCase())
            )
            if (match) {
                form.setValue("supplierId", match.id)
            }
        }
    }

    const handleMissingProductsComplete = (matchedItems: { productId: string, quantity: number, costPrice: number }[]) => {
        // Append all the matched/new items to the form
        const currentItems = form.getValues("items")

        // Remove the empty default row if it's the only one and empty
        const itemsToSet = (currentItems.length === 1 && !currentItems[0].productId)
            ? matchedItems
            : [...currentItems, ...matchedItems]

        form.setValue("items", itemsToSet)
        setOcrItems([]) // close the OCR flow
    }

    return (
        <>
            {/* ── Print-only layout ─────────────────────────────────────── */}
            <div className="hidden print:block p-8 text-sm" ref={printRef}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">{statusConf.label}</h1>
                        <p className="text-gray-500">Réf: #{initialData?.id?.slice(-8).toUpperCase()}</p>
                        <p className="text-gray-500">Date: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">SYNCLOUD POS</p>
                        <p className="text-sm text-gray-600">Fournisseur:<br />{selectedSupplier?.name}</p>
                    </div>
                </div>
                <table className="w-full border-collapse border border-gray-300 mb-6">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 p-2 text-left">Produit</th>
                            <th className="border border-gray-300 p-2 text-right">Qté</th>
                            <th className="border border-gray-300 p-2 text-right">P.U (DA)</th>
                            <th className="border border-gray-300 p-2 text-right">Total (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(initialData?.items || []).map((item: any, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                                <td className="border border-gray-300 p-2">{item.product?.name}</td>
                                <td className="border border-gray-300 p-2 text-right">{item.quantity}</td>
                                <td className="border border-gray-300 p-2 text-right">{Number(item.costPrice).toLocaleString()}</td>
                                <td className="border border-gray-300 p-2 text-right font-semibold">{(Number(item.costPrice) * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-100">
                            <td colSpan={3} className="border border-gray-300 p-2 text-right">TOTAL</td>
                            <td className="border border-gray-300 p-2 text-right">{Number(initialData?.total || 0).toLocaleString()} DA</td>
                        </tr>
                    </tfoot>
                </table>
                <div className="flex justify-between mt-8">
                    <div className="text-center">
                        <p className="font-semibold mb-8">Signature Fournisseur</p>
                        <div className="border-t border-gray-400 w-40"></div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold mb-8">Signature Responsable</p>
                        <div className="border-t border-gray-400 w-40"></div>
                    </div>
                </div>
            </div>

            {/* ── Screen UI ─────────────────────────────────────────────── */}
            <div className="print:hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heading title={title} description={isEditMode ? `Fournisseur: ${initialData?.supplier?.name}` : "Créer un bon d'achat"} />
                        {isEditMode && (
                            <Badge className={cn("text-xs px-2.5 py-1 font-semibold", statusConf.color)}>
                                {statusConf.label}
                            </Badge>
                        )}
                    </div>
                    {/* Action buttons for existing orders */}
                    {isEditMode && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-1.5" /> Imprimer
                            </Button>
                            {currentStatus === "PENDING" || currentStatus === "BON_COMMANDE" ? (
                                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}
                                    onClick={() => handleStatusChange("BON_LIVRAISON")}>
                                    <TruckIcon className="h-4 w-4 mr-1.5" /> Passer en Bon de Livraison
                                </Button>
                            ) : null}
                            {currentStatus === "BON_LIVRAISON" && (
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}
                                    onClick={() => handleStatusChange("FACTURE")}>
                                    <FileText className="h-4 w-4 mr-1.5" /> Créer Facture
                                </Button>
                            )}
                            {currentStatus === "FACTURE" && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}
                                    onClick={() => {
                                        const accId = form.getValues("accountId")
                                        handleStatusChange("COMPLETED", accId)
                                    }}>
                                    <CheckCircle className="h-4 w-4 mr-1.5" /> Marquer Payé
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <Separator className="my-4" />

                {/* Supplier info card (view mode) */}
                {isEditMode && selectedSupplier && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 bg-muted/20 rounded-lg border">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Fournisseur</p>
                            <p className="font-bold text-base">{selectedSupplier.name}</p>
                            {selectedSupplier.phone && <p className="text-sm text-muted-foreground">{selectedSupplier.phone}</p>}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Solde dû</p>
                            <p className={cn("text-2xl font-bold", Number(selectedSupplier.balance ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                                {Number(selectedSupplier.balance ?? 0).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Total bon</p>
                            <p className="text-3xl font-bold">{Number(initialData?.total || 0).toLocaleString()} DA</p>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Top fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="supplierId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fournisseur</FormLabel>
                                    <SearchableSelect
                                        options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={loading || !canEdit}
                                        placeholder="Sélectionner un fournisseur..."
                                        searchPlaceholder="Rechercher un fournisseur..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type de document</FormLabel>
                                    <Select disabled={loading || isEditMode} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="BON_COMMANDE">Bon de Commande</SelectItem>
                                            <SelectItem value="BON_LIVRAISON">Bon de Livraison (+Stock)</SelectItem>
                                            <SelectItem value="FACTURE">Facture</SelectItem>
                                            <SelectItem value="PENDING">Brouillon</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="accountId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Compte de paiement</FormLabel>
                                    <SearchableSelect
                                        options={[
                                            { value: "none", label: "Aucun / À régler" },
                                            ...accounts.map(a => ({ value: a.id, label: `${a.name} — ${a.balance}` }))
                                        ]}
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={loading}
                                        placeholder="Sélectionner un compte..."
                                        searchPlaceholder="Rechercher un compte..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <Separator />

                        {ocrItems.length > 0 ? (
                            <div className="space-y-4">
                                <MissingProductsForm
                                    scannedItems={ocrItems}
                                    existingProducts={products}
                                    categories={categories}
                                    brands={brands}
                                    onComplete={handleMissingProductsComplete}
                                />
                            </div>
                        ) : (
                            <>
                                {/* OCR Entry Point */}
                                {canEdit && (
                                    <div className="mb-6">
                                        <OcrReceiptUploader onProductsExtracted={handleOcrExtracted} disabled={loading} />
                                    </div>
                                )}

                                {/* Items */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-semibold flex items-center gap-2">
                                            <Package className="h-4 w-4" /> Articles
                                            <Badge variant="outline">{fields.length}</Badge>
                                        </h3>
                                        {canEdit && (
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 1, costPrice: 0 })}>
                                                <Plus className="h-4 w-4 mr-1.5" /> Ajouter (Insert)
                                            </Button>
                                        )}
                                    </div>

                                    {/* Column headers */}
                                    <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        <div className="col-span-5">Produit</div>
                                        <div className="col-span-2 text-center">Qté</div>
                                        <div className="col-span-3">Prix unitaire (DA)</div>
                                        <div className="col-span-1 text-right">Total</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {fields.map((field, index) => {
                                        const lineTotal = (watchItems[index]?.quantity || 0) * (watchItems[index]?.costPrice || 0)
                                        return (
                                            <Card key={field.id} className="overflow-hidden">
                                                <CardContent className="p-3 grid grid-cols-12 gap-3 items-center">
                                                    <div className="col-span-12 md:col-span-5">
                                                        <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <ProductSearchCombobox
                                                                        products={products}
                                                                        value={f.value}
                                                                        onChange={f.onChange}
                                                                        disabled={loading || !canEdit}
                                                                        placeholder="Rechercher produit..."
                                                                        priceField="cost"
                                                                        onPriceSelect={price => form.setValue(`items.${index}.costPrice`, price)}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-2">
                                                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input type="number" min={1} disabled={loading || !canEdit} className="text-center font-bold"
                                                                        {...f} onChange={e => f.onChange(e.target.valueAsNumber || 1)} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    <div className="col-span-5 md:col-span-3">
                                                        <FormField control={form.control} name={`items.${index}.costPrice`} render={({ field: f }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <Input type="number" step="0.01" min={0} disabled={loading || !canEdit}
                                                                            className="pr-10" {...f} onChange={e => f.onChange(e.target.valueAsNumber || 0)} />
                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">DA</span>
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-1 text-right">
                                                        <span className="text-sm font-bold text-primary">
                                                            {lineTotal.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 flex justify-end">
                                                        {canEdit && (
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => remove(index)} disabled={fields.length === 1}>
                                                                <Trash className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>

                                {/* Total */}
                                <div className="flex justify-end">
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-4 text-right">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total TTC</p>
                                        <p className="text-3xl font-bold">
                                            {total.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                                        </p>
                                    </div>
                                </div>

                                {/* Submit */}
                                {canEdit && ocrItems.length === 0 && (
                                    <Button id="global-save-button" disabled={loading} className="w-full md:w-auto min-w-40" type="submit">
                                        {loading ? "Enregistrement..." : isEditMode ? "✓ Enregistrer les modifications" : "✓ Créer le bon"}
                                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                                    </Button>
                                )}
                            </>
                        )}
                    </form>
                </Form>
            </div>
        </>
    )
}
