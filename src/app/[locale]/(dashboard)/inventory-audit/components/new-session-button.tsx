"use client"

import { useState, useTransition } from "react"
import toast from "react-hot-toast"
import { createStockCountSession } from "@/actions/inventory-audit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"

export function NewSessionButton() {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [notes, setNotes] = useState("")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const defaultName = `Inventaire ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`

    const handleCreate = () => {
        if (!name.trim() && !defaultName) return
        startTransition(async () => {
            const result = await createStockCountSession(name.trim() || defaultName, notes.trim() || undefined)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Session créée !")
                setOpen(false)
                setName("")
                setNotes("")
                router.push(`/inventory-audit/${result.data?.id}` as any)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" />
                    Nouvelle Session
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Nouvelle Session d&apos;Inventaire</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Nom de la session</Label>
                        <Input
                            placeholder={defaultName}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="rounded-xl"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Notes (optionnel)</Label>
                        <Input
                            placeholder="Ex: Inventaire trimestriel..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="rounded-xl"
                            disabled={isPending}
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Une session snapshot le stock actuel de tous vos produits. Vous pourrez ensuite saisir les quantités réelles.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Annuler</Button>
                    <Button onClick={handleCreate} disabled={isPending || (!name.trim() && !defaultName)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Créer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
