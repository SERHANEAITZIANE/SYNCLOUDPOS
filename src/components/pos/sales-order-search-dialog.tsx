"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Search, Loader2, Ban } from "lucide-react"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchRecentSalesOrders } from "@/actions/sales-orders"

interface SalesOrderSearchDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelectOrder: (order: any) => void
}

export const SalesOrderSearchDialog: React.FC<SalesOrderSearchDialogProps> = ({
    isOpen,
    onClose,
    onSelectOrder
}) => {
    const t = useTranslations("SalesOrderSearchDialog")
    const [query, setQuery] = useState("")
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch initial recent orders when dialog opens
    useEffect(() => {
        if (isOpen) {
            fetchInitialOrders()
        } else {
            setQuery("")
        }
    }, [isOpen])

    const fetchInitialOrders = async () => {
        setLoading(true)
        try {
            // Fetch top 50 recent orders without a specific query
            const results = await searchRecentSalesOrders("", "ORDER")
            setOrders(results)
        } catch (error) {
            console.error("Failed to fetch orders", error)
        } finally {
            setLoading(false)
        }
    }

    // Client-side filtering
    const filteredOrders = orders.filter((order) => {
        const normalizedQuery = query.toLowerCase()
        const matchesReceipt = order.receiptNumber?.toLowerCase().includes(normalizedQuery)
        const matchesCustomer = order.customer?.name?.toLowerCase().includes(normalizedQuery)
        return matchesReceipt || matchesCustomer
    })

    return (
        <Modal
            title={t("title")}
            description={t("description")}
            isOpen={isOpen}
            onClose={onClose}
        >
            <div className="flex flex-col space-y-4 max-h-[70vh]">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={t("searchPlaceholder")}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9 h-12 rounded-xl"
                            autoFocus
                        />
                    </div>
                </div>
                {loading && <Loader2 className="h-12 w-12 p-3 text-gray-400 animate-spin" />}

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {loading && orders.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            {t("noOrdersFound", { query })}
                        </div>
                    ) : (
                        filteredOrders.map((order) => {
                            const isCancelled = order.status === "CANCELLED";
                            return (
                                <div
                                    key={order.id}
                                    className={cn(
                                        "flex items-center justify-between p-4 border rounded-2xl transition-all cursor-pointer group relative overflow-hidden",
                                        isCancelled
                                            ? "bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800"
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-primary/50"
                                    )}
                                    onClick={() => onSelectOrder(order)}
                                >
                                    {isCancelled && (
                                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/50">
                                            <Ban className="h-3 w-3" />
                                            ANNULÉ
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded",
                                                isCancelled ? "text-red-650 dark:text-red-400 line-through" : ""
                                            )}>
                                                {order.receiptNumber}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                order.status === "CANCELLED" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                                                order.status === "VALIDATED" ? "bg-amber-100 text-amber-700" :
                                                order.status === "PAID" ? "bg-green-100 text-green-700" :
                                                "bg-gray-100 text-gray-700"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className={cn("text-xs mt-1", isCancelled ? "text-red-400 dark:text-red-500" : "text-gray-500")}>
                                            <span className={cn("font-semibold", isCancelled ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300")}>
                                                {order.customer?.name || t("noCustomer")}
                                            </span>
                                            {" • "}
                                            {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
                                        </div>

                                        {/* Products list show before select */}
                                        {order.items && order.items.length > 0 && (
                                            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-450 bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-white/[0.03] space-y-0.5 max-w-[280px] sm:max-w-md">
                                                {order.items.slice(0, 4).map((item: any, idx: number) => (
                                                    <div key={item.id || idx} className="truncate">
                                                        • <span className="font-semibold text-slate-700 dark:text-slate-300">{item.product?.name}</span> (x{item.quantity})
                                                    </div>
                                                ))}
                                                {order.items.length > 4 && (
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-550 font-bold pl-2">
                                                        + {order.items.length - 4} autre(s)...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "font-black text-lg",
                                            isCancelled ? "text-red-500 dark:text-red-400 line-through" : "text-primary"
                                        )}>
                                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.total)} DA
                                        </div>
                                        <Button size="sm" variant="outline" className={cn(
                                            "mt-2 h-8 rounded-lg transition-colors",
                                            isCancelled
                                                ? "border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
                                                : "group-hover:bg-primary group-hover:text-white"
                                        )}>
                                            {t("loadOrder")}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Modal>
    )
}
