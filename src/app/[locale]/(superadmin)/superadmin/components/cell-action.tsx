"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, ShieldCheck, Clock, KeyRound, ShieldOff, Download } from "lucide-react"
import { toast } from "react-hot-toast"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateTenantSubscription, toggleTenantBlock, resetUserPassword } from "@/actions/superadmin"
import { TenantColumn } from "./columns"

interface CellActionProps {
    data: TenantColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [resetOpen, setResetOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState("")
    const [newPassword, setNewPassword] = useState("")

    const onExtend = async (months: number) => {
        try {
            setLoading(true)
            const result = await updateTenantSubscription(data.id, months)
            if (result.success) {
                toast.success(result.success)
                router.refresh()
            } else {
                toast.error(result.error || "Une erreur s'est produite")
            }
        } catch {
            toast.error("Erreur système")
        } finally {
            setLoading(false)
        }
    }

    const onToggleBlock = async () => {
        try {
            setLoading(true)
            const result = await toggleTenantBlock(data.id, !data.isBlocked)
            if (result.success) {
                toast.success(result.success)
                router.refresh()
            } else {
                toast.error(result.error || "Une erreur s'est produite")
            }
        } catch {
            toast.error("Erreur système")
        } finally {
            setLoading(false)
        }
    }

    const onDownloadDB = () => {
        const url = `/api/superadmin/export-tenant?tenantId=${data.id}`
        const a = document.createElement("a")
        a.href = url
        a.download = `backup-${data.name}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success("Export en cours...")
    }

    const onOpenResetPw = (userId: string) => {
        setSelectedUserId(userId)
        setNewPassword("")
        setResetOpen(true)
    }

    const onResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Minimum 6 caractères")
            return
        }
        try {
            setLoading(true)
            const result = await resetUserPassword(selectedUserId, newPassword)
            if (result.success) {
                toast.success(result.success)
                setResetOpen(false)
            } else {
                toast.error(result.error || "Erreur")
            }
        } catch {
            toast.error("Erreur système")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Abonnement</DropdownMenuLabel>
                    <DropdownMenuItem disabled={loading} onClick={() => onExtend(1)}>
                        <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                        Prolonger 1 Mois
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={loading} onClick={() => onExtend(6)}>
                        <Clock className="mr-2 h-4 w-4 text-emerald-500" />
                        Prolonger 6 Mois
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={loading} onClick={() => onExtend(12)}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                        Prolonger 1 An
                    </DropdownMenuItem>
                    <div className="h-px bg-slate-200 my-1" />
                    <DropdownMenuLabel>Utilisateurs</DropdownMenuLabel>
                    {data.users && data.users.map(u => (
                        <DropdownMenuItem key={u.id} onClick={() => onOpenResetPw(u.id)}>
                            <KeyRound className="mr-2 h-4 w-4 text-blue-500" />
                            <span className="truncate max-w-[140px]">MdP: {u.name || u.email}</span>
                        </DropdownMenuItem>
                    ))}
                    <div className="h-px bg-slate-200 my-1" />
                    <DropdownMenuItem onClick={onDownloadDB}>
                        <Download className="mr-2 h-4 w-4 text-blue-500" />
                        Télécharger la DB
                    </DropdownMenuItem>
                    <div className="h-px bg-slate-200 my-1" />
                    <DropdownMenuItem disabled={loading} onClick={onToggleBlock}>
                        <ShieldOff className={`mr-2 h-4 w-4 ${data.isBlocked ? 'text-emerald-500' : 'text-red-500'}`} />
                        {data.isBlocked ? "Débloquer l'Espace" : "Bloquer l'Espace"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Reset Password Dialog */}
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label>Nouveau mot de passe</Label>
                        <Input
                            type="password"
                            placeholder="Minimum 6 caractères"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetOpen(false)}>Annuler</Button>
                        <Button disabled={loading} onClick={onResetPassword}>
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
