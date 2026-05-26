"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowLeft, ArrowDown, ArrowUp, Package, RotateCcw, Trash2, ArrowRightLeft, AlertTriangle, ShoppingCart } from "lucide-react"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"

interface Movement {
    id: string
    type: string
    quantity: number
    stockBefore: number
    stockAfter: number
    reason?: string
    referenceId?: string
    createdAt: string
    user?: { name?: string; email?: string }
}

interface StockMovementsClientProps {
    productName: string
    productId: string
    currentStock: number
    movements: Movement[]
}

const typeConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    SALE: { label: "Vente", icon: ShoppingCart, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
    PURCHASE: { label: "Achat", icon: ArrowDown, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
    ADJUSTMENT: { label: "Ajustement", icon: RotateCcw, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
    SPOILAGE: { label: "Avarie", icon: Trash2, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
    TRANSFER_IN: { label: "Transfert Entrant", icon: ArrowDown, color: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
    TRANSFER_OUT: { label: "Transfert Sortant", icon: ArrowUp, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
    RETURN: { label: "Retour", icon: ArrowRightLeft, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
    MANUAL: { label: "Manuel", icon: Package, color: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30" },
}

export const StockMovementsClient: React.FC<StockMovementsClientProps> = ({
    productName, productId, currentStock, movements
}) => {
    const router = useRouter()

    const totalIn = movements.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0)
    const totalOut = movements.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0)

    const getConfig = (type: string) => typeConfig[type] || typeConfig.MANUAL

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Heading
                    title={`Mouvements de Stock`}
                    description={productName}
                />
            </div>

            <Separator />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Stock Actuel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{currentStock}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600">Total Entrées</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-600">+{totalIn}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Total Sorties</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-red-600">-{totalOut}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Movements Timeline */}
            {movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mb-3 opacity-40" />
                    <p className="font-medium">Aucun mouvement de stock enregistré</p>
                    <p className="text-sm">Les mouvements apparaîtront ici après les ventes, achats et ajustements.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {movements.map((m, i) => {
                        const config = getConfig(m.type)
                        const IconComponent = config.icon
                        const isPositive = m.quantity > 0

                        return (
                            <div
                                key={m.id}
                                className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                            >
                                {/* Icon */}
                                <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${config.bgColor}`}>
                                    <IconComponent className={`h-5 w-5 ${config.color}`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={`${config.color} border-current/20 text-xs`}>
                                            {config.label}
                                        </Badge>
                                        {m.reason && (
                                            <span className="text-xs text-muted-foreground truncate">{m.reason}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span>{format(new Date(m.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                                        {m.user?.name && (
                                            <>
                                                <span>•</span>
                                                <span>{m.user.name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Quantity Change */}
                                <div className="text-right shrink-0">
                                    <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {isPositive ? '+' : ''}{m.quantity}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground">
                                        {m.stockBefore} → {m.stockAfter}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
