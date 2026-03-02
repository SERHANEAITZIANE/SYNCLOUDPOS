"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PromotionModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<void>
    categories: { id: string; name: string }[]
    products: { id: string; name: string }[]
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
    isOpen, onClose, onSubmit, categories, products
}) => {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: "",
        type: "NTH_ITEM_DISCOUNT",
        targetScope: "ALL",
        scopeId: "",
        discountType: "PERCENT",
        discountValue: "30",
        triggerQty: "2"
    })

    const handleChange = (key: string, val: string) => {
        setForm(prev => ({ ...prev, [key]: val }))
    }

    const handleSubmit = async () => {
        if (!form.name || !form.discountValue || !form.triggerQty) {
            return
        }
        setLoading(true)
        await onSubmit({
            ...form,
            discountValue: parseFloat(form.discountValue),
            triggerQty: parseInt(form.triggerQty),
            scopeId: form.targetScope === "ALL" ? null : form.scopeId || null
        })
        setLoading(false)
        setForm({ name: "", type: "NTH_ITEM_DISCOUNT", targetScope: "ALL", scopeId: "", discountType: "PERCENT", discountValue: "30", triggerQty: "2" })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nouvelle Promotion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nom de la promotion</Label>
                        <Input placeholder="Ex: 2ème article -30%" value={form.name} onChange={e => handleChange("name", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type de promotion</Label>
                            <Select value={form.type} onValueChange={v => handleChange("type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NTH_ITEM_DISCOUNT">Nième article remisé</SelectItem>
                                    <SelectItem value="BUY_X_GET_Y_FREE">1 acheté = 1 offert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>À partir du {form.triggerQty}ème article</Label>
                            <Input type="number" min="2" value={form.triggerQty} onChange={e => handleChange("triggerQty", e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type de remise</Label>
                            <Select value={form.discountType} onValueChange={v => handleChange("discountType", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENT">Pourcentage (%)</SelectItem>
                                    <SelectItem value="FIXED">Montant fixe (DA)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Valeur de la remise ({form.discountType === "PERCENT" ? "%" : "DA"})</Label>
                            <Input type="number" min="0" value={form.discountValue} onChange={e => handleChange("discountValue", e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Appliquer sur</Label>
                        <Select value={form.targetScope} onValueChange={v => handleChange("targetScope", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les produits</SelectItem>
                                <SelectItem value="CATEGORY">Une catégorie</SelectItem>
                                <SelectItem value="PRODUCT">Un produit spécifique</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {form.targetScope === "CATEGORY" && (
                        <div className="space-y-2">
                            <Label>Catégorie cible</Label>
                            <Select value={form.scopeId} onValueChange={v => handleChange("scopeId", v)}>
                                <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {form.targetScope === "PRODUCT" && (
                        <div className="space-y-2">
                            <Label>Produit cible</Label>
                            <Select value={form.scopeId} onValueChange={v => handleChange("scopeId", v)}>
                                <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                                <SelectContent>
                                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white">
                        {loading ? "Création..." : "Créer la Promotion"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
