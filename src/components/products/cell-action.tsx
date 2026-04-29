"use client"

import { Edit, Trash, History } from "lucide-react"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { useTranslations } from "next-intl"

import { deleteProduct } from "@/actions/products"
import { Button } from "@/components/ui/button"
import { ProductColumn } from "./columns"
import { StockHistoryModal } from "./stock-history-modal"

interface CellActionProps {
    data: ProductColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const params = useParams()
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")
    const [loading, setLoading] = useState(false)
    const [openHistory, setOpenHistory] = useState(false)
    const { data: session } = useSession()

    const onConfirm = async () => {
        try {
            setLoading(true)
            await deleteProduct(data.id)
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <StockHistoryModal
                isOpen={openHistory}
                onClose={() => setOpenHistory(false)}
                productId={data.id}
                productName={data.name}
            />
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => setOpenHistory(true)}
                    title={t("stockHistoryLabel")}
                >
                    <History className="h-4 w-4" />
                </Button>

                {session?.user?.canEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => router.push(`/products/${data.id}`)}
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
                        onClick={onConfirm}
                        disabled={loading}
                        title={tCommon("delete")}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </>
    )
}
