"use client"

import { useState } from "react"
import { Eye, Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { PurchaseOrderColumn } from "./types"
import { deletePurchaseOrder } from "@/actions/purchase-orders"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface CellActionProps {
    data: PurchaseOrderColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const tCommon = useTranslations("Common")
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState("")

    const handleDelete = async () => {
        if (password !== "111") {
            toast.error("Mot de passe incorrect !")
            return
        }
        try {
            setLoading(true)
            const result = await deletePurchaseOrder(data.id)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Bon d'achat supprimé avec succès.")
                setOpen(false)
                setPassword("")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue lors de la suppression.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => router.push(`/purchases/${data.id}`)}
                title={tCommon("view")}
            >
                <Eye className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                    setPassword("")
                    setOpen(true)
                }}
                title="Supprimer"
            >
                <Trash className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-2xl p-6 transition-all duration-250">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2.5">
                            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                                <Trash className="h-5 w-5 animate-pulse" />
                            </span>
                            Confirmation de suppression
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Cette action est <span className="text-red-600 dark:text-red-400 font-bold">définitive</span>. Elle annulera la commande, restaurera les stocks physiques, et créditera/débitera les comptes de trésorerie associés.
                        </p>
                        <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 block mb-1">
                                Mot de passe de sécurité (111)
                            </label>
                            <Input
                                type="password"
                                placeholder="Saisir le mot de passe..."
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={loading}
                                className="text-sm font-mono text-center tracking-widest font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-red-500 h-10"
                                onKeyDown={e => {
                                    if (e.key === "Enter" && password) handleDelete()
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex flex-row items-center justify-end gap-2 mt-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setOpen(false)} 
                            disabled={loading}
                            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/60 font-semibold"
                        >
                            Annuler
                        </Button>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDelete} 
                            disabled={loading || !password}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 font-semibold shadow-md shadow-red-500/10 flex items-center gap-1.5"
                        >
                            {loading ? "Suppression..." : "✓ Confirmer la suppression"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
