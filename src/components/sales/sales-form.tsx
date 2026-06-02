"use client"

import * as z from "zod"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { Trash, Plus, Printer, CheckCircle, FileText, TruckIcon, Package, Send } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { InvoicePrintTemplate, BonLivraisonPrintTemplate, ProformaPrintTemplate, BonGarantiePrintTemplate } from "@/components/print/print-templates"
import { useReactToPrint } from "react-to-print"
import { useRef } from "react"
import { toast } from "react-hot-toast"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductSearchCombobox } from "@/components/ui/product-search-combobox"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { createSalesOrder, updateSalesOrder, updateSalesOrderStatus, searchRecentSalesOrders } from "@/actions/sales-orders"
import { cn } from "@/lib/utils"
import { SendDocumentDialog } from "./send-document-dialog"

const formSchema = z.object({
    customerId: z.string().min(1, "Client requis"),
    type: z.enum(["QUOTE", "ORDER", "INVOICE", "CREDIT_NOTE"]),
    status: z.enum(["DRAFT", "VALIDATED", "PAID", "CANCELLED"]),
    paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "CHECK", "TERM"]),
    receiptNumber: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1, "Produit requis"),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        serialNumber: z.string().optional()
    })).min(1, "Ajoutez au moins un article")
})

type SalesOrderFormValues = z.infer<typeof formSchema>

interface SalesOrderFormProps {
    initialData: any | null
    customers: any[]
    products: any[]
    storeData?: any
}

const TYPE_CONFIG = {
    QUOTE: { label: "Devis", color: "bg-gray-100 text-gray-700" },
    ORDER: { label: "Bon de Livraison", color: "bg-amber-100 text-amber-700" },
    INVOICE: { label: "Facture", color: "bg-purple-100 text-purple-700" },
    CREDIT_NOTE: { label: "Avoir", color: "bg-red-100 text-red-700" },
}
const STATUS_CONFIG = {
    DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
    VALIDATED: { label: "Validé", color: "bg-blue-100 text-blue-700" },
    PAID: { label: "Payé ✓", color: "bg-emerald-100 text-emerald-700" },
    CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700" },
}

const numberToFrenchWords = (num: number): string => {
    if (num === 0) return "zéro"
    const ones = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"]
    function convertGroup(n: number): string {
        let str = ""
        const c = Math.floor(n / 100)
        const r = n % 100
        if (c > 0) {
            if (c === 1) str += "cent "
            else str += ones[c] + " cent" + (r === 0 ? "s " : " ")
        }
        if (r > 0) {
            if (r < 20) str += ones[r] + " "
            else {
                const d = Math.floor(r / 10)
                const u = r % 10
                if (d === 7 || d === 9) {
                    str += tens[d - 1] + (u === 1 && d === 7 ? " et " : "-") + ones[10 + u] + " "
                } else {
                    str += tens[d] + (u === 1 ? " et un" : (u > 0 ? "-" + ones[u] : (d === 8 ? "s" : ""))) + " "
                }
            }
        }
        return str.trim()
    }
    let result = ""
    const intPart = Math.floor(num)
    let n = intPart
    if (n >= 1000000) {
        const m = Math.floor(n / 1000000)
        result += (m === 1 ? "un million " : convertGroup(m) + " millions ")
        n %= 1000000
    }
    if (n >= 1000) {
        const k = Math.floor(n / 1000)
        result += (k === 1 ? "mille " : convertGroup(k) + " mille ")
        n %= 1000
    }
    if (n > 0 || result === "") {
        result += convertGroup(n)
    }
    return result.trim() + " DA"
}

