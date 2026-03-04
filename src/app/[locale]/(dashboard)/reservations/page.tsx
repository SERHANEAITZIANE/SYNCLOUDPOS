"use client"

import { useState, useEffect } from "react"
import { getReservations, createReservation, updateReservationStatus, deleteReservation } from "@/actions/reservations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "react-hot-toast"
import { Plus, Trash2, Check, X, Package } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING: { label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    CONFIRMED: { label: "Confirmée", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    FULFILLED: { label: "Livrée", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

function fmt(n: number) {
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2 }).format(n) + " DA"
}

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({ productId: "", customerId: "", quantity: 1, depositAmount: 0, totalAmount: 0, dueDate: "", notes: "" })
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        const data = await getReservations()
        setReservations(data)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const handleCreate = async () => {
        if (!form.productId) return toast.error("Sélectionnez un produit")
        setSaving(true)
        const result = await createReservation(form)
        if ("error" in result && result.error) toast.error(result.error)
        else { toast.success("Réservation créée"); setOpen(false); load() }
        setSaving(false)
    }

    const handleStatus = async (id: string, status: string) => {
        await updateReservationStatus(id, status)
        toast.success("Statut mis à jour")
        load()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cette réservation ?")) return
        await deleteReservation(id)
        toast.success("Réservation supprimée")
        load()
    }

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Réservations</h1>
                    <p className="text-muted-foreground mt-1">Produits réservés avec acompte versé</p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2 rounded-xl">
                    <Plus size={16} /> Nouvelle réservation
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                    const count = reservations.filter(r => r.status === status).length
                    const total = reservations.filter(r => r.status === status).reduce((s, r) => s + r.depositAmount, 0)
                    return (
                        <div key={status} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
                            <p className="text-2xl font-black mt-1">{count}</p>
                            <p className="text-xs text-muted-foreground mt-1">{fmt(total)} acomptes</p>
                        </div>
                    )
                })}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {loading ? (
                    <div className="py-20 text-center text-muted-foreground">Chargement...</div>
                ) : reservations.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Aucune réservation</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Produit</th>
                                <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Client</th>
                                <th className="px-5 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Qté</th>
                                <th className="px-5 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Acompte</th>
                                <th className="px-5 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                                <th className="px-5 py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Statut</th>
                                <th className="px-5 py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Échéance</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.map((r, i) => {
                                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING
                                return (
                                    <tr key={r.id} className={`border-t border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? "" : "bg-gray-50/40 dark:bg-gray-900/40"}`}>
                                        <td className="px-5 py-4 font-semibold">{r.product?.name || "—"}</td>
                                        <td className="px-5 py-4 text-muted-foreground">{r.customer?.name || "Anonyme"}</td>
                                        <td className="px-5 py-4 text-right">{r.quantity}</td>
                                        <td className="px-5 py-4 text-right font-mono font-bold text-emerald-600">{fmt(r.depositAmount)}</td>
                                        <td className="px-5 py-4 text-right font-mono">{fmt(r.totalAmount)}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", cfg.color)}>{cfg.label}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center text-xs text-muted-foreground">
                                            {r.dueDate ? format(new Date(r.dueDate), "dd MMM yyyy", { locale: fr }) : "—"}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1 justify-end">
                                                {r.status === "PENDING" && (
                                                    <button onClick={() => handleStatus(r.id, "CONFIRMED")} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Confirmer">
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                {r.status === "CONFIRMED" && (
                                                    <button onClick={() => handleStatus(r.id, "FULFILLED")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Marquer livré">
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                {r.status !== "CANCELLED" && r.status !== "FULFILLED" && (
                                                    <button onClick={() => handleStatus(r.id, "CANCELLED")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Annuler">
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nouvelle Réservation</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1.5">
                            <Label>ID Produit</Label>
                            <Input placeholder="ex: product-id-here" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} />
                            <p className="text-xs text-muted-foreground">Copiez l'ID du produit depuis la liste des produits</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>ID Client (optionnel)</Label>
                            <Input placeholder="ex: customer-id-here" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Quantité</Label>
                                <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Acompte (DA)</Label>
                                <Input type="number" min={0} value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: Number(e.target.value) }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Total attendu (DA)</Label>
                                <Input type="number" min={0} value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Date limite</Label>
                                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notes</Label>
                            <Input placeholder="Détails de la réservation..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreate} disabled={saving}>{saving ? "Enregistrement..." : "Créer"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
