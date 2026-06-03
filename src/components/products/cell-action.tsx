"use client"

import { Edit, Trash, History, ArrowRightLeft, MoreHorizontal } from "lucide-react"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"

import { deleteProduct } from "@/actions/products"
import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/modals/alert-modal"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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
    const [open, setOpen] = useState(false)
    const [openHistory, setOpenHistory] = useState(false)
    const { data: session } = useSession()

    const onConfirm = async () => {
        try {
            setLoading(true)
            await deleteProduct(data.id)
            toast.success(t("messages.deleted"))
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(t("messages.error"))
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onConfirm}
                loading={loading}
            />
            <StockHistoryModal
                isOpen={openHistory}
                onClose={() => setOpenHistory(false)}
                productId={data.id}
                productName={data.name}
            />
            <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all"
                                onClick={() => setOpenHistory(true)}
                            >
                                <History className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            {t("stockHistoryLabel")}
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-lg transition-all"
                                onClick={() => router.push(`/products/${data.id}/movements`)}
                            >
                                <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            Mouvements de Stock
                        </TooltipContent>
                    </Tooltip>

                    {session?.user?.canEdit && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-all"
                                    onClick={() => router.push(`/products/${data.id}`)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {tCommon("edit")}
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {session?.user?.canDelete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                                    onClick={() => setOpen(true)}
                                    disabled={loading}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {tCommon("delete")}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TooltipProvider>
        </>
    )
}
