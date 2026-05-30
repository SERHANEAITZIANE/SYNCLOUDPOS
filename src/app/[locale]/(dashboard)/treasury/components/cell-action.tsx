"use client"

import { Copy, MoreHorizontal, Trash, Eye, Edit } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { AlertModal } from "@/components/modals/alert-modal"
import { deleteTreasuryAccount } from "@/actions/treasury"
import { TreasuryAccountColumn } from "./types"
import { AccountModal } from "./account-modal"

interface CellActionProps {
    data: TreasuryAccountColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id)
        toast.success("Account ID copied to clipboard.")
    }

    const onDelete = async () => {
        try {
            setLoading(true)
            await deleteTreasuryAccount(data.id)
            router.refresh()
            toast.success("Compte supprimé.")
        } catch (_error) {
            toast.error("Une erreur est survenue.")
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <AccountModal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false)
                    router.refresh()
                }}
                initialData={data}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <DropdownMenuLabel className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2">
                        Actions
                    </DropdownMenuLabel>
                    <DropdownMenuItem 
                        onClick={() => setIsEditOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                        <Edit className="h-4 w-4 text-slate-500" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => router.push(`/treasury/${data.id}`)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                        <Eye className="h-4 w-4 text-slate-500" /> Logs (Mouvements)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => onCopy(data.id)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                        <Copy className="h-4 w-4 text-slate-500" /> Copier l'ID
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => setOpen(true)} 
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold cursor-pointer rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-rose-600"
                    >
                        <Trash className="h-4 w-4" /> Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
