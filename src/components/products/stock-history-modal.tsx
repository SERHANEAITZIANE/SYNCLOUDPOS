"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowDownRight, ArrowUpRight, History, Loader2, RefreshCcw, Tag } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getStockMovements } from "@/actions/stock-movements"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslations } from "next-intl"

interface StockHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    productId: string
    productName: string
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
    isOpen,
    onClose,
    productId,
    productName
}) => {
    const [loading, setLoading] = useState(false)
    const [movements, setMovements] = useState<any[]>([])
    const t = useTranslations("Products.stockHistory")

    useEffect(() => {
        if (isOpen) {
            fetchMovements()
        }
    }, [isOpen, productId])

    const fetchMovements = async () => {
        setLoading(true)
        const res = await getStockMovements(productId)
        if (res?.movements) {
            setMovements(res.movements)
        }
        setLoading(false)
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case "PURCHASE":
            case "RETURN":
            case "INITIAL":
                return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            case "SALE":
            case "SPOILAGE":
                return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
            case "ADJUSTMENT":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            default:
                return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"
        }
    }

    const getTypeLabel = (type: string) => {
        return t(`types.${type}`) || type
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <History className="h-5 w-5" />
                        {t("title")}
                    </DialogTitle>
                    <div className="text-sm text-muted-foreground font-medium mt-1">
                        {t("product")} <span className="text-foreground">{productName}</span>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 bg-slate-50/50 dark:bg-slate-900/20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <History className="h-12 w-12 mb-4 opacity-20" />
                            <p>{t("noMovements")}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {movements.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="flex items-start justify-between p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm"
                                    >
                                        <div className="flex gap-4">
                                            <div className={`mt-0.5 p-2 rounded-full ${movement.quantity > 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                                {movement.quantity > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                        {getTypeLabel(movement.type)}
                                                    </span>
                                                    <Badge variant="secondary" className={getTypeColor(movement.type)}>
                                                        {movement.type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-500 max-w-md">
                                                    {movement.reason || t("systemMovement")}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                    <span>{format(new Date(movement.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                                                    {movement.user?.name && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{t("by")} {movement.user.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`text-lg font-black ${movement.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                <RefreshCcw className="h-3 w-3" />
                                                <span>{movement.stockBefore}</span>
                                                <span className="mx-1">→</span>
                                                <span className="text-slate-900 dark:text-slate-100">{movement.stockAfter}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