export const SalesOrderForm: React.FC<SalesOrderFormProps> = ({ initialData, customers, products, storeData }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [sendDialogOpen, setSendDialogOpen] = useState(false)
    const warrantyRef = useRef<HTMLDivElement>(null)
    const handlePrintWarranty = useReactToPrint({
        contentRef: warrantyRef,
    })
    const [relatedSalesOrderId, setRelatedSalesOrderId] = useState<string | null>(initialData?.relatedSalesOrderId || null)
    const [invoiceSearch, setInvoiceSearch] = useState("")
    const [invoiceResults, setInvoiceResults] = useState<any[]>([])
    const [searchingInvoices, setSearchingInvoices] = useState(false)

    const isEditMode = !!initialData
    const canEdit = !isEditMode || initialData?.status === "DRAFT"
    const currentStatus = initialData?.status || "DRAFT"
    const currentType = initialData?.type || "QUOTE"
    const isElectronics = storeData?.isElectronics || storeData?.name?.toLowerCase().includes("electr") || false;

    const form = useForm<SalesOrderFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            customerId: initialData.customerId,
            type: initialData.type,
            status: initialData.status,
            paymentMethod: initialData.paymentMethod || "CASH",
            receiptNumber: initialData.receiptNumber || "",
            items: initialData.items.map((item: any) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                serialNumber: item.serialNumber || ""
            }))
        } : {
            customerId: "",
            type: "QUOTE",
            status: "DRAFT",
            paymentMethod: "CASH",
            receiptNumber: "",
            items: [{ productId: "", quantity: 1, unitPrice: 0, serialNumber: "" }]
        }
    })

    const { fields, prepend, remove } = useFieldArray({ control: form.control, name: "items" })
    const watchItems = form.watch("items")
    const watchCustomerId = form.watch("customerId")
    const watchType = form.watch("type")
    const watchPaymentMethod = form.watch("paymentMethod")

    const selectedCustomer = customers.find(c => c.id === watchCustomerId)

    const tvaEnabled = storeData?.tvaEnabled ?? false;

    // Tax calculations
    const enrichedItems = watchItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        const tvaRate = tvaEnabled ? (product?.tvaRate ? Number(product.tvaRate) : 0) : 0;
        const priceHt = item.unitPrice / (1 + (tvaRate / 100));
        return {
            ...item,
            product,
            tvaRate,
            priceHt,
            lineTotalTTC: item.quantity * item.unitPrice,
            lineTotalHT: item.quantity * priceHt,
        };
    });

    const subtotalHT = enrichedItems.reduce((acc, item) => acc + item.lineTotalHT, 0);
    const totalTVA = (watchType === "INVOICE" || watchType === "QUOTE")
        ? enrichedItems.reduce((acc, item) => acc + (item.lineTotalTTC - item.lineTotalHT), 0)
        : 0;

    const totalItemsTTC = enrichedItems.reduce((acc, item) => acc + item.lineTotalTTC, 0);

    const getStampTaxAmount = (amount: number) => {
        if (amount <= 300) return 0;
        if (amount <= 30000) return Math.max(5, Math.ceil(amount / 100) * 1);
        if (amount <= 100000) return Math.max(5, Math.ceil(amount / 100) * 1.5);
        return Math.min(10000, Math.ceil(amount / 100) * 2);
    }

    const stampTaxEnabled = storeData?.stampTaxEnabled ?? true;
    const stampTax = (stampTaxEnabled && watchPaymentMethod === "CASH" && (watchType === "INVOICE" || watchType === "QUOTE"))
        ? getStampTaxAmount(totalItemsTTC)
        : 0;

    const finalTotalTTC = (watchType === "INVOICE" || watchType === "QUOTE")
        ? totalItemsTTC + stampTax
        : subtotalHT; // If it's not an Invoice or Quote (i.e. Bon de Livraison), total is without taxes.

    let previousBalance = 0;
    let newBalance = Number(selectedCustomer?.balance || 0);
    let paymentAmount = 0;

    if (currentStatus === "PAID") {
        paymentAmount = finalTotalTTC;
        previousBalance = newBalance;
    } else if (currentStatus === "VALIDATED") {
        paymentAmount = 0;
        previousBalance = newBalance - finalTotalTTC;
    } else {
        paymentAmount = 0;
        previousBalance = newBalance;
        newBalance = previousBalance + finalTotalTTC;
    }

    const paymentAmountStr = paymentAmount.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });
    const newBalanceStr = newBalance.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });
    const subtotalHTStr = subtotalHT.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });
    const tvaAmountStr = totalTVA.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });
    const stampTaxStr = stampTax.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });
    const finalTotalTTCStr = finalTotalTTC.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });
    const previousBalanceStr = previousBalance.toLocaleString("fr-DZ", { minimumFractionDigits: 2 });


    const onSubmit = async (values: SalesOrderFormValues) => {
        try {
            setLoading(true)
            const submissionData = {
                ...values,
                subtotal: subtotalHT,
                tvaAmount: totalTVA,
                stampTax: stampTax,
                total: finalTotalTTC,
                items: enrichedItems.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    tvaRate: i.tvaRate,
                    priceHt: i.priceHt,
                    serialNumber: i.serialNumber
                }))
            }

            if (!isEditMode) {
                await createSalesOrder({
                    ...submissionData,
                    relatedSalesOrderId: relatedSalesOrderId || undefined,
                })
                toast.success("Bon créé avec succès.")
                router.push("/sales")
                router.refresh()
            } else {
                const result = await updateSalesOrder(initialData.id, submissionData)
                if (result?.error) { toast.error(result.error); return }
                toast.success("Bon modifié.")
                router.refresh()
            }
        } catch (error: any) {
            toast.error(error?.message || "Une erreur est survenue.")
        } finally { setLoading(false) }
    }

    const handleStatusChange = async (newStatus: string) => {
        if (!initialData) return
        try {
            setLoading(true)
            await updateSalesOrderStatus(initialData.id, newStatus)
            toast.success("Statut mis à jour.")
            router.refresh()
            window.location.reload()
        } catch { toast.error("Erreur lors de la mise à jour.") }
        finally { setLoading(false) }
    }

    // Insert key = new row
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Insert") {
                e.preventDefault()
                prepend({ productId: "", quantity: 1, unitPrice: 0 })
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [prepend])

    const typeConf = TYPE_CONFIG[currentType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.QUOTE
    const statusConf = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT

    const blTemplate = storeData?.blTemplate || "standard";

    return (
        <>
            {/* Print layout — Premium Templates */}
            <div className="hidden print:block print-page">
                {currentType === "INVOICE" ? (
                    <InvoicePrintTemplate
                        items={enrichedItems.map((item: any) => ({
                            product: item.product,
                            quantity: item.quantity,
                            unitPrice: Number(item.unitPrice),
                            tvaRate: Number(item.tvaRate ?? 0),
                            priceHt: Number(item.priceHt || 0),
                            serialNumber: item.serialNumber,
                        }))}
                        customer={selectedCustomer}
                        store={storeData}
                        receiptNumber={initialData?.receiptNumber}
                        documentId={initialData?.id}
                        subtotalHT={subtotalHT}
                        totalTVA={totalTVA}
                        stampTax={stampTax}
                        totalTTC={finalTotalTTC}
                        paymentMethod={watchPaymentMethod}
                    />
                ) : currentType === "QUOTE" ? (
                    <ProformaPrintTemplate
                        items={enrichedItems.map((item: any) => ({
                            product: item.product,
                            quantity: item.quantity,
                            unitPrice: Number(item.unitPrice),
                            tvaRate: Number(item.tvaRate ?? 0),
                            priceHt: Number(item.priceHt || 0),
                            serialNumber: item.serialNumber,
                        }))}
                        customer={selectedCustomer}
                        store={storeData}
                        receiptNumber={initialData?.receiptNumber}
                        documentId={initialData?.id}
                        subtotalHT={subtotalHT}
                        totalTVA={totalTVA}
                        stampTax={stampTax}
                        totalTTC={finalTotalTTC}
                        paymentMethod={watchPaymentMethod}
                    />
                ) : (
                    <BonLivraisonPrintTemplate
                        items={enrichedItems.map((item: any) => ({
                            product: item.product,
                            quantity: item.quantity,
                            unitPrice: Number(item.unitPrice),
                            tvaRate: Number(item.tvaRate ?? 0),
                            priceHt: Number(item.priceHt || 0),
                            serialNumber: item.serialNumber,
                        }))}
                        customer={selectedCustomer}
                        store={storeData}
                        receiptNumber={initialData?.receiptNumber}
                        documentId={initialData?.id}
                        subtotalHT={subtotalHT}
                        totalTVA={totalTVA}
                        stampTax={stampTax}
                        totalTTC={finalTotalTTC}
                        previousBalance={previousBalance}
                        paymentAmount={paymentAmount}
                        newBalance={newBalance}
                    />
                )}
            </div>

            {/* Screen UI */}
            <div className="print:hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heading
                            title={isEditMode ? (initialData?.receiptNumber || `Bon #${initialData?.id?.slice(-6)}`) : "Nouveau bon"}
                            description={isEditMode ? `Client: ${initialData?.customer?.name}` : "Créer un nouveau bon"}
                        />
                        {isEditMode && (
                            <div className="flex items-center gap-1.5">
                                <Badge className={cn("text-xs", typeConf.color)}>{typeConf.label}</Badge>
                                <Badge className={cn("text-xs", statusConf.color)}>{statusConf.label}</Badge>
                            </div>
                        )}
                    </div>
                    {isEditMode && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer className="h-4 w-4 mr-1.5" /> Imprimer
                            </Button>
                            {storeData?.warrantyEnabled && (
                                <Button variant="outline" size="sm" onClick={() => handlePrintWarranty && handlePrintWarranty()}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <FileText className="h-4 w-4 mr-1.5 text-blue-500" /> Garantie
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setSendDialogOpen(true)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                <Send className="h-4 w-4 mr-1.5" /> Envoyer
                            </Button>
                            {currentStatus === "DRAFT" && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}
                                    onClick={() => handleStatusChange("VALIDATED")}>
                                    <CheckCircle className="h-4 w-4 mr-1.5" /> Valider ({currentType === "QUOTE" ? "crée dette" : "déduit stock + crée dette"})
                                </Button>
                            )}
                            {currentStatus === "VALIDATED" && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}
                                    onClick={() => handleStatusChange("PAID")}>
                                    <CheckCircle className="h-4 w-4 mr-1.5" /> Marquer Payé (solde client ↓)
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <Separator className="my-4" />

                {/* Customer + total info bar */}
                {selectedCustomer && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 bg-muted/20 rounded-lg border">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Client</p>
                            <p className="font-bold text-base">{selectedCustomer.name}</p>
                            {selectedCustomer.phone && <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Solde dû</p>
                            <p className={cn("text-2xl font-bold", Number(selectedCustomer.balance ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                                {Number(selectedCustomer.balance ?? 0).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Total ce bon</p>
                            <p className="text-3xl font-bold">{finalTotalTTC.toLocaleString()} DA</p>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <FormField control={form.control} name="receiptNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>N° Référence</FormLabel>
                                    <FormControl>
                                        <Input disabled placeholder={initialData ? "" : "Auto-généré"} {...field} value={field.value || ""} />
                                    </FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="customerId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client</FormLabel>
                                    <SearchableSelect
                                        options={customers.map(c => ({
                                            value: c.id,
                                            label: `${c.name}${Number(c.balance ?? 0) > 0 ? ` — Solde: ${Number(c.balance).toLocaleString()} DA` : ""}`
                                        }))}
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={loading || !canEdit}
                                        placeholder="Sélectionner un client..."
                                        searchPlaceholder="Rechercher un client..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type de document</FormLabel>
                                    <Select disabled={loading || isEditMode} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="QUOTE">Devis</SelectItem>
                                            <SelectItem value="ORDER">Bon de Livraison (-Stock)</SelectItem>
                                            <SelectItem value="INVOICE">Facture</SelectItem>
                                            <SelectItem value="CREDIT_NOTE">Avoir (Annulation partielle)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Statut</FormLabel>
                                    <Select disabled={loading || isEditMode} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                                            <SelectItem value="VALIDATED">Validé</SelectItem>
                                            <SelectItem value="PAID">Payé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Règlement</FormLabel>
                                    <Select disabled={loading || !canEdit} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="CASH">Espèce</SelectItem>
                                            <SelectItem value="CARD">Carte Bancaire</SelectItem>
                                            <SelectItem value="TRANSFER">Virement</SelectItem>
                                            <SelectItem value="CHECK">Chèque</SelectItem>
                                            <SelectItem value="TERM">À Terme</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <Separator />

                        {/* Credit Note — Invoice Lookup */}
                        {watchType === "CREDIT_NOTE" && !isEditMode && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-red-600" />
                                    <h3 className="font-bold text-sm text-red-900 dark:text-red-100">Avoir — Référence Facture Originale</h3>
                                </div>
                                <p className="text-xs text-red-700 dark:text-red-300">
                                    Recherchez la facture originale pour créer un avoir. Les articles seront pré-remplis automatiquement.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Rechercher par N° facture ou nom client..."
                                        value={invoiceSearch}
                                        onChange={e => setInvoiceSearch(e.target.value)}
                                        className="flex-1"
                                        onKeyDown={async (e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                if (!invoiceSearch.trim()) return
                                                setSearchingInvoices(true)
                                                const results = await searchRecentSalesOrders(invoiceSearch, "INVOICE")
                                                setInvoiceResults(results || [])
                                                setSearchingInvoices(false)
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={searchingInvoices || !invoiceSearch.trim()}
                                        onClick={async () => {
                                            setSearchingInvoices(true)
                                            const results = await searchRecentSalesOrders(invoiceSearch, "INVOICE")
                                            setInvoiceResults(results || [])
                                            setSearchingInvoices(false)
                                        }}
                                    >
                                        {searchingInvoices ? "Recherche..." : "Chercher"}
                                    </Button>
                                </div>
                                {relatedSalesOrderId && (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 rounded-lg">
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        <span className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                                            Facture liée : {invoiceResults.find(r => r.id === relatedSalesOrderId)?.receiptNumber || relatedSalesOrderId.slice(-8)}
                                        </span>
                                    </div>
                                )}
                                {invoiceResults.length > 0 && (
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {invoiceResults.map((inv: any) => (
                                            <button
                                                key={inv.id}
                                                type="button"
                                                className={cn(
                                                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center",
                                                    relatedSalesOrderId === inv.id
                                                        ? "bg-red-200 dark:bg-red-800 font-bold"
                                                        : "bg-white dark:bg-gray-900 hover:bg-red-100 dark:hover:bg-red-900/40 border"
                                                )}
                                                onClick={() => {
                                                    setRelatedSalesOrderId(inv.id)
                                                    // Auto-fill customer
                                                    if (inv.customerId) form.setValue("customerId", inv.customerId)
                                                    // Auto-fill items from original invoice
                                                    const items = inv.items?.map((item: any) => ({
                                                        productId: item.productId,
                                                        quantity: Number(item.quantity),
                                                        unitPrice: Number(item.unitPrice),
                                                    })) || []
                                                    if (items.length > 0) form.setValue("items", items)
                                                    toast.success(`Facture ${inv.receiptNumber} sélectionnée — ajustez les quantités si nécessaire`)
                                                }}
                                            >
                                                <div>
                                                    <span className="font-semibold">{inv.receiptNumber}</span>
                                                    <span className="text-muted-foreground ml-2">— {inv.customer?.name}</span>
                                                </div>
                                                <span className="font-bold">{Number(inv.total).toLocaleString()} DA</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                                    <Button type="button" variant="outline" size="sm" onClick={() => prepend({ productId: "", quantity: 1, unitPrice: 0 })}>
                                        <Plus className="h-4 w-4 mr-1.5" /> Ajouter (Insert)
                                    </Button>
                                )}
                            </div>

                            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                <div className="col-span-5">Produit</div>
                                <div className="col-span-2 text-center">Qté</div>
                                <div className="col-span-3">Prix unitaire (DA)</div>
                                <div className="col-span-1 text-right">Total</div>
                                <div className="col-span-1"></div>
                            </div>

                            {fields.map((field, index) => {
                                const lineTotal = (watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0)
                                return (
                                    <Card key={field.id} className="overflow-hidden">
                                        <CardContent className="p-3 grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
                                                <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                                    <FormItem className="m-0 space-y-0">
                                                        <FormControl>
                                                            <ProductSearchCombobox
                                                                products={products}
                                                                value={f.value}
                                                                onChange={f.onChange}
                                                                disabled={loading || !canEdit}
                                                                placeholder="Rechercher produit..."
                                                                priceField="price"
                                                                onPriceSelect={price => form.setValue(`items.${index}.unitPrice`, price)}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                {isElectronics && (
                                                    <FormField control={form.control} name={`items.${index}.serialNumber`} render={({ field: f }) => (
                                                        <FormItem className="m-0 space-y-0">
                                                            <FormControl>
                                                                <div className="relative flex items-center">
                                                                    <span className="absolute left-2.5 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">S/N</span>
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="N° de Série (Optionnel)..."
                                                                        className="pl-8 text-xs font-mono h-7 border-slate-150 focus-visible:ring-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg"
                                                                        disabled={loading || !canEdit}
                                                                        {...f}
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                )}
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
                                                <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => (
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
                                                <span className="text-sm font-bold text-primary">{lineTotal.toLocaleString()}</span>
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                {canEdit && (
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
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
                        <div className="flex justify-end mt-4">
                            <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-4 flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-12 min-w-full md:min-w-fit">
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total HT</span>
                                    <span className="font-medium text-lg">{subtotalHTStr}</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground uppercase font-semibold">TVA</span>
                                    <span className="font-medium text-lg">{tvaAmountStr}</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground uppercase font-semibold">Timbre ({watchPaymentMethod})</span>
                                    <span className="font-medium text-lg">{stampTaxStr}</span>
                                </div>
                                <div className="text-right flex flex-col items-end pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-primary/20 md:pl-8">
                                    <p className="text-xs text-primary uppercase font-bold tracking-widest mb-1">Total à Payer</p>
                                    <p className="text-3xl font-extrabold tracking-tight text-primary">{finalTotalTTCStr} <span className="text-sm font-medium opacity-50">DA</span></p>
                                </div>
                            </div>
                        </div>

                        {canEdit && (
                            <Button id="global-save-button" disabled={loading} className="w-full md:w-auto min-w-40" type="submit">
                                {loading ? "Enregistrement..." : isEditMode ? "✓ Enregistrer les modifications" : "✓ Créer le bon"}
                                <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                            </Button>
                        )}
                    </form>
                </Form>
            </div>

            {/* Send Document Dialog */}
            {isEditMode && initialData && (
                <SendDocumentDialog
                    open={sendDialogOpen}
                    onClose={() => setSendDialogOpen(false)}
                    salesOrderId={initialData.id}
                    receiptNumber={initialData.receiptNumber}
                    documentType={currentType}
                    customerName={selectedCustomer?.name || initialData.customer?.name || "Client"}
                    customerPhone={selectedCustomer?.phone || initialData.customer?.phone}
                    customerEmail={selectedCustomer?.email || initialData.customer?.email}
                    total={finalTotalTTC}
                />
            )}
            {/* Hidden Warranty Print markup */}
            <div className="hidden">
                <div ref={warrantyRef}>
                    <BonGarantiePrintTemplate
                        items={enrichedItems.map((item: any) => ({
                            product: item.product,
                            quantity: item.quantity,
                            unitPrice: Number(item.unitPrice),
                            tvaRate: Number(item.tvaRate ?? 0),
                            priceHt: Number(item.priceHt || 0),
                            serialNumber: item.serialNumber,
                        }))}
                        customer={selectedCustomer}
                        store={storeData}
                        receiptNumber={initialData?.receiptNumber}
                        documentId={initialData?.id}
                        date={new Date()}
                        subtotalHT={subtotalHT}
                        totalTVA={totalTVA}
                        stampTax={stampTax}
                        totalTTC={finalTotalTTC}
                    />
                </div>
            </div>
        </>
    )
}
