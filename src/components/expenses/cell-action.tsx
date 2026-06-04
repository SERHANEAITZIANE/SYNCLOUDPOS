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

    const canEdit = session?.user?.canEdit || session?.user?.isSuperadmin || session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER"
    const canDelete = session?.user?.canDelete || session?.user?.isSuperadmin || session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER"

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
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => router.push(`/expenses/${data.id}`)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
                {canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
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
