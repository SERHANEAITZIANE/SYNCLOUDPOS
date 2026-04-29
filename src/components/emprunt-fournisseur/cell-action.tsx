"use client"

import { Edit, Trash } from "lucide-react"
import { useState } from "react"
import { useRouter } from "@/i18n/routing"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deletePayment, updatePayment } from "@/actions/payments"
import { SupplierLoanColumn } from "./columns"

interface CellActionProps {
    data: SupplierLoanColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const { data: session } = useSession()

    // Edit form state
    const [editAmount, setEditAmount] = useState(String(data.amount))
    const [editDescription, setEditDescription] = useState(data.description)
    const [editDate, setEditDate] = useState(data.date ? new Date(data.date).toISOString().slice(0, 10) : "")

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deletePayment(data.id)
            if (result && 'error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Emprunt fournisseur supprimé")
                setDeleteOpen(false)
                router.refresh()
            }
        } catch {
            toast.error("Erreur lors de la suppression")
        } finally {
            setLoading(false)
        }
    }

    const onEdit = async () => {
        try {
            setLoading(true)
            const amount = parseFloat(editAmount)
            if (isNaN(amount) || amount <= 0) {
                toast.error("Montant invalide")
                setLoading(false)
                return
            }
            const result = await updatePayment(data.id, {
                amount,
                description: editDescription,
                date: editDate || undefined,
            })
            if (result && 'error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Emprunt modifié")
                setEditOpen(false)
                router.refresh()
            }
        } catch {
            toast.error("Erreur lors de la modification")
        } finally {
            setLoading(false)
        }
    }

    const canEdit = session?.user?.canEdit || session?.user?.isSuperadmin || session?.user?.role === "ADMIN"
    const canDelete = session?.user?.canDelete || session?.user?.isSuperadmin || session?.user?.role === "ADMIN"

    return (
        <>
            {/* Delete Confirmation Modal */}
            {deleteOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setDeleteOpen(false) }}>
                    <div className="fixed inset-0 bg-black/50" />
                    <div className="relative z-[251] bg-background rounded-lg border shadow-lg p-6 w-full max-w-[400px] mx-4">
                        <h3 className="text-lg font-semibold">Êtes-vous sûr ?</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Cette action est irréversible. L'emprunt sera supprimé et les soldes seront recalculés.
                        </p>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>
                                Annuler
                            </Button>
                            <Button variant="destructive" onClick={onDelete} disabled={loading}>
                                {loading ? "Suppression..." : "Supprimer"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false) }}>
                    <div className="fixed inset-0 bg-black/50" />
                    <div className="relative z-[251] bg-background rounded-lg border shadow-lg p-6 w-full max-w-[425px] mx-4">
                        <div className="flex flex-col gap-2 mb-4">
                            <h3 className="text-lg font-semibold">Modifier l'emprunt fournisseur</h3>
                            <p className="text-sm text-muted-foreground">
                                Modifiez le montant, l'observation ou la date.
                            </p>
                        </div>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-amount-${data.id}`}>Montant (DA)</Label>
                                <Input
                                    id={`edit-amount-${data.id}`}
                                    type="number"
                                    step="0.01"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-desc-${data.id}`}>Observation</Label>
                                <Input
                                    id={`edit-desc-${data.id}`}
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Observation"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-date-${data.id}`}>Date</Label>
                                <Input
                                    id={`edit-date-${data.id}`}
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
                                Annuler
                            </Button>
                            <Button onClick={onEdit} disabled={loading}>
                                {loading ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </div>
                        <button
                            onClick={() => setEditOpen(false)}
                            className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1">
                {canEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => setEditOpen(true)}
                        title="Modifier"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
                {canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteOpen(true)}
                        title="Supprimer"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </>
    )
}
