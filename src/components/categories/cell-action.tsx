"use client"

import { Edit, Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { CategoryColumn } from "./columns"
import { CategoryModal } from "./category-modal"
import { useSession } from "next-auth/react"
import { deleteCategory } from "@/actions/categories"

interface CellActionProps {
    data: CategoryColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [editOpen, setEditOpen] = useState(false)
    const tCommon = useTranslations("Common")
    const { data: session } = useSession()

    const onDelete = async () => {
        try {
            await deleteCategory(data.id)
            toast.success("Catégorie supprimée.")
            router.refresh()
        } catch {
            toast.error("Erreur lors de la suppression.")
        }
    }

    return (
        <>
            <CategoryModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                initialData={data}
                onConfirm={() => { setEditOpen(false); router.refresh() }}
            />
            <div className="flex items-center gap-1">
                {session?.user?.canEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => setEditOpen(true)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}

                {session?.user?.canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={onDelete}
                        title={tCommon("delete")}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </>
    )
}
