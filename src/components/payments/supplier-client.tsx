"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { useRouter } from "@/i18n/routing"
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

interface SupplierPaymentsClientProps {
    data: SupplierPaymentColumn[]
    suppliers: { id: string; name: string }[]
    accounts: { id: string; name: string; type: string }[]
}

export const SupplierPaymentsClient: React.FC<SupplierPaymentsClientProps> = ({ data, suppliers, accounts }) => {
    const columns = useSupplierPaymentColumns(accounts)
    const router = useRouter()

    // Filter states
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedSupplier, setSelectedSupplier] = React.useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")
    const [paymentId, setPaymentId] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            setPaymentId(params.get("paymentId"))

            const suppId = params.get("supplierId")
            if (suppId) {
                setSelectedSupplier(suppId)
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

    // Create dialog state
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createLoading, setCreateLoading] = React.useState(false)
    const [newPayment, setNewPayment] = React.useState({
        supplierId: "",
        amount: "",
        accountId: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
        imageUrl: "",
    })
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
                toast.error("Montant invalide")
                return
            }
            if (!newPayment.supplierId) {
                toast.error("Veuillez sélectionner un fournisseur")
                return
            }
            if (!newPayment.accountId) {
                toast.error("Veuillez sélectionner une caisse/banque")
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
                toast.success("Paiement fournisseur enregistré")
                setCreateOpen(false)
                setNewPayment({ supplierId: "", amount: "", accountId: "", notes: "", date: new Date().toISOString().slice(0, 10), imageUrl: "" })
                setSelectedPurchaseOrderId("")
                router.refresh()
            }
        } catch {
            toast.error("Erreur lors de l'enregistrement")
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Paiements Fournisseurs (${filteredData.length})`}
                    description={"Suivez tous les décaissements fournisseurs — Achats et Règlements"}
                />
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 text-red-700 dark:bg-red-955/30 font-bold px-4 py-2 rounded-md border border-red-200 shadow-sm">
                        Total: {formattedTotal}
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau Paiement
                    </Button>
                </div>
            </div>
            <Separator />

            {paymentId && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between mt-4 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-300">
                    <span className="text-sm font-medium">Affichage d'une seule opération (Paiement).</span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:bg-blue-100/50 dark:hover:bg-blue-900/30" 
                        onClick={() => {
                            window.history.replaceState({}, '', window.location.pathname)
                            setPaymentId(null)
                        }}
                    >
                        Voir toutes les opérations
                    </Button>
                </div>
            )}

            {/* Premium Filter Area */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 shadow-xl space-y-5 my-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <Filter className="w-4 h-4 text-rose-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">Filtres de recherche avancés</h3>
                    </div>
                    {(selectedSupplier !== "ALL" || selectedAccount !== "ALL" || dateRange !== undefined) && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setSelectedSupplier("ALL")
                                setSelectedAccount("ALL")
                                setDateRange(undefined)
                            }}
                            className="rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all gap-2 h-8"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Réinitialiser</span>
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
                    {/* Filter by Supplier */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Truck className="w-3 h-3" /> Fournisseur
                        </label>
                        <SearchableSelect
                            options={[
                                { value: "ALL", label: "Tous les Fournisseurs" },
                                ...suppliers.map(s => ({ value: s.id, label: s.name }))
                            ]}
                            value={selectedSupplier}
                            onChange={setSelectedSupplier}
                            placeholder="Filtrer par Fournisseur"
                            searchPlaceholder="Rechercher un fournisseur..."
                        />
                    </div>

                    {/* Filter by Modalité (Account) */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> Modalité de paiement
                        </label>
                        <SearchableSelect
                            options={[
                                { value: "ALL", label: "Toutes les modalités" },
                                ...uniqueAccounts.map(name => ({ value: name, label: name }))
                            ]}
                            value={selectedAccount}
                            onChange={setSelectedAccount}
                            placeholder="Modalité de paiement"
                            searchPlaceholder="Rechercher une modalité..."
                        />
                    </div>

                    {/* Filter by Date */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> Période
                        </label>
                        <div className="bg-slate-950/50 rounded-xl border border-slate-800 focus-within:border-rose-500/50 transition-all shadow-inner w-full">
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
                        <DialogTitle>Nouveau Paiement Fournisseur</DialogTitle>
                        <DialogDescription>
                            Enregistrer un règlement de dette fournisseur
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Fournisseur</Label>
                            <SearchableSelect
                                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                value={newPayment.supplierId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, supplierId: v }))}
                                placeholder="Sélectionner un fournisseur"
                                searchPlaceholder="Rechercher un fournisseur..."
                            />
                        </div>
                        {newPayment.supplierId && purchaseOrders.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Bon d'Achat (Facture / BL) - Optionnel</Label>
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
                                        <SelectValue placeholder="Sélectionner un Bon d'Achat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Aucun (Règlement de dette global)</SelectItem>
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
                            <Label>Montant (DA)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={newPayment.amount}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Caisse / Banque</Label>
                            <SearchableSelect
                                options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type})` }))}
                                value={newPayment.accountId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, accountId: v }))}
                                placeholder="Sélectionner une caisse"
                                searchPlaceholder="Rechercher une caisse..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={newPayment.date}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Observation</Label>
                            <Input
                                value={newPayment.notes}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Note optionnelle"
                            />
                        </div>
                        <div className="grid gap-2 items-center justify-center border-t pt-4">
                            <Label className="w-full text-center">Justificatif de Paiement (Photo)</Label>
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
                            Annuler
                        </Button>
                        <Button onClick={handleCreate} disabled={createLoading}>
                            {createLoading ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
