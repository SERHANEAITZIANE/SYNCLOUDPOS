"use client"

import { useState, useTransition } from "react"
import toast from "react-hot-toast"
import { createRecurringInvoice } from "@/actions/recurring-invoices"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"

// Since we are building quickly, we'll use a simplified native select for the demo 
// In a full app, you'd use your existing async SearchSelect for customers and products.

export function NewRecurringDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    // Form state
    const [customerId, setCustomerId] = useState("")
    const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY")
    const [nextRunDate, setNextRunDate] = useState(new Date().toISOString().split('T')[0])

    // Hardcoded dummy product selection for speed (assuming user has products in DB)
    // Normally you'd fetch products and have an autocomplete here.
    const [productId, setProductId] = useState("")
    const [price, setPrice] = useState(1000)

    const handleCreate = () => {
        if (!customerId || !productId) {
            toast.error("Veuillez remplir les champs requis.")
            return
        }

        startTransition(async () => {
            const result = await createRecurringInvoice({
                customerId,
                frequency,
                nextRunDate: new Date(nextRunDate),
                items: [{
                    productId,
                    quantity: 1,
                    unitPrice: price
                }]
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Abonnement créé !")
                setOpen(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" />
                    Nouvel Abonnement
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Nouvelle Facture Récurrente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">

                    <div className="space-y-1.5">
                        <Label>ID Client (Pour test)</Label>
                        <Input
                            placeholder="Entrez un ID client valide"
                            value={customerId}
                            onChange={e => setCustomerId(e.target.value)}
                            className="rounded-xl"
                            disabled={isPending}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>ID Produit (Pour test)</Label>
                        <Input
                            placeholder="Entrez un ID produit valide"
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                            className="rounded-xl"
                            disabled={isPending}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Fréquence</Label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={frequency}
                                onChange={e => setFrequency(e.target.value as any)}
                                disabled={isPending}
                            >
                                <option value="WEEKLY">Hebdomadaire</option>
                                <option value="MONTHLY">Mensuelle</option>
                                <option value="YEARLY">Annuelle</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Date de début</Label>
                            <Input
                                type="date"
                                value={nextRunDate}
                                onChange={e => setNextRunDate(e.target.value)}
                                className="rounded-xl"
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                        Note Demo: Le système génèrera automatiquement un BL (SalesOrder) le {new Date(nextRunDate).toLocaleDateString("fr-FR")} à minuit, déduira le stock et mettra à jour le solde client.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Annuler</Button>
                    <Button onClick={handleCreate} disabled={isPending || !customerId || !productId} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
