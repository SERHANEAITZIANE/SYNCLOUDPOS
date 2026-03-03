"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Search, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useTranslations } from "next-intl"

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
                        filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-primary/50 transition-colors cursor-pointer group"
                                onClick={() => onSelectOrder(order)}
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white uppercase">
                                            {order.receiptNumber}
                                        </h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${order.status === "VALIDATED" ? "bg-amber-100 text-amber-700" :
                                            order.status === "PAID" ? "bg-green-100 text-green-700" :
                                                "bg-gray-100 text-gray-700"
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                            {order.customer?.name || t("noCustomer")}
                                        </span>
                                        {" • "}
                                        {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
                                        {" • "}
                                        {order.items.length} {t("items")}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-lg text-primary">
                                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.total)} DA
                                    </div>
                                    <Button size="sm" variant="outline" className="mt-2 h-8 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                        {t("loadOrder")}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    )
}
