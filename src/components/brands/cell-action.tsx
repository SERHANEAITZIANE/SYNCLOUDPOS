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
import { BrandColumn } from "./columns"
import { BrandModal } from "./brand-modal"
import { useSession } from "next-auth/react"
import { deleteBrand } from "@/actions/brands"

interface CellActionProps {
    data: BrandColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [editOpen, setEditOpen] = useState(false)
    const tCommon = useTranslations("Common")
    const { data: session } = useSession()

    const onDelete = async () => {
        try {
            await deleteBrand(data.id)
            toast.success("Marque supprimée.")
            router.refresh()
        } catch {
            toast.error("Erreur lors de la suppression.")
        }
    }

    return (
        <>
            <BrandModal
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

                    {session?.user?.canEdit && (
                        <DropdownMenuItem onClick={() => setEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> {tCommon("edit")}
                        </DropdownMenuItem>
                    )}

                    {session?.user?.canDelete && (
                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> {tCommon("delete")}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
