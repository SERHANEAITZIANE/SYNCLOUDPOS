"use client"

import { Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/modals/alert-modal"
import { deleteSpoilage } from "@/actions/spoilage"
import { SpoilageColumn } from "./columns"

interface CellActionProps {
    data: SpoilageColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const onDelete = async () => {
        try {
            setLoading(true)
            const result = await deleteSpoilage(data.id)
            if (result && 'error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Avarie supprimée avec succès")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue lors de la suppression.")
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    return (
        <>
            <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
            <div className="flex items-center gap-1 justify-end">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => setOpen(true)}
                    title="Supprimer"
                >
                    <Trash className="h-4 w-4" />
                </Button>
            </div>
        </>
    )
}
