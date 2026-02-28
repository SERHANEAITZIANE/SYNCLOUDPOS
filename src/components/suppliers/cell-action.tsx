"use client"

import { Edit, MoreHorizontal, Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { SupplierColumn } from "./types"
import { deleteSupplier } from "@/actions/suppliers"

import { useSession } from "next-auth/react"

interface CellActionProps {
    data: SupplierColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const tCommon = useTranslations("Common")
    const { data: session } = useSession()

    const onConfirm = async () => {
        try {
            setLoading(true)
            await deleteSupplier(data.id)
            toast.success("Fournisseur supprimé.")
            router.refresh()
        } catch {
            toast.error("Erreur lors de la suppression.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">{tCommon("actions")}</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>

                {session?.user?.canEdit && (
                    <DropdownMenuItem onClick={() => router.push(`/suppliers/${data.id}`)}>
                        <Edit className="mr-2 h-4 w-4" /> {tCommon("edit")}
                    </DropdownMenuItem>
                )}

                {session?.user?.canDelete && (
                    <DropdownMenuItem onClick={onConfirm} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> {tCommon("delete")}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
