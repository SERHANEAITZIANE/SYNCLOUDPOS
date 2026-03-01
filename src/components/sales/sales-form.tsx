"use client"

import * as z from "zod"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { Trash, Plus, Printer, CheckCircle, FileText, TruckIcon, Package } from "lucide-react"
import { useRouter } from "@/i18n/routing"
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
import { createSalesOrder, updateSalesOrder, updateSalesOrderStatus } from "@/actions/sales-orders"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    customerId: z.string().min(1, "Client requis"),
    type: z.enum(["QUOTE", "ORDER", "INVOICE"]),
    status: z.enum(["DRAFT", "VALIDATED", "PAID", "CANCELLED"]),
    paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "CHECK", "TERM"]),
    receiptNumber: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1, "Produit requis"),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0)
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

    const isEditMode = !!initialData
    const canEdit = !isEditMode || initialData?.status === "DRAFT"
    const currentStatus = initialData?.status || "DRAFT"
    const currentType = initialData?.type || "QUOTE"

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
                unitPrice: Number(item.unitPrice)
            }))
        } : {
            customerId: "",
            type: "QUOTE",
            status: "DRAFT",
            paymentMethod: "CASH",
            receiptNumber: "",
            items: [{ productId: "", quantity: 1, unitPrice: 0 }]
        }
    })

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
    const watchItems = form.watch("items")
    const watchCustomerId = form.watch("customerId")
    const watchType = form.watch("type")
    const watchPaymentMethod = form.watch("paymentMethod")

    const selectedCustomer = customers.find(c => c.id === watchCustomerId)

    // Tax calculations
    const enrichedItems = watchItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        const tvaRate = product?.tvaRate ? Number(product.tvaRate) : 19;
        const priceHt = item.unitPrice / (1 + (tvaRate / 100));
        return {
            ...item,
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

    const stampTax = (watchPaymentMethod === "CASH" && (watchType === "INVOICE" || watchType === "QUOTE"))
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
                    priceHt: i.priceHt
                }))
            }

            if (!isEditMode) {
                await createSalesOrder(submissionData)
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
                append({ productId: "", quantity: 1, unitPrice: 0 })
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [append])

    const typeConf = TYPE_CONFIG[currentType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.QUOTE
    const statusConf = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT

    const blTemplate = storeData?.blTemplate || "standard";

    return (
        <>
            {/* Print layout */}
            <div className="hidden print:block print-page">
                {currentType === "INVOICE" ? (
                    <div className="bg-white text-gray-800 font-sans p-10 max-w-4xl mx-auto text-sm leading-relaxed">
                        {/* Premium Header */}
                        <div className="flex justify-between items-start mb-12 border-b-2 border-gray-100 pb-8">
                            <div className="flex gap-6 items-center">
                                {storeData?.logo ? (
                                    <img src={storeData.logo} alt="Logo" className="h-20 object-contain" />
                                ) : (
                                    <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold tracking-widest shadow-sm">
                                        {storeData?.name?.substring(0, 2).toUpperCase() || "LOGO"}
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{storeData?.name || "VOTRE SOCIÉTÉ"}</h1>
                                    <p className="text-gray-500 font-medium tracking-wide text-xs mt-1 uppercase">{storeData?.activity || "Activité de l'entreprise"}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="text-4xl font-extrabold text-gray-200 tracking-tighter uppercase mb-2">FACTURE</div>
                                <div className="bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full font-bold text-sm shadow-sm inline-block">
                                    N° {initialData?.receiptNumber || `FA-${initialData?.id?.slice(-6)}`}
                                </div>
                                <div className="mt-4 text-gray-500 font-medium">
                                    Date: <span className="text-gray-800">{format(new Date(), "dd/MM/yyyy")}</span>
                                </div>
                            </div>
                        </div>

                        {/* Store & Customer Details */}
                        <div className="flex justify-between mb-12 gap-8">
                            {/* Billed To */}
                            <div className="w-1/2 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Facturé à</h3>
                                <div className="font-bold text-lg text-gray-900 mb-1">{selectedCustomer?.name || "Client Standard"}</div>
                                <div className="text-gray-600 mb-4">{selectedCustomer?.address || "Adresse non spécifiée"}</div>

                                <div className="space-y-1.5 text-xs">
                                    {selectedCustomer?.taxId && (
                                        <div className="flex"><span className="w-16 text-gray-500 font-medium">NIF:</span> <span className="font-medium">{selectedCustomer.taxId}</span></div>
                                    )}
                                    <div className="flex"><span className="w-16 text-gray-500 font-medium">RC:</span> <span className="font-medium">-</span></div>
                                    <div className="flex"><span className="w-16 text-gray-500 font-medium">NIS:</span> <span className="font-medium">-</span></div>
                                    <div className="flex"><span className="w-16 text-gray-500 font-medium">ART:</span> <span className="font-medium">-</span></div>
                                </div>
                            </div>

                            {/* Store Info */}
                            <div className="w-1/2 p-6 flex flex-col justify-center">
                                <div className="space-y-1.5 text-xs text-right overflow-hidden">
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">Adresse:</span> <span className="font-medium text-gray-800">{storeData?.address || "Adresse de l'entreprise"}</span></div>
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">Tél:</span> <span className="font-medium text-gray-800">{storeData?.phone || "-"}</span></div>
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-800">{storeData?.email || "-"}</span></div>
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">NIF:</span> <span className="font-medium text-gray-800">{storeData?.nif || "-"}</span></div>
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">RC:</span> <span className="font-medium text-gray-800">{storeData?.rc || "-"}</span></div>
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">NIS:</span> <span className="font-medium text-gray-800">{storeData?.nis || "-"}</span></div>
                                    <div className="flex justify-end gap-2"><span className="text-gray-500">RIB:</span> <span className="font-medium text-gray-800">{storeData?.bankAccount || "-"}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Modern Table */}
                        <div className="mb-10 rounded-2xl overflow-hidden border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="py-4 px-6 font-medium">N°</th>
                                        <th className="py-4 px-6 font-medium">Désignation</th>
                                        <th className="py-4 px-6 font-medium text-center">Qté</th>
                                        <th className="py-4 px-6 font-medium text-right">P.U (DA)</th>
                                        <th className="py-4 px-6 font-medium text-right">Montant (DA)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {(initialData?.items || []).map((item: any, i: number) => {
                                        const lTotal = Number(item.unitPrice) * item.quantity;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-4 px-6 text-gray-400 font-medium">{String(i + 1).padStart(2, '0')}</td>
                                                <td className="py-4 px-6 font-semibold text-gray-800">{item.product?.name}</td>
                                                <td className="py-4 px-6 text-center text-gray-600">{item.quantity}</td>
                                                <td className="py-4 px-6 text-right text-gray-600">{Number(item.unitPrice).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}</td>
                                                <td className="py-4 px-6 text-right font-bold text-gray-900">{lTotal.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer & Totals */}
                        <div className="flex justify-between items-end mb-16">
                            <div className="w-1/2 pr-8">
                                <div className="bg-blue-50 text-blue-900 p-5 rounded-xl border border-blue-100">
                                    <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-70">Arrêtée à la somme de {finalTotalTTCStr} DA</p>
                                    <p className="italic font-medium leading-relaxed">{numberToFrenchWords(finalTotalTTC)}</p>
                                </div>
                                <div className="mt-4 text-xs text-gray-500">
                                    Paiement: <span className="font-semibold text-gray-700">{watchPaymentMethod}</span>
                                </div>
                            </div>

                            <div className="w-[320px]">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-gray-500 px-4">
                                        <span>Total HT</span>
                                        <span className="font-medium text-gray-800">{subtotalHTStr}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 px-4">
                                        <span>TVA</span>
                                        <span className="font-medium text-gray-800">{tvaAmountStr}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 px-4">
                                        <span>Timbre ({watchPaymentMethod})</span>
                                        <span className="font-medium text-gray-800">{stampTaxStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-xl mt-4 shadow-md">
                                        <span className="font-bold uppercase tracking-wider text-xs text-gray-300">Net à Payer</span>
                                        <span className="font-extrabold text-xl">{finalTotalTTCStr} <span className="text-sm font-medium text-gray-400">DA</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between pt-8 border-t border-gray-100 text-sm text-gray-500 pb-8 mt-auto">
                            <div className="text-center w-48">
                                <p className="font-medium mb-16">Signature Client</p>
                                <div className="border-b border-gray-300 w-full mb-2"></div>
                                <p className="text-xs text-gray-400">Précédé de la mention "Lu et approuvé"</p>
                            </div>
                            <div className="text-center w-48 relative">
                                <p className="font-medium mb-16 relative z-10">Cachet & Signature</p>
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-28 border-[1.5px] border-blue-200 rounded-full flex flex-col items-center justify-center text-blue-800/20 pointer-events-none -rotate-12 bg-transparent z-0">
                                    <span className="text-xs font-bold tracking-widest">{storeData?.name?.substring(0, 8) || "SOCIÉTÉ"}</span>
                                </div>
                                <div className="border-b border-gray-300 w-full"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* BL / QUOTE LAYOUTS */
                    <div className="p-8 text-sm bg-white text-black min-h-[500px]">
                        {blTemplate === "compact" && (
                            /* COMPACT BL PATTERN */
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between border-b pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold uppercase">{typeConf.label}</h2>
                                        <p>Réf: {initialData?.receiptNumber}</p>
                                        <p>Client: {selectedCustomer?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{storeData?.name || "SYNCLOUD POS"}</p>
                                        <p>{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                                    </div>
                                </div>
                                <table className="w-full border-collapse text-sm mt-4">
                                    <thead>
                                        <tr className="border-y border-black">
                                            <th className="py-2 text-left">Désignation</th>
                                            <th className="py-2 text-center w-16">Qté</th>
                                            <th className="py-2 text-right">P.U</th>
                                            <th className="py-2 text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(initialData?.items || []).map((item: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2">{item.product?.name}</td>
                                                <td className="py-2 text-center">{item.quantity}</td>
                                                <td className="py-2 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                                                <td className="py-2 text-right font-semibold">{(Number(item.unitPrice) * item.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {currentType === "ORDER" && selectedCustomer && (
                                    <div className="self-end w-64 mt-4 border border-black p-3 space-y-1 bg-gray-50 text-xs">
                                        <div className="flex justify-between"><span>Ancien Solde:</span> <span>{previousBalanceStr}</span></div>
                                        <div className="flex justify-between font-bold"><span>Total TTC:</span> <span>{finalTotalTTCStr}</span></div>
                                        <div className="flex justify-between text-gray-500"><span>(Timbre:</span> <span>{stampTaxStr})</span></div>
                                        <div className="flex justify-between text-gray-500"><span>(TVA:</span> <span>{tvaAmountStr})</span></div>
                                        <div className="flex justify-between"><span>Paiement:</span> <span>{paymentAmountStr}</span></div>
                                        <div className="flex justify-between border-t border-black pt-1 mt-1 font-bold"><span>Nouveau Solde:</span> <span>{newBalanceStr}</span></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {blTemplate === "aitee" && (
                            /* AITEE STYLE BL */
                            <div className="flex flex-col gap-4 font-sans text-xs">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-[45%]">
                                        <div className="bg-[#222428] text-white p-3 flex flex-col justify-center items-center rounded-sm mb-2">
                                            <div className="text-3xl tracking-widest text-[#4185D0] font-light mb-1 border-b border-gray-600 pb-1">{storeData?.name || "AITEE"}</div>
                                            <div className="text-[8px] tracking-[0.2em] text-gray-400 uppercase mt-1">{storeData?.activity || "Premium Solutions"}</div>
                                        </div>
                                    </div>
                                    <div className="text-center w-[40%] pt-2 px-6">
                                        <h1 className="border border-black rounded-xl px-4 py-2 tracking-wider text-lg font-bold uppercase shadow-sm whitespace-nowrap">
                                            {typeConf.label}
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex justify-between mb-8">
                                    <div className="w-[48%] border border-black p-2 rounded-md">
                                        <div className="font-bold underline mb-1">Détails Client :</div>
                                        <div>{selectedCustomer?.name}</div>
                                        <div>{selectedCustomer?.address}</div>
                                        <div>Tél: {selectedCustomer?.phone}</div>
                                    </div>
                                    <div className="w-[48%] flex flex-col items-end text-sm">
                                        <span className="font-bold mb-1">Réf: {initialData?.receiptNumber}</span>
                                        <span>Date: {format(new Date(), "dd/MM/yyyy")}</span>
                                    </div>
                                </div>
                                <table className="w-full border-collapse border border-black text-[12px]">
                                    <thead>
                                        <tr className="bg-[#e6f2e1] text-green-900 border-b border-black">
                                            <th className="border-r border-black p-1.5 text-center">Désignation</th>
                                            <th className="border-r border-black p-1.5 w-20 text-center">Qté</th>
                                            <th className="border-r border-black p-1.5 w-28 text-center">P.U</th>
                                            <th className="p-1.5 w-32 text-center">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(initialData?.items || []).map((item: any, i: number) => (
                                            <tr key={i} className="border-b border-gray-300">
                                                <td className="border-r border-black p-1.5">{item.product?.name}</td>
                                                <td className="border-r border-black p-1.5 text-center">{item.quantity}</td>
                                                <td className="border-r border-black p-1.5 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                                                <td className="p-1.5 text-right font-semibold">{(Number(item.unitPrice) * item.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {currentType === "ORDER" && selectedCustomer && (
                                    <div className="flex justify-end mt-4">
                                        <div className="w-[300px] border border-black text-[12px]">
                                            <div className="flex p-1.5 border-b border-gray-300"><span className="w-1/2 font-bold">Ancien Solde:</span><span className="w-1/2 text-right">{previousBalanceStr}</span></div>
                                            <div className="flex p-1.5 border-b border-gray-300"><span className="w-1/2 font-bold">Total TTC:</span><span className="w-1/2 text-right">{finalTotalTTCStr}</span></div>
                                            <div className="flex p-1.5 border-b border-gray-300 text-gray-500"><span className="w-1/2">Timbre:</span><span className="w-1/2 text-right">{stampTaxStr}</span></div>
                                            <div className="flex p-1.5 border-b border-gray-300 text-gray-500"><span className="w-1/2">TVA:</span><span className="w-1/2 text-right">{tvaAmountStr}</span></div>
                                            <div className="flex p-1.5 border-b border-gray-300"><span className="w-1/2 font-bold">Paiement:</span><span className="w-1/2 text-right">{paymentAmountStr}</span></div>
                                            <div className="flex p-1.5 bg-gray-100 font-bold"><span className="w-1/2">Nouveau Solde:</span><span className="w-1/2 text-right">{newBalanceStr}</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {blTemplate === "standard" && (
                            /* STANDARD BL PATTERN (ORIGINAL) */
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h1 className="text-2xl font-bold">{typeConf.label}</h1>
                                        <p className="text-gray-500">Réf: {initialData?.receiptNumber}</p>
                                        <p className="text-gray-500">Date: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2 mb-2">
                                            {storeData?.logo && <img src={storeData.logo} alt="Logo" className="h-8 object-contain" />}
                                            <p className="font-bold text-lg">{storeData?.name || "SYNCLOUD POS"}</p>
                                        </div>
                                        <p className="text-sm text-gray-600">Client: {selectedCustomer?.name}</p>
                                    </div>
                                </div>
                                <table className="w-full border-collapse border border-gray-300 mb-6">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border border-gray-300 p-2 text-left">Désignation</th>
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
                                                <td className="border border-gray-300 p-2 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                                                <td className="border border-gray-300 p-2 text-right font-semibold">{(Number(item.unitPrice) * item.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        {currentType === "ORDER" && selectedCustomer ? (
                                            <>
                                                <tr className="font-semibold bg-white border-t-2 border-gray-400">
                                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">ANCIEN SOLDE</td>
                                                    <td className="border border-gray-300 p-2 text-right">{previousBalanceStr} DA</td>
                                                </tr>
                                                <tr className="font-semibold bg-white">
                                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">MONTANT TOTAL TTC</td>
                                                    <td className="border border-gray-300 p-2 text-right">{finalTotalTTCStr} DA</td>
                                                </tr>
                                                <tr className="text-gray-500 bg-white">
                                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">DONT TIMBRE</td>
                                                    <td className="border border-gray-300 p-2 text-right">{stampTaxStr} DA</td>
                                                </tr>
                                                <tr className="text-gray-500 bg-white">
                                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">DONT TVA</td>
                                                    <td className="border border-gray-300 p-2 text-right">{tvaAmountStr} DA</td>
                                                </tr>
                                                <tr className="font-semibold bg-white">
                                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">PAIEMENT</td>
                                                    <td className="border border-gray-300 p-2 text-right">{paymentAmountStr} DA</td>
                                                </tr>
                                                <tr className="font-bold bg-gray-100">
                                                    <td colSpan={3} className="border border-gray-300 p-2 text-right">NOUVEAU SOLDE</td>
                                                    <td className="border border-gray-300 p-2 text-right py-3">{newBalanceStr} DA</td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr className="font-bold bg-gray-100">
                                                <td colSpan={3} className="border border-gray-300 p-2 text-right">TOTAL TTC</td>
                                                <td className="border border-gray-300 p-2 text-right py-3">{finalTotalTTCStr} DA</td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-between mt-12 px-8">
                            <div className="text-center">
                                <p className="font-semibold mb-12">Signature Client</p>
                                <div className="border-t border-gray-400 w-40"></div>
                            </div>
                            <div className="text-center">
                                <p className="font-semibold mb-12">Cachet & Signature</p>
                                <div className="border-t border-gray-400 w-40"></div>
                            </div>
                        </div>
                    </div>
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
                                    <Select disabled={loading || !canEdit} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}{Number(c.balance ?? 0) > 0 ? ` — Solde: ${Number(c.balance).toLocaleString()} DA` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

                        {/* Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Articles
                                    <Badge variant="outline">{fields.length}</Badge>
                                </h3>
                                {canEdit && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}>
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
                                                                priceField="price"
                                                                onPriceSelect={price => form.setValue(`items.${index}.unitPrice`, price)}
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
        </>
    )
}
