"use client"

import { Edit, Trash, ScrollText } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

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
            const result = await deleteSupplier(data.id)
            if (result?.error) {
                toast.error(result.error)
                return
            }
            toast.success("Fournisseur supprimé.")
            router.refresh()
        } catch {
            toast.error("Erreur lors de la suppression.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost-info"
                size="icon-sm"
                onClick={() => router.push(`/suppliers/${data.id}/ledger`)}
                title="Historique"
            >
                <ScrollText className="h-4 w-4" />
            </Button>

            {(!session?.user || session?.user?.role === "ADMIN" || session?.user?.isSuperadmin || session?.user?.canEdit !== false) && (
                <Button
                    variant="ghost-warning"
                    size="icon-sm"
                    onClick={() => router.push(`/suppliers/${data.id}`)}
                    title={tCommon("edit")}
                >
                    <Edit className="h-4 w-4" />
                </Button>
            )}

            {(!session?.user || session?.user?.role === "ADMIN" || session?.user?.isSuperadmin || session?.user?.canDelete !== false) && (
                <Button
                    variant="ghost-danger"
                    size="icon-sm"
                    onClick={onConfirm}
                    disabled={loading}
                    title={tCommon("delete")}
                >
                    <Trash className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
