"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
    Plus, 
    ArrowLeftRight, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Wallet, 
    FileText, 
    Calendar, 
    User, 
    Package, 
    AlertTriangle, 
    Search,
    CheckCircle2,
    Edit3,
    Trash2
} from "lucide-react"
import { 
    processSupplierReturn, 
    getCustomerSalesOrders, 
    processBulkClientReturn, 
    getSupplierPurchaseOrders, 
    processBulkSupplierReturn,
    deleteClientReturn,
    deleteSupplierReturn,
    editClientReturn,
    editSupplierReturn
} from "@/actions/returns"
import { SearchableSelect } from "@/components/ui/searchable-select"

interface ProductOption {
    id: string
    name: string
    price: number
    cost: number
    stock: number
}

interface CustomerOption {
    id: string
    name: string
    balance: number
}

interface SupplierOption {
    id: string
    name: string
    balance: number
}

interface AccountOption {
    id: string
    name: string
    balance: number
    type: string
}

interface StoreOption {
    id: string
    name: string
}

interface ReturnsClientProps {
    clientReturns: any[]
    supplierReturns: any[]
    products: ProductOption[]
    customers: CustomerOption[]
    suppliers: SupplierOption[]
    accounts: AccountOption[]
    stores: StoreOption[]
}

export function ReturnsClient({
    clientReturns = [],
    supplierReturns = [],
    products = [],
    customers = [],
    suppliers = [],
    accounts = [],
    stores = []
}: ReturnsClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"client" | "supplier">("client")
    const [searchQuery, setSearchQuery] = useState("")

    // Advanced Filters State (Client)
    const [clientStartDate, setClientStartDate] = useState("")
    const [clientEndDate, setClientEndDate] = useState("")
    const [clientStoreFilter, setClientStoreFilter] = useState("all")
    const [clientCompensationFilter, setClientCompensationFilter] = useState("all")

    // Advanced Filters State (Supplier)
    const [supplierStartDate, setSupplierStartDate] = useState("")
    const [supplierEndDate, setSupplierEndDate] = useState("")
    const [supplierStoreFilter, setSupplierStoreFilter] = useState("all")
    const [supplierCompensationFilter, setSupplierCompensationFilter] = useState("all")

    // Modals visibility
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

    // Form inputs state (Client)
    const [clientCustomerId, setClientCustomerId] = useState("")
    const [salesOrders, setSalesOrders] = useState<any[]>([])
    const [selectedSalesOrderId, setSelectedSalesOrderId] = useState("")
    const [returnedQuantities, setReturnedQuantities] = useState<Record<string, number>>({})
    const [refundCash, setRefundCash] = useState(false)
    const [clientStoreId, setClientStoreId] = useState("")
    const [clientAccountId, setClientAccountId] = useState("")
    const [clientReason, setClientReason] = useState("")
    const [clientNotes, setClientNotes] = useState("")

    // Fetch client's BLs when selected client changes
    useEffect(() => {
        if (!clientCustomerId) {
            setSalesOrders([])
            setSelectedSalesOrderId("")
            setReturnedQuantities({})
            return
        }

        const fetchSalesOrders = async () => {
            const data = await getCustomerSalesOrders(clientCustomerId)
            setSalesOrders(data)
            setSelectedSalesOrderId("")
            setReturnedQuantities({})
        }

        fetchSalesOrders()
    }, [clientCustomerId])

    // Form inputs state (Supplier)
    const [supplierId, setSupplierId] = useState("")
    const [supplierPurchaseOrders, setSupplierPurchaseOrders] = useState<any[]>([])
    const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState("")
    const [supplierReturnedQuantities, setSupplierReturnedQuantities] = useState<Record<string, number>>({})
    const [supplierRefundCash, setSupplierRefundCash] = useState(false)
    const [supplierStoreId, setSupplierStoreId] = useState("")
    const [supplierAccountId, setSupplierAccountId] = useState("")
    const [supplierReason, setSupplierReason] = useState("")
    const [supplierNotes, setSupplierNotes] = useState("")

    // Fetch supplier's POs when selected supplier changes
    useEffect(() => {
        if (!supplierId) {
            setSupplierPurchaseOrders([])
            setSelectedPurchaseOrderId("")
            setSupplierReturnedQuantities({})
            return
        }

        const fetchPurchaseOrders = async () => {
            const data = await getSupplierPurchaseOrders(supplierId)
            setSupplierPurchaseOrders(data)
            setSelectedPurchaseOrderId("")
            setSupplierReturnedQuantities({})
        }

        fetchPurchaseOrders()
    }, [supplierId])

    // Status messages
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [successMsg, setSuccessMsg] = useState("")

    // Edit Return State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingReturn, setEditingReturn] = useState<any>(null)
    const [editReason, setEditReason] = useState("")
    const [editNotes, setEditNotes] = useState("")
    const [editingType, setEditingType] = useState<"client" | "supplier">("client")

    // Delete Return State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
    const [deletingReturn, setDeletingReturn] = useState<any>(null)
    const [deletingType, setDeletingType] = useState<"client" | "supplier">("client")

    const openEditModal = (ret: any, type: "client" | "supplier") => {
        setEditingReturn(ret)
        setEditingType(type)
        setEditReason(ret.reason || "")
        setEditNotes(ret.notes || "")
        setIsEditModalOpen(true)
        setErrorMsg("")
        setSuccessMsg("")
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingReturn) return
        setLoading(true)
        setErrorMsg("")
        setSuccessMsg("")

        let res
        if (editingType === "client") {
            res = await editClientReturn(editingReturn.id, editReason, editNotes)
        } else {
            res = await editSupplierReturn(editingReturn.id, editReason, editNotes)
        }

        setLoading(false)
        if (res.error) {
            setErrorMsg(res.error)
        } else {
            setSuccessMsg(res.success || "Retour modifié avec succès")
            setTimeout(() => {
                setIsEditModalOpen(false)
                setEditingReturn(null)
                router.refresh()
            }, 1500)
        }
    }

    const openDeleteConfirm = (ret: any, type: "client" | "supplier") => {
        setDeletingReturn(ret)
        setDeletingType(type)
        setIsDeleteConfirmOpen(true)
        setErrorMsg("")
        setSuccessMsg("")
    }

    const handleDeleteConfirm = async () => {
        if (!deletingReturn) return
        setLoading(true)
        setErrorMsg("")
        setSuccessMsg("")

        let res
        if (deletingType === "client") {
            res = await deleteClientReturn(deletingReturn.id)
        } else {
            res = await deleteSupplierReturn(deletingReturn.id)
        }

        setLoading(false)
        if (res.error) {
            setErrorMsg(res.error)
        } else {
            setSuccessMsg(res.success || "Retour supprimé avec succès")
            setTimeout(() => {
                setIsDeleteConfirmOpen(false)
                setDeletingReturn(null)
                router.refresh()
            }, 1500)
        }
    }

    // Reset Client Form
    const resetClientForm = () => {
        setClientCustomerId("")
        setSalesOrders([])
        setSelectedSalesOrderId("")
        setReturnedQuantities({})
        setRefundCash(false)
        setClientStoreId(stores[0]?.id || "")
        setClientAccountId(accounts[0]?.id || "")
        setClientReason("")
        setClientNotes("")
        setErrorMsg("")
        setSuccessMsg("")
    }

    // Reset Supplier Form
    const resetSupplierForm = () => {
        setSupplierId("")
        setSupplierPurchaseOrders([])
        setSelectedPurchaseOrderId("")
        setSupplierReturnedQuantities({})
        setSupplierRefundCash(false)
        setSupplierStoreId(stores[0]?.id || "")
        setSupplierAccountId(accounts[0]?.id || "")
        setSupplierReason("")
        setSupplierNotes("")
        setErrorMsg("")
        setSuccessMsg("")
    }

    // Live calculators
    const selectedSalesOrder = salesOrders.find(so => so.id === selectedSalesOrderId)
    
    // Return client calculations
    const clientTotal = selectedSalesOrder
        ? selectedSalesOrder.items.reduce((sum: number, item: any) => {
            const qty = returnedQuantities[item.productId] || 0
            return sum + (qty * Number(item.unitPrice))
          }, 0)
        : 0

    const amountPaid = selectedSalesOrder ? Number(selectedSalesOrder.amountPaid) : 0
    const salesOrderTotal = selectedSalesOrder ? Number(selectedSalesOrder.total) : 0
    const maxRefundCapacity = selectedSalesOrder
        ? Math.max(0, amountPaid - (salesOrderTotal - clientTotal))
        : 0

    // Supplier Calculations
    const selectedPurchaseOrder = supplierPurchaseOrders.find(po => po.id === selectedPurchaseOrderId)
    
    const supplierTotal = selectedPurchaseOrder
        ? selectedPurchaseOrder.items.reduce((sum: number, item: any) => {
            const qty = supplierReturnedQuantities[item.productId] || 0
            return sum + (qty * Number(item.costPrice))
          }, 0)
        : 0

    const supplierAmountPaid = selectedPurchaseOrder ? Number(selectedPurchaseOrder.amountPaid) : 0
    const purchaseOrderTotal = selectedPurchaseOrder ? Number(selectedPurchaseOrder.total) : 0
    const supplierMaxRefundCapacity = selectedPurchaseOrder
        ? Math.max(0, supplierAmountPaid - (purchaseOrderTotal - supplierTotal))
        : 0

    const selectedCustomer = customers.find(c => c.id === clientCustomerId)
    const selectedSupplierInfo = suppliers.find(s => s.id === supplierId)
    const selectedAccountInfo = accounts.find(a => a.id === (activeTab === "client" ? clientAccountId : supplierAccountId))

    // Handle Client Return submission
    const handleClientReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")
        setSuccessMsg("")

        if (!selectedSalesOrderId) {
            setErrorMsg("Veuillez sélectionner un bon de livraison (BL)")
            setLoading(false)
            return
        }

        const itemsToReturn = selectedSalesOrder.items.map((item: any) => ({
            productId: item.productId,
            quantity: returnedQuantities[item.productId] || 0,
            unitPrice: Number(item.unitPrice)
        })).filter((item: any) => item.quantity > 0)

        if (itemsToReturn.length === 0) {
            setErrorMsg("Veuillez saisir au moins une quantité à retourner")
            setLoading(false)
            return
        }

        const res = await processBulkClientReturn({
            customerId: clientCustomerId,
            salesOrderId: selectedSalesOrderId,
            items: itemsToReturn,
            storeId: clientStoreId || undefined,
            refundCash: refundCash,
            accountId: refundCash ? clientAccountId : undefined,
            reason: clientReason,
            notes: clientNotes || undefined
        })

        setLoading(false)
        if (res.error) {
            setErrorMsg(res.error)
        } else {
            setSuccessMsg(res.success || "Retour enregistré avec succès")
            setTimeout(() => {
                setIsClientModalOpen(false)
                resetClientForm()
                router.refresh()
            }, 1800)
        }
    }

    // Handle Supplier Return submission
    const handleSupplierReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")
        setSuccessMsg("")

        if (!selectedPurchaseOrderId) {
            setErrorMsg("Veuillez sélectionner un bon de commande/achat")
            setLoading(false)
            return
        }

        const itemsToReturn = selectedPurchaseOrder.items.map((item: any) => ({
            productId: item.productId,
            quantity: supplierReturnedQuantities[item.productId] || 0,
            unitCostPrice: Number(item.costPrice)
        })).filter((item: any) => item.quantity > 0)

        if (itemsToReturn.length === 0) {
            setErrorMsg("Veuillez saisir au moins une quantité à retourner")
            setLoading(false)
            return
        }

        const res = await processBulkSupplierReturn({
            supplierId,
            purchaseOrderId: selectedPurchaseOrderId,
            items: itemsToReturn,
            storeId: supplierStoreId || undefined,
            refundCash: supplierRefundCash,
            accountId: supplierRefundCash ? supplierAccountId : undefined,
            reason: supplierReason,
            notes: supplierNotes || undefined
        })

        setLoading(false)
        if (res.error) {
            setErrorMsg(res.error)
        } else {
            setSuccessMsg(res.success || "Retour enregistré avec succès")
            setTimeout(() => {
                setIsSupplierModalOpen(false)
                resetSupplierForm()
                router.refresh()
            }, 1800)
        }
    }

    // Filters for lists
    const filteredClientReturns = clientReturns.filter(r => {
        const query = searchQuery.toLowerCase()
        const matchesSearch = (
            r.customer?.name?.toLowerCase().includes(query) ||
            r.product?.name?.toLowerCase().includes(query) ||
            r.reason?.toLowerCase().includes(query)
        )

        // Date Range
        const returnDateStr = r.createdAt.split('T')[0]
        const matchesStartDate = !clientStartDate || returnDateStr >= clientStartDate
        const matchesEndDate = !clientEndDate || returnDateStr <= clientEndDate

        // Store
        const matchesStore = clientStoreFilter === "all" || r.salesOrder?.storeId === clientStoreFilter

        // Compensation
        const matchesCompensation = clientCompensationFilter === "all" ||
            (clientCompensationFilter === "CASH" ? r.returnType === "CASH" : r.returnType === "CREDIT")

        return matchesSearch && matchesStartDate && matchesEndDate && matchesStore && matchesCompensation
    })

    const filteredSupplierReturns = supplierReturns.filter(r => {
        const query = searchQuery.toLowerCase()
        const matchesSearch = (
            r.supplierName?.toLowerCase().includes(query) ||
            r.productName?.toLowerCase().includes(query) ||
            r.reason?.toLowerCase().includes(query)
        )

        // Date Range
        const returnDateStr = r.createdAt.split('T')[0]
        const matchesStartDate = !supplierStartDate || returnDateStr >= supplierStartDate
        const matchesEndDate = !supplierEndDate || returnDateStr <= supplierEndDate

        // Store
        const matchesStore = supplierStoreFilter === "all" || r.purchaseOrder?.storeId === supplierStoreFilter

        // Compensation
        const matchesCompensation = supplierCompensationFilter === "all" ||
            (supplierCompensationFilter === "CASH" ? r.returnType === "CASH" : r.returnType === "CREDIT")

        return matchesSearch && matchesStartDate && matchesEndDate && matchesStore && matchesCompensation
    })

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 rounded-2xl border border-purple-500/10 shadow-lg">
                <div>
                    <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                        <ArrowLeftRight className="h-8 w-8 text-purple-400" />
                        Gestion des Retours
                    </h1>
                    <p className="text-purple-200/60 mt-1.5 text-sm max-w-xl">
                        Enregistrez les retours de marchandises et ajustez automatiquement les stocks, les dettes tiers (soldes) et effectuez les remboursements en caisse.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => { resetClientForm(); setIsClientModalOpen(true) }}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-500/20 hover:shadow-purple-500/35 active:scale-95 transition-all flex items-center gap-2 border border-purple-400/20"
                    >
                        <Plus className="h-4 w-4" />
                        Nouveau Retour Client
                    </button>
                    <button
                        onClick={() => { resetSupplierForm(); setIsSupplierModalOpen(true) }}
                        className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-500/20 hover:shadow-pink-500/35 active:scale-95 transition-all flex items-center gap-2 border border-pink-400/20"
                    >
                        <Plus className="h-4 w-4" />
                        Nouveau Retour Fournisseur
                    </button>
                </div>
            </div>

            {/* Navigation Tabs and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-3 rounded-xl border border-slate-900">
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                        onClick={() => { setActiveTab("client"); setSearchQuery("") }}
                        className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${
                            activeTab === "client" 
                                ? "bg-purple-600/15 text-purple-400 border border-purple-500/20" 
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                    >
                        <ArrowDownLeft className="h-4 w-4" />
                        Retours Clients ({clientReturns.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab("supplier"); setSearchQuery("") }}
                        className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${
                            activeTab === "supplier" 
                                ? "bg-pink-600/15 text-pink-400 border border-pink-500/20" 
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                    >
                        <ArrowUpRight className="h-4 w-4" />
                        Retours Fournisseurs ({supplierReturns.length})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 text-slate-200 border border-slate-800 rounded-lg text-xs outline-none focus:border-slate-700 placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date Début</label>
                    <input
                        type="date"
                        value={activeTab === "client" ? clientStartDate : supplierStartDate}
                        onChange={(e) => activeTab === "client" ? setClientStartDate(e.target.value) : setSupplierStartDate(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date Fin</label>
                    <input
                        type="date"
                        value={activeTab === "client" ? clientEndDate : supplierEndDate}
                        onChange={(e) => activeTab === "client" ? setClientEndDate(e.target.value) : setSupplierEndDate(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Magasin / Dépôt</label>
                    <select
                        value={activeTab === "client" ? clientStoreFilter : supplierStoreFilter}
                        onChange={(e) => activeTab === "client" ? setClientStoreFilter(e.target.value) : setSupplierStoreFilter(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-slate-700"
                    >
                        <option value="all">Tous les Dépôts</option>
                        {stores.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Compensation</label>
                    <select
                        value={activeTab === "client" ? clientCompensationFilter : supplierCompensationFilter}
                        onChange={(e) => activeTab === "client" ? setClientCompensationFilter(e.target.value) : setSupplierCompensationFilter(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-slate-700"
                    >
                        <option value="all">Toutes compensations</option>
                        <option value="CREDIT">{activeTab === "client" ? "Crédit (Solde)" : "Déduction Dette"}</option>
                        <option value="CASH">Remboursement Cash</option>
                    </select>
                </div>
            </div>

            {/* Clear filters trigger */}
            {((activeTab === "client" ? (clientStartDate || clientEndDate || clientStoreFilter !== "all" || clientCompensationFilter !== "all") : (supplierStartDate || supplierEndDate || supplierStoreFilter !== "all" || supplierCompensationFilter !== "all"))) && (
                <div className="flex justify-end -mt-2">
                    <button
                        onClick={() => {
                            if (activeTab === "client") {
                                setClientStartDate("")
                                setClientEndDate("")
                                setClientStoreFilter("all")
                                setClientCompensationFilter("all")
                            } else {
                                setSupplierStartDate("")
                                setSupplierEndDate("")
                                setSupplierStoreFilter("all")
                                setSupplierCompensationFilter("all")
                            }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
                    >
                        Effacer les filtres
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <div className="bg-slate-950 rounded-2xl border border-slate-900 p-6 shadow-sm overflow-hidden">
                {activeTab === "client" ? (
                    <div>
                        <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <ArrowDownLeft className="h-5 w-5 text-purple-400" />
                            Historique des Retours Clients
                        </h2>

                        {filteredClientReturns.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 text-xs italic">
                                Aucun retour client trouvé.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-900 text-slate-400 font-bold bg-slate-900/30">
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Client</th>
                                            <th className="p-3">Produit</th>
                                            <th className="p-3 text-center">Quantité</th>
                                            <th className="p-3 text-right">P.U</th>
                                            <th className="p-3 text-right">Total</th>
                                            <th className="p-3 text-center">Type</th>
                                            <th className="p-3">Motif</th>
                                            <th className="p-3">Auteur</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900">
                                        {filteredClientReturns.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-900/30 text-slate-300">
                                                <td className="p-3 whitespace-nowrap text-slate-500">
                                                    {new Date(r.createdAt).toLocaleDateString("fr-DZ", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>
                                                <td className="p-3 font-semibold text-slate-200">{r.customer?.name}</td>
                                                <td className="p-3 text-purple-300 font-medium">{r.product?.name}</td>
                                                <td className="p-3 text-center font-bold text-white">{r.quantity}</td>
                                                <td className="p-3 text-right text-slate-400">{Number(r.unitPrice).toLocaleString()} DA</td>
                                                <td className="p-3 text-right font-bold text-emerald-400">{Number(r.totalAmount).toLocaleString()} DA</td>
                                                <td className="p-3 text-center">
                                                    {r.returnType === "CASH" ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">CASH</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">CRÉDIT</span>
                                                    )}
                                                </td>
                                                <td className="p-3 max-w-xs truncate text-slate-400">{r.reason}</td>
                                                <td className="p-3 text-slate-500">{r.driver?.name}</td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(r, "client")}
                                                            className="p-1.5 bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-600/25 rounded-lg transition-all"
                                                            title="Modifier"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirm(r, "client")}
                                                            className="p-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/25 rounded-lg transition-all"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-pink-400" />
                            Historique des Retours Fournisseurs
                        </h2>

                        {filteredSupplierReturns.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 text-xs italic">
                                Aucun retour fournisseur trouvé.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-900 text-slate-400 font-bold bg-slate-900/30">
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Fournisseur</th>
                                            <th className="p-3">Produit</th>
                                            <th className="p-3 text-center">Quantité</th>
                                            <th className="p-3 text-right">Coût U.</th>
                                            <th className="p-3 text-right">Total</th>
                                            <th className="p-3 text-center">Type</th>
                                            <th className="p-3">Motif</th>
                                            <th className="p-3">Enregistré Par</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900">
                                        {filteredSupplierReturns.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-900/30 text-slate-300">
                                                <td className="p-3 whitespace-nowrap text-slate-500">
                                                    {new Date(r.createdAt).toLocaleDateString("fr-DZ", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>
                                                <td className="p-3 font-semibold text-slate-200">{r.supplierName}</td>
                                                <td className="p-3 text-pink-300 font-medium">{r.productName}</td>
                                                <td className="p-3 text-center font-bold text-white">{r.quantity}</td>
                                                <td className="p-3 text-right text-slate-400">{Number(r.unitPrice || 0).toLocaleString()} DA</td>
                                                <td className="p-3 text-right font-bold text-pink-400">{Number(r.totalAmount || 0).toLocaleString()} DA</td>
                                                <td className="p-3 text-center">
                                                    {r.returnType === "CASH" ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">CASH</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20">CRÉDIT</span>
                                                    )}
                                                </td>
                                                <td className="p-3 max-w-xs truncate text-slate-400">{r.reason}</td>
                                                <td className="p-3 text-slate-500">{r.userName}</td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(r, "supplier")}
                                                            className="p-1.5 bg-pink-600/10 border border-pink-500/20 text-pink-400 hover:bg-pink-600/25 rounded-lg transition-all"
                                                            title="Modifier"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirm(r, "supplier")}
                                                            className="p-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/25 rounded-lg transition-all"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: New Client Return */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-purple-500/20 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ArrowDownLeft className="h-5 w-5 text-purple-400" />
                            Nouveau Retour Client
                        </h3>

                        <form onSubmit={handleClientReturnSubmit} className="space-y-5">
                            {/* Customer Select */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Client *</label>
                                    <SearchableSelect
                                        options={customers.map(c => ({
                                            label: `${c.name} (Solde: ${c.balance.toLocaleString()} DA)`,
                                            value: c.id
                                        }))}
                                        value={clientCustomerId}
                                        onChange={setClientCustomerId}
                                        placeholder="Sélectionner un client..."
                                        searchPlaceholder="Rechercher un client..."
                                        emptyMessage="Aucun client trouvé."
                                        className="bg-slate-900 text-slate-200 border border-slate-800 focus:border-slate-700 rounded-xl h-9 text-xs"
                                    />
                                </div>

                                {/* BL Select */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Bon de Livraison (BL) *</label>
                                    <SearchableSelect
                                        options={salesOrders.map(so => ({
                                            label: `${so.receiptNumber || `N° ${so.id.substring(0,8)}`} (${new Date(so.createdAt).toLocaleDateString()} — Total: ${Number(so.total).toLocaleString()} DA — Payé: ${Number(so.amountPaid).toLocaleString()} DA)`,
                                            value: so.id
                                        }))}
                                        disabled={!clientCustomerId}
                                        value={selectedSalesOrderId}
                                        onChange={setSelectedSalesOrderId}
                                        placeholder={!clientCustomerId ? "Sélectionnez d'abord un client..." : "Sélectionner un BL..."}
                                        searchPlaceholder="Rechercher un BL (N° reçu)..."
                                        emptyMessage="Aucun BL trouvé."
                                        className="bg-slate-900 text-slate-200 border border-slate-800 focus:border-slate-700 rounded-xl h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Products Sold Table */}
                            {selectedSalesOrder && (
                                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-900/10">
                                    <div className="p-3 bg-slate-900/50 border-b border-slate-900">
                                        <span className="text-[11px] font-bold text-purple-400 uppercase">Produits du bon de livraison</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-900 text-slate-500 font-bold bg-slate-900/20">
                                                    <th className="p-3">Produit</th>
                                                    <th className="p-3">Codebarre</th>
                                                    <th className="p-3 text-center">Qté Vendue</th>
                                                    <th className="p-3 text-center">Retournée Précédemment</th>
                                                    <th className="p-3 text-center w-28">Qté à Retourner</th>
                                                    <th className="p-3 text-right">P.U</th>
                                                    <th className="p-3 text-right">Montant</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900">
                                                {selectedSalesOrder.items.map((item: any) => {
                                                    const previouslyReturned = selectedSalesOrder.productReturns
                                                        ?.filter((pr: any) => pr.productId === item.productId)
                                                        .reduce((sum: number, pr: any) => sum + pr.quantity, 0) || 0
                                                    
                                                    const maxQtyToReturn = Math.max(0, item.quantity - previouslyReturned)
                                                    const currentReturnQty = returnedQuantities[item.productId] || 0
                                                    const lineTotal = currentReturnQty * Number(item.unitPrice)

                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-900/20 text-slate-300">
                                                            <td className="p-3 font-medium text-slate-200">{item.product?.name}</td>
                                                            <td className="p-3 text-slate-500">{item.product?.barcodes?.[0]?.value || "-"}</td>
                                                            <td className="p-3 text-center font-semibold text-slate-400">{item.quantity}</td>
                                                            <td className="p-3 text-center text-amber-500 font-semibold">{previouslyReturned}</td>
                                                            <td className="p-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={maxQtyToReturn}
                                                                    value={returnedQuantities[item.productId] ?? ""}
                                                                    onChange={(e) => {
                                                                        const val = Math.min(maxQtyToReturn, Math.max(0, parseInt(e.target.value) || 0))
                                                                        setReturnedQuantities(prev => ({
                                                                            ...prev,
                                                                            [item.productId]: val
                                                                        }))
                                                                    }}
                                                                    className="w-20 bg-slate-900 text-slate-100 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-xs outline-none focus:border-purple-500"
                                                                />
                                                            </td>
                                                            <td className="p-3 text-right text-slate-400">{Number(item.unitPrice).toLocaleString()} DA</td>
                                                            <td className="p-3 text-right font-bold text-purple-400">{lineTotal.toLocaleString()} DA</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Store and Reason */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Dépôt / Magasin de restockage</label>
                                    <select
                                        value={clientStoreId}
                                        onChange={(e) => setClientStoreId(e.target.value)}
                                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700"
                                    >
                                        {stores.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Motif du Retour *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ex: Article défectueux, Non conforme..."
                                        value={clientReason}
                                        onChange={(e) => setClientReason(e.target.value)}
                                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Summary and Financial Options */}
                            {selectedSalesOrder && clientTotal > 0 && (
                                <div className="space-y-4">
                                    <div className="bg-purple-950/20 border border-purple-500/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Package className="h-5 w-5 text-purple-400" />
                                            <div>
                                                <span className="font-bold text-slate-200 block">Total Retour Marchandise</span>
                                                <span className="text-[10px] text-slate-500">
                                                    Défini à partir de la grille des quantités
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-purple-400">
                                                {clientTotal.toLocaleString()} DA
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mode de Compensation / Remboursement */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Mode de Compensation</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer select-none transition-all ${
                                                !refundCash
                                                    ? "bg-purple-950/15 border-purple-500 text-white shadow-sm"
                                                    : "bg-slate-900/50 border-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="clientRefundType"
                                                    checked={!refundCash}
                                                    onChange={() => setRefundCash(false)}
                                                    className="sr-only"
                                                />
                                                <FileText className="h-5 w-5 mb-1 text-purple-400" />
                                                <span className="text-xs font-bold">Crédit Client (Solde)</span>
                                                <span className="text-[9px] text-slate-500 mt-0.5 text-center">Génère un crédit ou réduit sa dette pour un futur BL</span>
                                            </label>

                                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border select-none transition-all ${
                                                maxRefundCapacity <= 0 
                                                    ? "opacity-40 cursor-not-allowed bg-slate-950/30 border-slate-900 text-slate-600" 
                                                    : refundCash
                                                        ? "bg-purple-950/15 border-purple-500 text-white shadow-sm cursor-pointer"
                                                        : "bg-slate-900/50 border-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer"
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="clientRefundType"
                                                    disabled={maxRefundCapacity <= 0}
                                                    checked={refundCash}
                                                    onChange={() => setRefundCash(true)}
                                                    className="sr-only"
                                                />
                                                <Wallet className="h-5 w-5 mb-1 text-purple-400" />
                                                <span className="text-xs font-bold">Rembourser Cash (Caisse)</span>
                                                <span className="text-[9px] text-slate-500 mt-0.5 text-center">
                                                    Remboursement immédiat (Max: {maxRefundCapacity.toLocaleString()} DA)
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Treasury Account select if refund is active */}
                                    {refundCash && maxRefundCapacity > 0 && (
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Caisse de Remboursement *</label>
                                            <select
                                                required
                                                value={clientAccountId}
                                                onChange={(e) => setClientAccountId(e.target.value)}
                                                className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700"
                                            >
                                                <option value="">Sélectionnez un compte...</option>
                                                {accounts.map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name} (Disponible: {a.balance.toLocaleString()} DA)
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Warning if cash insufficient */}
                                            {selectedAccountInfo && Number(selectedAccountInfo.balance) < Math.min(maxRefundCapacity, clientTotal) && (
                                                <div className="bg-red-950/15 border border-red-500/20 p-3 rounded-lg text-[10px] text-red-400 flex items-start gap-2">
                                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                                    <span>Attention: Solde insuffisant dans ce compte. Disponible: {selectedAccountInfo.balance.toLocaleString()} DA. Requis: {Math.min(maxRefundCapacity, clientTotal).toLocaleString()} DA.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes Internes */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Notes Internes (facultatif)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Notes de commentaires internes..."
                                    value={clientNotes}
                                    onChange={(e) => setClientNotes(e.target.value)}
                                    className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700 resize-none"
                                />
                            </div>

                            {/* Feedback messages */}
                            {errorMsg && (
                                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {errorMsg}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    {successMsg}
                                </div>
                            )}

                            {/* Form actions */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
                                <button
                                    type="button"
                                    onClick={() => setIsClientModalOpen(false)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (refundCash && selectedAccountInfo && Number(selectedAccountInfo.balance) < Math.min(maxRefundCapacity, clientTotal))}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/10 transition-all"
                                >
                                    {loading ? "Enregistrement..." : "Enregistrer le Retour"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Supplier Return */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-pink-500/20 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-pink-400" />
                            Nouveau Retour Fournisseur
                        </h3>

                        <form onSubmit={handleSupplierReturnSubmit} className="space-y-5">
                            {/* Supplier & PO select */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Fournisseur *</label>
                                    <SearchableSelect
                                        options={suppliers.map(s => ({
                                            label: `${s.name} (Solde dû: ${s.balance.toLocaleString()} DA)`,
                                            value: s.id
                                        }))}
                                        value={supplierId}
                                        onChange={setSupplierId}
                                        placeholder="Sélectionner un fournisseur..."
                                        searchPlaceholder="Rechercher un fournisseur..."
                                        emptyMessage="Aucun fournisseur trouvé."
                                        className="bg-slate-900 text-slate-200 border border-slate-800 focus:border-slate-700 rounded-xl h-9 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Bon d'Achat / Commande *</label>
                                    <SearchableSelect
                                        options={supplierPurchaseOrders.map(po => ({
                                            label: `${po.purchaseNumber || po.reference || `Bon #${po.id.substring(0,8)}`} (${new Date(po.createdAt).toLocaleDateString()} — Total: ${Number(po.total).toLocaleString()} DA — Payé: ${Number(po.amountPaid).toLocaleString()} DA)`,
                                            value: po.id
                                        }))}
                                        disabled={!supplierId}
                                        value={selectedPurchaseOrderId}
                                        onChange={setSelectedPurchaseOrderId}
                                        placeholder={!supplierId ? "Sélectionnez d'abord un fournisseur..." : "Sélectionner un bon..."}
                                        searchPlaceholder="Rechercher par référence..."
                                        emptyMessage="Aucun bon trouvé."
                                        className="bg-slate-900 text-slate-200 border border-slate-800 focus:border-slate-700 rounded-xl h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Products Bought Table */}
                            {selectedPurchaseOrder && (
                                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-900/10">
                                    <div className="p-3 bg-slate-900/50 border-b border-slate-900">
                                        <span className="text-[11px] font-bold text-pink-400 uppercase">Produits achetés du bon</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-900 text-slate-500 font-bold bg-slate-900/20">
                                                    <th className="p-3">Produit</th>
                                                    <th className="p-3">Codebarre</th>
                                                    <th className="p-3 text-center">Qté Achetée</th>
                                                    <th className="p-3 text-center">Retournée Précédemment</th>
                                                    <th className="p-3 text-center w-28">Qté à Retourner</th>
                                                    <th className="p-3 text-right">Coût U.</th>
                                                    <th className="p-3 text-right">Montant</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900">
                                                {selectedPurchaseOrder.items.map((item: any) => {
                                                    const previouslyReturned = selectedPurchaseOrder.supplierReturns
                                                        ?.filter((sr: any) => sr.productId === item.productId)
                                                        .reduce((sum: number, sr: any) => sum + sr.quantity, 0) || 0
                                                    
                                                    const maxQtyToReturn = Math.max(0, item.quantity - previouslyReturned)
                                                    const currentReturnQty = supplierReturnedQuantities[item.productId] || 0
                                                    const lineTotal = currentReturnQty * Number(item.costPrice)

                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-900/20 text-slate-300">
                                                            <td className="p-3 font-medium text-slate-200">{item.product?.name}</td>
                                                            <td className="p-3 text-slate-500">{item.product?.barcodes?.[0]?.value || "-"}</td>
                                                            <td className="p-3 text-center font-semibold text-slate-400">{item.quantity}</td>
                                                            <td className="p-3 text-center text-amber-500 font-semibold">{previouslyReturned}</td>
                                                            <td className="p-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={maxQtyToReturn}
                                                                    value={supplierReturnedQuantities[item.productId] ?? ""}
                                                                    onChange={(e) => {
                                                                        const val = Math.min(maxQtyToReturn, Math.max(0, parseInt(e.target.value) || 0))
                                                                        setSupplierReturnedQuantities(prev => ({
                                                                            ...prev,
                                                                            [item.productId]: val
                                                                        }))
                                                                    }}
                                                                    className="w-20 bg-slate-900 text-slate-100 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-xs outline-none focus:border-pink-500"
                                                                />
                                                            </td>
                                                            <td className="p-3 text-right text-slate-400">{Number(item.costPrice).toLocaleString()} DA</td>
                                                            <td className="p-3 text-right font-bold text-pink-400">{lineTotal.toLocaleString()} DA</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Store & Reason */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Dépôt / Magasin de déstockage</label>
                                    <select
                                        value={supplierStoreId}
                                        onChange={(e) => setSupplierStoreId(e.target.value)}
                                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700"
                                    >
                                        {stores.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Motif du Retour *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ex: Article défectueux, Erreur de commande..."
                                        value={supplierReason}
                                        onChange={(e) => setSupplierReason(e.target.value)}
                                        className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Summary and Financial Options */}
                            {selectedPurchaseOrder && supplierTotal > 0 && (
                                <div className="space-y-4">
                                    <div className="bg-pink-950/20 border border-pink-500/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Package className="h-5 w-5 text-pink-400" />
                                            <div>
                                                <span className="font-bold text-slate-200 block">Total Retour Marchandise</span>
                                                <span className="text-[10px] text-slate-500">
                                                    Défini à partir de la grille des quantités
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-pink-400">
                                                {supplierTotal.toLocaleString()} DA
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mode de Compensation / Remboursement */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Mode de Compensation</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer select-none transition-all ${
                                                !supplierRefundCash
                                                    ? "bg-pink-950/15 border-pink-500 text-white shadow-sm"
                                                    : "bg-slate-900/50 border-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="supplierRefundType"
                                                    checked={!supplierRefundCash}
                                                    onChange={() => setSupplierRefundCash(false)}
                                                    className="sr-only"
                                                />
                                                <FileText className="h-5 w-5 mb-1 text-pink-400" />
                                                <span className="text-xs font-bold">Déduire du solde (Dette)</span>
                                                <span className="text-[9px] text-slate-500 mt-0.5 text-center">Réduit ce que nous devons au fournisseur</span>
                                            </label>

                                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border select-none transition-all ${
                                                supplierMaxRefundCapacity <= 0 
                                                    ? "opacity-40 cursor-not-allowed bg-slate-950/30 border-slate-900 text-slate-600" 
                                                    : supplierRefundCash
                                                        ? "bg-pink-950/15 border-pink-500 text-white shadow-sm cursor-pointer"
                                                        : "bg-slate-900/50 border-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer"
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="supplierRefundType"
                                                    disabled={supplierMaxRefundCapacity <= 0}
                                                    checked={supplierRefundCash}
                                                    onChange={() => setSupplierRefundCash(true)}
                                                    className="sr-only"
                                                />
                                                <Wallet className="h-5 w-5 mb-1 text-pink-400" />
                                                <span className="text-xs font-bold">Récupérer Cash (Remboursement)</span>
                                                <span className="text-[9px] text-slate-500 mt-0.5 text-center">
                                                    Récupération en caisse (Max: {supplierMaxRefundCapacity.toLocaleString()} DA)
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Treasury Account select if refund is active */}
                                    {supplierRefundCash && supplierMaxRefundCapacity > 0 && (
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Caisse de Dépôt *</label>
                                            <select
                                                required
                                                value={supplierAccountId}
                                                onChange={(e) => setSupplierAccountId(e.target.value)}
                                                className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700"
                                            >
                                                <option value="">Sélectionnez un compte...</option>
                                                {accounts.map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name} (Solde actuel: {a.balance.toLocaleString()} DA)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes Internes */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Notes Internes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Notes de commentaires internes..."
                                    value={supplierNotes}
                                    onChange={(e) => setSupplierNotes(e.target.value)}
                                    className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-slate-700 resize-none"
                                />
                            </div>

                            {/* Feedback messages */}
                            {errorMsg && (
                                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {errorMsg}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    {successMsg}
                                </div>
                            )}

                            {/* Form actions */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
                                <button
                                    type="button"
                                    onClick={() => setIsSupplierModalOpen(false)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/10 transition-all"
                                >
                                    {loading ? "Enregistrement..." : "Enregistrer le Retour"}
                                </button>
                            </div>
                        </form>
                    </div>
                                                </div>
                                            )}

            {/* Modal: Edit Return */}
            {isEditModalOpen && editingReturn && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Edit3 className="h-5 w-5 text-purple-400" />
                            Modifier le Retour
                        </h3>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Motif *</label>
                                <input
                                    required
                                    type="text"
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    placeholder="Motif du retour..."
                                    className="w-full bg-slate-900 text-slate-200 border border-slate-800 focus:border-slate-700 rounded-xl px-3.5 py-2 text-xs outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Notes Internes</label>
                                <textarea
                                    rows={3}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Notes additionnelles..."
                                    className="w-full bg-slate-900 text-slate-200 border border-slate-800 focus:border-slate-700 rounded-xl px-3.5 py-2 text-xs outline-none resize-none"
                                />
                            </div>

                            {errorMsg && (
                                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {errorMsg}
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    {successMsg}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditModalOpen(false); setEditingReturn(null) }}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/10 transition-all"
                                >
                                    {loading ? "Modification..." : "Modifier"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Delete Confirmation */}
            {isDeleteConfirmOpen && deletingReturn && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-rose-500/20 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-400" />
                            Confirmer la Suppression
                        </h3>
                        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                            Êtes-vous sûr de vouloir supprimer ce retour de marchandise ?
                            Cette action est irréversible et va :
                        </p>
                        <ul className="list-disc pl-5 mb-4 space-y-1 text-slate-500 text-xs">
                            <li>Re-déduire les produits du stock (ou les re-créditer pour les retours fournisseurs).</li>
                            <li>Restaurer les soldes du client ou fournisseur si c'était un retour à crédit.</li>
                            <li>Restaurer les soldes de caisse et supprimer la transaction financière si c'était un retour en espèces (cash).</li>
                        </ul>

                        {errorMsg && (
                            <div className="p-3 mb-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {errorMsg}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 mb-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                {successMsg}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => { setIsDeleteConfirmOpen(false); setDeletingReturn(null) }}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleDeleteConfirm}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/10 transition-all"
                            >
                                {loading ? "Suppression..." : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
