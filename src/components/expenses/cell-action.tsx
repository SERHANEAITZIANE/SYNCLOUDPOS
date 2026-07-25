"use client"

import { Edit, Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/modals/alert-modal"
import { deleteExpense } from "@/actions/expenses"
import { ExpenseColumn } from "./types"

import { useSession } from "next-auth/react"

interface CellActionProps {
    data: ExpenseColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const t = useTranslations("Expenses")
    const tCommon = useTranslations("Common")
    const { data: session } = useSession()

    const user = session?.user
    const canEdit = !user || user.role === "ADMIN" || user.role === "MANAGER" || user.isSuperadmin || user.canEdit !== false
    const canDelete = !user || user.role === "ADMIN" || user.role === "MANAGER" || user.isSuperadmin || user.canDelete !== false

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deleteExpense(data.id)
            if (result && 'error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success(t("messages.deleted"))
                router.refresh()
            }
        } catch {
            toast.error(t("messages.error"))
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    return (
        <>
            <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
            <div className="flex items-center gap-1">
                {canEdit && (
                    <Button
                        variant="ghost-warning"
                        size="icon-sm"
                        onClick={() => router.push(`/expenses/${data.id}`)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
                {canDelete && (
                    <Button
                        variant="ghost-danger"
                        size="icon-sm"
                        onClick={() => setOpen(true)}
                        title={tCommon("delete")}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </>
    )
}
