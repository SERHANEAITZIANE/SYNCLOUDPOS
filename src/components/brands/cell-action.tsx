"use client"

import { Edit, Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

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
            const result = await deleteBrand(data.id)
            if (result?.error) {
                toast.error(result.error)
                return
            }
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
            <div className="flex items-center gap-1">
                {(!session?.user || session?.user?.role === "ADMIN" || session?.user?.isSuperadmin || session?.user?.canEdit !== false) && (
                    <Button
                        variant="ghost-warning"
                        size="icon-sm"
                        onClick={() => setEditOpen(true)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}

                {(!session?.user || session?.user?.role === "ADMIN" || session?.user?.isSuperadmin || session?.user?.canDelete !== false) && (
                    <Button
                        variant="ghost-danger"
                        size="icon-sm"
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
