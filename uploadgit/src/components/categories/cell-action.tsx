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
import { CategoryColumn } from "./columns"
import { CategoryModal } from "./category-modal"
import { deleteCategory } from "@/actions/categories"

interface CellActionProps {
    data: CategoryColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [editOpen, setEditOpen] = useState(false)
    const tCommon = useTranslations("Common")

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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{tCommon("actions")}</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> {tCommon("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> {tCommon("delete")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
