"use client"

import { Edit, Trash, FileText } from "lucide-react"
import { useState } from "react"
import { useRouter } from "@/i18n/routing"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deletePayment, updatePayment } from "@/actions/payments"
import { PaymentColumn } from "./columns"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { FichePaiementModal } from "./fiche-modal"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface CellActionProps {
    data: PaymentColumn
    accounts: { id: string; name: string; type: string }[]
}

export const CellAction: React.FC<CellActionProps> = ({ data, accounts }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [ficheOpen, setFicheOpen] = useState(false)
    const { data: session } = useSession()

    // Edit form state
    const [editAmount, setEditAmount] = useState(String(data.amount))
    const [editDescription, setEditDescription] = useState(data.description || "")
    const [editDate, setEditDate] = useState(data.date ? new Date(data.date).toISOString().slice(0, 10) : "")
    const [editAccountId, setEditAccountId] = useState(data.accountId || "")

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deletePayment(data.id)
            if ('error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Paiement supprimé")
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
            if (!editAccountId) {
                toast.error("Veuillez sélectionner une caisse/banque")
                setLoading(false)
                return
            }
            const result = await updatePayment(data.id, {
                amount,
                description: editDescription,
                date: editDate || undefined,
                accountId: editAccountId,
            })
            if ('error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Paiement modifié")
                setEditOpen(false)
                setFicheOpen(true)
                router.refresh()
            }
        } catch {
            toast.error("Erreur lors de la modification")
        } finally {
            setLoading(false)
        }
    }

    const user = session?.user
    const canEdit = !user || user.role === "ADMIN" || user.isSuperadmin || user.canEdit !== false
    const canDelete = !user || user.role === "ADMIN" || user.isSuperadmin || user.canDelete !== false

    return (
        <>
            {/* Delete Confirmation Modal */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Êtes-vous sûr ?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                            Cette action est irréversible. Le paiement sera supprimé et les soldes seront recalculés.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button 
                            variant="outline" 
                            onClick={() => setDeleteOpen(false)} 
                            disabled={loading}
                            className="border-zinc-300 dark:border-zinc-700"
                        >
                            Annuler
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={onDelete} 
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {loading ? "Suppression..." : "Supprimer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Modifier le paiement
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Modifiez le montant, la caisse, la description ou la date.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor={`edit-amount-${data.id}`} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Montant (DA)
                            </Label>
                            <Input
                                id={`edit-amount-${data.id}`}
                                type="number"
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Caisse / Banque
                            </Label>
                            <SearchableSelect
                                options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type === 'BANK' ? 'Banque' : 'Caisse'})` }))}
                                value={editAccountId}
                                onChange={setEditAccountId}
                                placeholder="Sélectionner une caisse"
                                searchPlaceholder="Rechercher une caisse..."
                                className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor={`edit-desc-${data.id}`} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Observation / Description
                            </Label>
                            <Input
                                id={`edit-desc-${data.id}`}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description du paiement"
                                className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor={`edit-date-${data.id}`} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Date
                            </Label>
                            <Input
                                id={`edit-date-${data.id}`}
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <Button 
                            variant="outline" 
                            onClick={() => setEditOpen(false)} 
                            disabled={loading}
                            className="border-zinc-300 dark:border-zinc-700"
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={onEdit} 
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
                        >
                            {loading ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Fiche / Reçu de Paiement Modal */}
            <FichePaiementModal
                open={ficheOpen}
                onClose={() => setFicheOpen(false)}
                data={{
                    id: data.id,
                    date: editDate || data.date,
                    amount: parseFloat(editAmount) || data.amount,
                    customerName: data.customerName,
                    accountName: accounts.find(a => a.id === editAccountId)?.name || data.accountName,
                    description: editDescription || data.description,
                    source: data.source,
                }}
            />

            <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost-success"
                                size="icon-sm"
                                className="rounded-lg transition-all"
                                onClick={() => setFicheOpen(true)}
                            >
                                <FileText className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            Fiche / Reçu de paiement
                        </TooltipContent>
                    </Tooltip>

                    {canEdit && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost-warning"
                                    size="icon-sm"
                                    className="rounded-lg transition-all"
                                    onClick={() => setEditOpen(true)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                Modifier le paiement
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {canDelete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost-danger"
                                    size="icon-sm"
                                    className="rounded-lg transition-all"
                                    onClick={() => setDeleteOpen(true)}
                                    disabled={loading}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                Supprimer le paiement
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TooltipProvider>
        </>
    )
}
