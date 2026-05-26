"use client"

import { useState, useEffect } from "react"
import { getDeliveryShipments, createDeliveryShipment, updateShipmentStatus, syncShipmentStatuses } from "@/actions/delivery"
import { WILAYAS } from "@/lib/wilayas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "react-hot-toast"
import { Plus, Truck, Package, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const PROVIDERS = [
    { id: "YALIDINE", name: "🚀 Yalidine", color: "text-blue-600" },
    { id: "DHD", name: "🟡 DHD Livraison", color: "text-yellow-600" },
    { id: "HDD", name: "🔴 HDD Express", color: "text-red-600" },
    { id: "PROCOLIS", name: "🟢 Procolis", color: "text-green-600" },
    { id: "ZR_EXPRESS", name: "🟣 Zr Express", color: "text-purple-600" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING: { label: "En attente", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    SENT: { label: "Envoyé", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    IN_TRANSIT: { label: "En transit", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    DELIVERED: { label: "Livré", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    RETURNED: { label: "Retourné", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}



const emptyForm = {
    provider: "YALIDINE",
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    wilaya: "16",
    commune: "",
    weight: 0.5,
    codAmount: 0,
    notes: ""
}

export default function DeliveryPage() {
    const [shipments, setShipments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)
    
    // Pagination state
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const PAGE_SIZE = 50

    const load = async (pageNum = page) => {
        setLoading(true)
        const response = await getDeliveryShipments(pageNum, PAGE_SIZE)
        setShipments(response.data || [])
        setTotalCount(response.total || 0)
        setTotalPages(Math.ceil((response.total || 0) / PAGE_SIZE) || 1)
        setPage(pageNum)
        setLoading(false)
    }

    useEffect(() => { load(1) }, [])

    const handleSync = async () => {
        setSyncing(true)
        try {
            const result = await syncShipmentStatuses()
            if ("error" in result && result.error) {
                toast.error(result.error as string)
            } else {
                toast.success(result.message || "Synchronisation terminée")
                load()
            }
        } catch {
            toast.error("Erreur lors de la synchronisation")
        }
        setSyncing(false)
    }

    const handleCreate = async () => {
        if (!form.customerName || !form.customerPhone || !form.customerAddress) {
            return toast.error("Remplissez le nom, téléphone et adresse du client")
        }
        setSaving(true)
        const result = await createDeliveryShipment(form)
        if ("error" in result && result.error) {
            toast.error(result.error)
        } else {
            if (result.trackingCode) {
                toast.success(`📦 Colis créé — Suivi: ${result.trackingCode}`)
            } else if (result.apiError) {
                toast.success("Colis enregistré localement (API indisponible)")
            } else {
                toast.success("Colis créé avec succès")
            }
            setOpen(false)
            setForm(emptyForm)
            load()
        }
        setSaving(false)
    }

    const stats = {
        total: shipments.length,
        sent: shipments.filter(s => s.status === "SENT" || s.status === "IN_TRANSIT").length,
        delivered: shipments.filter(s => s.status === "DELIVERED").length,
        returned: shipments.filter(s => s.status === "RETURNED").length,
    }

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Expéditions Livraison</h1>
                    <p className="text-muted-foreground mt-1">Yalidine · DHD · HDD · Procolis · Zr Express</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2 rounded-xl">
                        <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
                        {syncing ? "Sync..." : "Sync API"}
                    </Button>
                    <Button variant="outline" onClick={() => load()} className="gap-2 rounded-xl">
                        <RefreshCw size={14} />
                    </Button>
                    <Button onClick={() => setOpen(true)} className="gap-2 rounded-xl">
                        <Plus size={16} /> Nouveau colis
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total", value: stats.total, color: "text-foreground" },
                    { label: "En cours", value: stats.sent, color: "text-blue-600" },
                    { label: "Livrés", value: stats.delivered, color: "text-green-600" },
                    { label: "Retournés", value: stats.returned, color: "text-red-600" },
                ].map(s => (
                    <div key={s.label} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                        <p className={cn("text-3xl font-black mt-1", s.color)}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {loading ? (
                    <div className="py-20 text-center text-muted-foreground">Chargement...</div>
                ) : shipments.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Aucune expédition enregistrée</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Transporteur</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Wilaya</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Commande</th>
                                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">COD</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Tracking</th>
                                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Statut</th>
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                                    <th className="px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.map((s, i) => {
                                    const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDING
                                    const providerName = PROVIDERS.find(p => p.id === s.provider)?.name || s.provider
                                    return (
                                        <tr key={s.id} className={`border-t border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? "" : "bg-gray-50/40 dark:bg-gray-900/40"}`}>
                                            <td className="px-5 py-3 font-semibold text-xs">{providerName}</td>
                                            <td className="px-5 py-3">
                                                <p className="font-medium">{s.customerName}</p>
                                                <p className="text-xs text-muted-foreground">{s.customerPhone}</p>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-muted-foreground">{s.wilaya}</td>
                                            <td className="px-5 py-3 text-xs">
                                                {s.salesOrder ? (
                                                    <a href={`/sales/${s.salesOrder.id}`} className="text-blue-600 hover:underline font-medium">
                                                        {s.salesOrder.receiptNumber}
                                                    </a>
                                                ) : "—"}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono font-semibold">{s.codAmount > 0 ? `${s.codAmount.toLocaleString("fr-DZ")} DA` : "—"}</td>
                                            <td className="px-5 py-3 text-center text-xs font-mono text-blue-600">{s.trackingCode || "—"}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", cfg.color)}>{cfg.label}</span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd/MM/yy HH:mm")}</td>
                                            <td className="px-5 py-3">
                                                <Select value={s.status} onValueChange={async v => { await updateShipmentStatus(s.id, v); load() }}>
                                                    <SelectTrigger className="h-8 w-32 text-xs rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                                            <SelectItem key={k} value={k} className="text-xs">{cfg.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-muted-foreground">
                        Affichage de <span className="font-bold">{(page - 1) * PAGE_SIZE + 1}</span> à <span className="font-bold">{Math.min(page * PAGE_SIZE, totalCount)}</span> sur <span className="font-bold">{totalCount}</span> colis
                    </p>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => load(page - 1)} 
                            disabled={page <= 1 || loading}
                            className="rounded-lg"
                        >
                            Précédent
                        </Button>
                        <div className="flex items-center justify-center px-4 text-sm font-medium">
                            Page {page} sur {totalPages}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => load(page + 1)} 
                            disabled={page >= totalPages || loading}
                            className="rounded-lg"
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Truck size={18} /> Nouveau Colis</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1.5">
                            <Label>Transporteur</Label>
                            <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v }))}>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PROVIDERS.filter(p => !["PROCOLIS", "ZR_EXPRESS"].includes(p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Nom client</Label>
                                <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Téléphone</Label>
                                <Input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Adresse</Label>
                            <Input value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Wilaya</Label>
                                <Select value={form.wilaya} onValueChange={v => setForm(f => ({ ...f, wilaya: v }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-52">
                                        {WILAYAS.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Commune</Label>
                                <Input value={form.commune} onChange={e => setForm(f => ({ ...f, commune: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Poids (kg)</Label>
                                <Input type="number" step="0.1" min={0.1} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Montant à encaisser (DA)</Label>
                                <Input type="number" min={0} value={form.codAmount} onChange={e => setForm(f => ({ ...f, codAmount: Number(e.target.value) }))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Contenu / Notes</Label>
                            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Description du colis..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreate} disabled={saving}>{saving ? "Envoi..." : "Créer le colis"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
