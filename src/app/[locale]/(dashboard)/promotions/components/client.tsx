"use client"

import { useState } from "react"
import { Plus, Tag, ToggleLeft, ToggleRight, Trash2, Gift, Percent } from "lucide-react"
import { toast } from "react-hot-toast"
import { useRouter } from "@/i18n/routing"

import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createPromotion, togglePromotion, deletePromotion } from "@/actions/promotions"
import { PromotionModal } from "./promotion-modal"
import { cn } from "@/lib/utils"

interface PromotionsClientProps {
    promotions: {
        id: string
        name: string
        type: string
        targetScope: string
        scopeId: string | null
        discountType: string
        discountValue: number
        triggerQty: number
        isActive: boolean
        startsAt: string | null
        endsAt: string | null
        createdAt: string
    }[]
    categories: { id: string; name: string }[]
    products: { id: string; name: string }[]
}

export const PromotionsClient: React.FC<PromotionsClientProps> = ({
    promotions,
    categories,
    products
}) => {
    const router = useRouter()
    const [modalOpen, setModalOpen] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)

    const handleToggle = async (id: string) => {
        setLoading(id)
        const result = await togglePromotion(id)
        if (result.error) toast.error(result.error)
        else toast.success("Statut mis à jour")
        setLoading(null)
        router.refresh()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cette promotion ?")) return
        setLoading(id)
        const result = await deletePromotion(id)
        if (result.error) toast.error(result.error)
        else toast.success(result.success || "Supprimé")
        setLoading(null)
        router.refresh()
    }

    const handleCreate = async (data: any) => {
        const result = await createPromotion(data)
        if (result.error) toast.error(result.error)
        else {
            toast.success(result.success || "Créé")
            setModalOpen(false)
            router.refresh()
        }
    }

    const getPromoTypeLabel = (type: string) => {
        if (type === "NTH_ITEM_DISCOUNT") return "Nième article"
        if (type === "BUY_X_GET_Y_FREE") return "1 acheté = 1 offert"
        return type
    }

    const getScopeLabel = (promo: PromotionsClientProps["promotions"][0]) => {
        if (promo.targetScope === "ALL") return "Tous les produits"
        if (promo.targetScope === "CATEGORY") {
            const cat = categories.find(c => c.id === promo.scopeId)
            return `Catégorie: ${cat?.name || "N/A"}`
        }
        if (promo.targetScope === "PRODUCT") {
            const prod = products.find(p => p.id === promo.scopeId)
            return `Produit: ${prod?.name || "N/A"}`
        }
        return "-"
    }

    return (
        <>
            <PromotionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleCreate}
                categories={categories}
                products={products}
            />

            <div className="flex items-center justify-between">
                <Heading
                    title={`Promotions (${promotions.length})`}
                    description="Gérez vos offres spéciales et remises automatiques"
                />
                <Button onClick={() => setModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Promotion
                </Button>
            </div>
            <Separator />

            {promotions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Gift className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-semibold">Aucune promotion</p>
                    <p className="text-sm mt-1">Créez votre première offre promotionnelle en cliquant sur le bouton ci-dessus.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {promotions.map((promo) => (
                        <Card key={promo.id} className={cn(
                            "border-2 transition-all",
                            promo.isActive ? "border-violet-200 dark:border-violet-900/50" : "border-dashed opacity-60"
                        )}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">{promo.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">{getScopeLabel(promo)}</p>
                                    </div>
                                    <Badge className={cn(
                                        "text-xs",
                                        promo.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"
                                    )}>
                                        {promo.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Tag className="h-4 w-4 text-violet-500 shrink-0" />
                                        <span className="text-muted-foreground">Type :</span>
                                        <span className="font-medium">{getPromoTypeLabel(promo.type)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Percent className="h-4 w-4 text-orange-500 shrink-0" />
                                        <span className="text-muted-foreground">Remise :</span>
                                        <span className="font-bold text-orange-600">
                                            {promo.discountType === "PERCENT" ? `-${promo.discountValue}%` : `-${promo.discountValue} DA`}
                                        </span>
                                        <span className="text-muted-foreground">sur le {promo.triggerQty}ème article</span>
                                    </div>
                                    {(promo.startsAt || promo.endsAt) && (
                                        <div className="text-xs text-muted-foreground">
                                            {promo.startsAt ? `Du ${new Date(promo.startsAt).toLocaleDateString("fr-FR")}` : ""}
                                            {promo.endsAt ? ` au ${new Date(promo.endsAt).toLocaleDateString("fr-FR")}` : ""}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            disabled={loading === promo.id}
                                            onClick={() => handleToggle(promo.id)}
                                        >
                                            {promo.isActive ? (
                                                <><ToggleRight className="mr-2 h-4 w-4 text-green-600" /> Désactiver</>
                                            ) : (
                                                <><ToggleLeft className="mr-2 h-4 w-4 text-gray-400" /> Activer</>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            disabled={loading === promo.id}
                                            onClick={() => handleDelete(promo.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    )
}
