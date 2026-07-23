"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"
import { Plus, Filter, User, Wallet, Calendar as CalendarIcon, RefreshCw } from "lucide-react"

import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaymentColumn, usePaymentColumns } from "./columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { registerCustomerPayment } from "@/actions/customers"
import { getUnpaidSalesOrders } from "@/actions/sales-orders"
import { FichePaiementModal, PaymentFicheData } from "./fiche-modal"

interface PaymentsClientProps {
    data: PaymentColumn[]
    customers: { id: string; name: string }[]
    accounts: { id: string; name: string; type: string }[]
}

export const PaymentsClient: React.FC<PaymentsClientProps> = ({ data, customers, accounts }) => {
    const t = useTranslations("Payments")
    const columns = usePaymentColumns(accounts)
    const router = useRouter()

    // Filter states
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedCustomer, setSelectedCustomer] = React.useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")
    const [paymentId, setPaymentId] = React.useState<string | null>(null)

    // Create dialog state
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createLoading, setCreateLoading] = React.useState(false)
    const [newPayment, setNewPayment] = React.useState({
        customerId: "",
        amount: "",
        accountId: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
    })
    const [salesOrders, setSalesOrders] = React.useState<any[]>([])
    const [selectedSalesOrderId, setSelectedSalesOrderId] = React.useState<string>("")
    const [createdFicheData, setCreatedFicheData] = React.useState<PaymentFicheData | null>(null)
    const [ficheOpen, setFicheOpen] = React.useState(false)

    React.useEffect(() => {
        if (!newPayment.customerId) {
            setSalesOrders([])
            setSelectedSalesOrderId("")
            return
        }

        const fetchOrders = async () => {
            try {
                const res = await getUnpaidSalesOrders(newPayment.customerId)
                if ('salesOrders' in res) {
                    setSalesOrders(res.salesOrders)
                }
            } catch (err) {
                console.error("Error fetching unpaid sales orders", err)
            }
        }
        fetchOrders()
    }, [newPayment.customerId])

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            setPaymentId(params.get("paymentId"))

            const custId = params.get("customerId")
            if (custId) {
                setSelectedCustomer(custId)
            }

            const accId = params.get("accountId")
            if (accId) {
                const acc = accounts.find(a => a.id === accId)
                if (acc) {
                    setSelectedAccount(acc.name)
                }
            }
        }
    }, [accounts])

    // Apply filters
    React.useEffect(() => {
        let result = data

        if (paymentId) {
            result = result.filter(item => item.id === paymentId)
        } else {
            // 1. Filter by Customer
            if (selectedCustomer !== "ALL") {
                result = result.filter(item => item.customerId === selectedCustomer)
            }

            // 2. Filter by Account (Modalité de paiement)
            if (selectedAccount !== "ALL") {
                result = result.filter(item => item.accountName === selectedAccount)
            }

            // 3. Filter by Date range
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
    }, [data, dateRange, selectedCustomer, selectedAccount, paymentId])

    // Calculate total
    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + ' DA'

    // Get unique account names for the filter
    const uniqueAccounts = React.useMemo(() => {
        const names = new Set(data.map(d => d.accountName))
        return Array.from(names).filter(Boolean)
    }, [data])

    // Create payment handler
    const handleCreate = async () => {
        try {
            setCreateLoading(true)
            const amount = parseFloat(newPayment.amount)
            if (isNaN(amount) || amount <= 0) {
                toast.error(t("invalidAmount"))
                return
            }
            if (!newPayment.customerId) {
                toast.error(t("selectClient"))
                return
            }
            if (!newPayment.accountId) {
                toast.error(t("selectAccount"))
                return
            }

            const result = await registerCustomerPayment({
                customerId: newPayment.customerId,
                amount,
                accountId: newPayment.accountId,
                notes: newPayment.notes,
                date: newPayment.date,
                salesOrderId: selectedSalesOrderId || undefined,
            })

            if ('error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success(t("paymentSaved"))
                const cust = customers.find(c => c.id === newPayment.customerId)
                const acc = accounts.find(a => a.id === newPayment.accountId)

                setCreatedFicheData({
                    date: newPayment.date,
                    amount,
                    customerName: cust?.name || "Client",
                    accountName: acc?.name || "Caisse",
                    description: newPayment.notes,
                    source: "CUSTOMER_PAYMENT",
                })
                setCreateOpen(false)
                setFicheOpen(true)
                setNewPayment({ customerId: "", amount: "", accountId: "", notes: "", date: new Date().toISOString().slice(0, 10) })
                setSelectedSalesOrderId("")
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
                    title={`${t("title")} (${filteredData.length})`}
                    description={t("description")}
                />
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 font-bold px-4 py-2 rounded-md border border-emerald-200 shadow-sm">
                        {t("total")} {formattedTotal}
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("newPayment")}
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

            {/* Premium Filter Area */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 my-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Filter className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">{t("advancedFilters")}</h3>
                    </div>
                    {(selectedCustomer !== "ALL" || selectedAccount !== "ALL" || dateRange !== undefined) && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setSelectedCustomer("ALL")
                                setSelectedAccount("ALL")
                                setDateRange(undefined)
                            }}
                            className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2 h-8"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t("reset")}</span>
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                    {/* Filter by Client */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3 h-3" /> {t("client")}
                        </label>
                        <SearchableSelect
                            options={[
                                { value: "ALL", label: t("allClients") },
                                ...customers.map(c => ({ value: c.id, label: c.name }))
                            ]}
                            value={selectedCustomer}
                            onChange={setSelectedCustomer}
                            placeholder={t("filterByClient")}
                            searchPlaceholder={t("searchClient")}
                        />
                    </div>

                    {/* Filter by Modalité (Account) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> {t("period")}
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-emerald-500/50 transition-all shadow-inner w-full">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                </div>
            </div>

            <DataTable exportTitle={"Export"} exportDescription={""} searchKey="customerName" columns={columns} data={filteredData} />

            {/* Create Payment Dialog */}
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) setSelectedSalesOrderId("") }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t("dialog.newCustomerTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dialog.newCustomerDesc")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t("client")}</Label>
                            <SearchableSelect
                                options={customers.map(c => ({ value: c.id, label: c.name }))}
                                value={newPayment.customerId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, customerId: v }))}
                                placeholder={t("dialog.selectClientPlaceholder")}
                                searchPlaceholder={t("searchClient")}
                            />
                        </div>
                        {newPayment.customerId && salesOrders.length > 0 && (
                            <div className="grid gap-2">
                                <Label>{t("dialog.optionalInvoice")}</Label>
                                <Select
                                    value={selectedSalesOrderId}
                                    onValueChange={(v) => {
                                        const actualValue = v === "none" ? "" : v
                                        setSelectedSalesOrderId(actualValue)
                                        const selectedOrder = salesOrders.find(so => so.id === actualValue)
                                        if (selectedOrder) {
                                            const remaining = Number(selectedOrder.total) - Number(selectedOrder.amountPaid)
                                            setNewPayment(prev => ({ ...prev, amount: remaining.toFixed(2) }))
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("dialog.selectInvoicePlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t("dialog.noneGlobalDebt")}</SelectItem>
                                        {salesOrders.map(so => {
                                            const remaining = Number(so.total) - Number(so.amountPaid)
                                            return (
                                                <SelectItem key={so.id} value={so.id}>
                                                    {so.receiptNumber} (Total: {Number(so.total).toLocaleString()} DA - Reste: {remaining.toLocaleString()} DA)
                                                </SelectItem>
                                            )
                                        })}
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
                            <Label>{t("dialog.registerBank")}</Label>
                            <SearchableSelect
                                options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type})` }))}
                                value={newPayment.accountId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, accountId: v }))}
                                placeholder={t("dialog.selectRegisterPlaceholder")}
                                searchPlaceholder={t("dialog.searchRegisterPlaceholder")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("dialog.date")}</Label>
                            <Input
                                type="date"
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

            {/* Fiche de Paiement Modal */}
            <FichePaiementModal
                open={ficheOpen}
                onClose={() => setFicheOpen(false)}
                data={createdFicheData}
            />
        </>
    )
}
