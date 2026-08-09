"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"
import { Plus, Filter, Truck, Wallet, Calendar as CalendarIcon, RefreshCw } from "lucide-react"

import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SupplierPaymentColumn, useSupplierPaymentColumns } from "./supplier-columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { registerSupplierPayment } from "@/actions/suppliers"
import { ImageUpload } from "@/components/ui/image-upload"
import { getUnpaidPurchaseOrders } from "@/actions/purchase-orders"

const getLocalDateTimeString = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

interface SupplierPaymentsClientProps {
    data: SupplierPaymentColumn[]
    suppliers: { id: string; name: string; balance?: number }[]
    accounts: { id: string; name: string; type: string; balance?: number }[]
}

export const SupplierPaymentsClient: React.FC<SupplierPaymentsClientProps> = ({ data, suppliers, accounts }) => {
    const t = useTranslations("Payments")
    const columns = useSupplierPaymentColumns(accounts)
    const router = useRouter()

    // Filter states
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedSupplier, setSelectedSupplier] = React.useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")
    const [paymentId, setPaymentId] = React.useState<string | null>(null)

    // Create dialog state
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createLoading, setCreateLoading] = React.useState(false)
    const [newPayment, setNewPayment] = React.useState({
        supplierId: "",
        amount: "",
        accountId: "",
        notes: "",
        date: getLocalDateTimeString(),
        imageUrl: "",
    })

    const selectedSupplierObj = suppliers.find(s => s.id === (newPayment?.supplierId || ""))
    const selectedAccountObj = accounts.find(a => a.id === (newPayment?.accountId || ""))
    const [purchaseOrders, setPurchaseOrders] = React.useState<any[]>([])
    const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = React.useState<string>("")

    React.useEffect(() => {
        if (!newPayment.supplierId) {
            setPurchaseOrders([])
            setSelectedPurchaseOrderId("")
            return
        }

        const fetchOrders = async () => {
            try {
                const res = await getUnpaidPurchaseOrders(newPayment.supplierId)
                if ('purchaseOrders' in res) {
                    setPurchaseOrders(res.purchaseOrders)
                }
            } catch (err) {
                console.error("Error fetching unpaid purchase orders", err)
            }
        }
        fetchOrders()
    }, [newPayment.supplierId])

    // Apply filters
    React.useEffect(() => {
        let result = data

        if (paymentId) {
            result = result.filter(item => item.id === paymentId)
        } else {
            if (selectedSupplier !== "ALL") {
                result = result.filter(item => item.supplierId === selectedSupplier)
            }

            if (selectedAccount !== "ALL") {
                result = result.filter(item => item.accountName === selectedAccount)
            }

            if (dateRange?.from) {
                result = result.filter(item => {
                    const itemDate = new Date(item.date)
                    itemDate.setHours(0, 0, 0, 0)
                    const fromDate = new Date(dateRange.from!)
                    fromDate.setHours(0, 0, 0, 0)

                    if (dateRange.to) {
                        const toDate = new Date(dateRange.to)
                        toDate.setHours(23, 59, 59, 999)
                        return itemDate >= fromDate && itemDate <= toDate
                    }
                    return itemDate.getTime() === fromDate.getTime()
                })
            }
        }

        setFilteredData(result)
    }, [data, dateRange, selectedSupplier, selectedAccount, paymentId])

    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + ' DA'

    const uniqueAccounts = React.useMemo(() => {
        const names = new Set(data.map(d => d.accountName))
        return Array.from(names).filter(Boolean)
    }, [data])

    const handleCreate = async () => {
        try {
            setCreateLoading(true)
            const amount = parseFloat(newPayment.amount)
            if (isNaN(amount) || amount <= 0) {
                toast.error(t("invalidAmount"))
                return
            }
            if (!newPayment.supplierId) {
                toast.error(t("selectSupplier"))
                return
            }
            if (!newPayment.accountId) {
                toast.error(t("selectAccount"))
                return
            }

            const result = await registerSupplierPayment({
                supplierId: newPayment.supplierId,
                amount,
                accountId: newPayment.accountId,
                notes: newPayment.notes,
                date: newPayment.date,
                imageUrl: newPayment.imageUrl || undefined,
                purchaseOrderId: selectedPurchaseOrderId || undefined,
            })

            if ('error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success(t("paymentSaved"))
                setCreateOpen(false)
                setNewPayment({ supplierId: "", amount: "", accountId: "", notes: "", date: getLocalDateTimeString(), imageUrl: "" })
                setSelectedPurchaseOrderId("")
                router.refresh()
            }
        } catch {
            toast.error(t("saveError"))
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("supplierTitle")} (${filteredData.length})`}
                    description={t("supplierDescription")}
                />
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 text-red-700 dark:bg-red-955/30 font-bold px-4 py-2 rounded-md border border-red-200 shadow-sm">
                        {t("total")} {formattedTotal}
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("newSupplierPayment")}
                    </Button>
                </div>
            </div>
            <Separator />

            {paymentId && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between mt-4 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-300">
                    <span className="text-sm font-medium">{t("singleOpWarning")}</span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:bg-blue-100/50 dark:hover:bg-blue-900/30" 
                        onClick={() => {
                            window.history.replaceState({}, '', window.location.pathname)
                            setPaymentId(null)
                        }}
                    >
                        {t("viewAll")}
                    </Button>
                </div>
            )}

            <div className="flex flex-col gap-4 p-4 border rounded-xl bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-md border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-rose-500" /> {t("filterTitle")}
                    </span>
                    {(selectedSupplier !== "ALL" || selectedAccount !== "ALL" || dateRange !== undefined) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedSupplier("ALL")
                                setSelectedAccount("ALL")
                                setDateRange(undefined)
                            }}
                            className="h-7 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" /> {t("resetFilters")}
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                    {/* Filter by Supplier */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-3 h-3" /> {t("supplier")}
                        </label>
                        <SearchableSelect
                            options={[
                                { value: "ALL", label: t("allSuppliers") },
                                ...suppliers.map(s => ({ 
                                    value: s.id, 
                                    label: `${s.name} ${s.balance !== undefined ? `(Solde: ${Number(s.balance).toLocaleString("fr-DZ")} DA)` : ""}` 
                                }))
                            ]}
                            value={selectedSupplier}
                            onChange={setSelectedSupplier}
                            placeholder={t("filterBySupplier")}
                            searchPlaceholder={t("searchSupplier")}
                        />
                    </div>

                    {/* Filter by Modalité (Account) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> {t("paymentMethod")}
                        </label>
                        <SearchableSelect
                            options={[
                                { value: "ALL", label: t("allMethods") },
                                ...uniqueAccounts.map(name => ({ value: name, label: name }))
                            ]}
                            value={selectedAccount}
                            onChange={setSelectedAccount}
                            placeholder={t("paymentMethod")}
                            searchPlaceholder={t("searchMethod")}
                        />
                    </div>

                    {/* Filter by Date */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> {t("period")}
                        </label>
                        <div className="bg-white dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:border-rose-500/50 transition-all shadow-sm dark:shadow-inner w-full">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>
            </div>

            <DataTable exportTitle={"Export"} exportDescription={""} searchKey="supplierName" columns={columns} data={filteredData} />

            {/* Create Payment Dialog */}
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) setSelectedPurchaseOrderId("") }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t("dialog.newSupplierTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dialog.newSupplierDesc")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("supplier")}</Label>
                                {selectedSupplierObj && (
                                    <span className="text-xs font-semibold">
                                        Solde dû :{" "}
                                        <span className={`tabular-nums font-bold ${Number(selectedSupplierObj.balance ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                            {Number(selectedSupplierObj.balance ?? 0).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                                        </span>
                                    </span>
                                )}
                            </div>
                            <SearchableSelect
                                options={suppliers.map(s => ({ 
                                    value: s.id, 
                                    label: `${s.name} ${s.balance !== undefined ? `— Solde: ${Number(s.balance).toLocaleString("fr-DZ")} DA` : ""}` 
                                }))}
                                value={newPayment.supplierId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, supplierId: v }))}
                                placeholder={t("dialog.selectSupplierPlaceholder")}
                                searchPlaceholder={t("searchSupplier")}
                            />
                        </div>
                        {newPayment.supplierId && purchaseOrders.length > 0 && (
                            <div className="grid gap-2">
                                <Label>{t("dialog.optionalPurchase")}</Label>
                                <Select
                                    value={selectedPurchaseOrderId}
                                    onValueChange={(v) => {
                                        const actualValue = v === "none" ? "" : v
                                        setSelectedPurchaseOrderId(actualValue)
                                        const selectedOrder = purchaseOrders.find(po => po.id === actualValue)
                                        if (selectedOrder) {
                                            setNewPayment(prev => ({ ...prev, amount: selectedOrder.remaining.toFixed(2) }))
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("dialog.selectPurchasePlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t("dialog.noneGlobalDebt")}</SelectItem>
                                        {purchaseOrders.map(po => (
                                            <SelectItem key={po.id} value={po.id}>
                                                {po.purchaseNumber} (Total: {po.total.toLocaleString()} DA - Reste: {po.remaining.toLocaleString()} DA)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label>{t("dialog.amount")}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={newPayment.amount}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("dialog.registerBank")}</Label>
                                {selectedAccountObj && (
                                    <span className="text-xs font-semibold">
                                        Solde caisse :{" "}
                                        <span className="tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                                            {Number(selectedAccountObj.balance ?? 0).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                                        </span>
                                    </span>
                                )}
                            </div>
                            <SearchableSelect
                                options={accounts.map(a => ({ 
                                    value: a.id, 
                                    label: `${a.name} (${a.type === "CAISSE" ? "Caisse" : "Banque"})${a.balance !== undefined ? ` — Solde: ${Number(a.balance).toLocaleString("fr-DZ")} DA` : ""}` 
                                }))}
                                value={newPayment.accountId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, accountId: v }))}
                                placeholder={t("dialog.selectRegisterPlaceholder")}
                                searchPlaceholder={t("dialog.searchRegisterPlaceholder")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("dialog.date")}</Label>
                            <Input
                                type="datetime-local"
                                value={newPayment.date}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("dialog.notes")}</Label>
                            <Input
                                value={newPayment.notes}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder={t("dialog.notesPlaceholder")}
                            />
                        </div>
                        <div className="grid gap-2 items-center justify-center border-t pt-4">
                            <Label className="w-full text-center">{t("dialog.uploadProof")}</Label>
                            <ImageUpload
                                value={newPayment.imageUrl ? [newPayment.imageUrl] : []}
                                disabled={createLoading}
                                onChange={(url) => setNewPayment(prev => ({ ...prev, imageUrl: url }))}
                                onRemove={() => setNewPayment(prev => ({ ...prev, imageUrl: "" }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                            {t("dialog.cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={createLoading}>
                            {createLoading ? t("dialog.saving") : t("dialog.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
