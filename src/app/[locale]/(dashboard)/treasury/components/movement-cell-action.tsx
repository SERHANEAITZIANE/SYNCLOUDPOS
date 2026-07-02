"use client"

import { Edit, MoreHorizontal, Trash } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { AlertModal } from "@/components/modals/alert-modal"
import { deleteManualTransaction } from "@/actions/treasury"
import { TransactionModal } from "./transaction-modal"

interface MovementCellActionProps {
    data: any
    accounts: any[]
}

export const MovementCellAction: React.FC<MovementCellActionProps> = ({ data, accounts }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [openDelete, setOpenDelete] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)

    // Only allow editing MANUAL_IN or MANUAL_OUT
    const isManual = data.source === "MANUAL_IN" || data.source === "MANUAL_OUT"

    const onDelete = async () => {
        try {
            setLoading(true)
            const res = await deleteManualTransaction(data.id)
            if (res.error) throw new Error(res.error)
            toast.success("Transaction supprimée.")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Une erreur est survenue.")
        } finally {
            setLoading(false)
            setOpenDelete(false)
        }
    }

    if (!isManual) return null

    return (
        <>
            <AlertModal
                isOpen={openDelete}
                onClose={() => setOpenDelete(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <TransactionModal
                isOpen={openEdit}
                onClose={() => setOpenEdit(false)}
                accounts={accounts}
                initialData={{
                    id: data.id,
                    accountId: data.accountId || data.accountName, // Might need to pass actual accountId from server
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    createdAt: data.rawDate || data.date
                }}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenDelete(true)} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
