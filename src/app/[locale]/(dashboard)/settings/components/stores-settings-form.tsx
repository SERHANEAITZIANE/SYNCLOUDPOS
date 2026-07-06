"use client"

import { useState, useTransition } from "react"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { MapPin, Edit, Trash, Plus, RefreshCw } from "lucide-react"
import {
    createStoreForTenantAdmin,
    updateStoreForTenantAdmin,
    deleteStoreForTenantAdmin
} from "@/actions/stores"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"

interface Store {
    id: string
    name: string
    address: string | null
    createdAt: Date
}

interface StoresSettingsFormProps {
    initialStores: Store[]
}

export const StoresSettingsForm = ({ initialStores }: StoresSettingsFormProps) => {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    
    // Form fields for new store
    const [newName, setNewName] = useState("")
    const [newAddress, setNewAddress] = useState("")

    // States for editing a store
    const [editingStore, setEditingStore] = useState<Store | null>(null)
    const [editName, setEditName] = useState("")
    const [editAddress, setEditAddress] = useState("")

    const handleCreate = () => {
        if (!newName.trim()) {
            toast.error("Le nom du magasin est requis")
            return
        }

        startTransition(async () => {
            const res = await createStoreForTenantAdmin(newName, newAddress)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || "Magasin créé !")
                setNewName("")
                setNewAddress("")
                router.refresh()
            }
        })
    }

    const handleUpdate = () => {
        if (!editingStore) return
        if (!editName.trim()) {
            toast.error("Le nom du magasin est requis")
            return
        }

        startTransition(async () => {
            const res = await updateStoreForTenantAdmin(editingStore.id, editName, editAddress)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || "Magasin mis à jour !")
                setEditingStore(null)
                router.refresh()
            }
        })
    }

    const handleDelete = (storeId: string) => {
        if (initialStores.length <= 1) {
            toast.error("Impossible de supprimer le seul magasin restant.")
            return
        }

        if (!confirm("Êtes-vous sûr de vouloir supprimer ce magasin ? Cette action est irréversible et supprimera tout le stock associé à cette localisation.")) {
            return
        }

        startTransition(async () => {
            const res = await deleteStoreForTenantAdmin(storeId)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || "Magasin supprimé !")
                router.refresh()
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left pane: Add Store Form */}
                <div className="space-y-4 bg-muted/40 p-4 rounded-xl border">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <Plus className="w-4 h-4" />
                        Ajouter un nouveau magasin
                    </h3>
                    <Separator className="my-2" />
                    
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="store-name">Nom du magasin <span className="text-red-500">*</span></Label>
                            <Input
                                id="store-name"
                                placeholder="ex. Dépôt Central, Boutique Nord"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="store-address">Adresse (Optionnelle)</Label>
                            <Input
                                id="store-address"
                                placeholder="ex. Rue de la Gare, Alger"
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <Button 
                            onClick={handleCreate} 
                            disabled={isPending} 
                            className="w-full flex items-center justify-center gap-2 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Créer le magasin
                        </Button>
                    </div>
                </div>

                {/* Right pane: List of Stores */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                        Magasins enregistrés ({initialStores.length})
                    </h3>
                    <div className="border rounded-xl overflow-hidden bg-card">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="p-3 font-semibold text-muted-foreground">Nom</th>
                                    <th className="p-3 font-semibold text-muted-foreground">Adresse</th>
                                    <th className="p-3 font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialStores.map((st) => (
                                    <tr key={st.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                        <td className="p-3 font-medium flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                                            <span>{st.name}</span>
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {st.address || <em className="text-xs">Non définie</em>}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                                                    onClick={() => {
                                                        setEditingStore(st)
                                                        setEditName(st.name)
                                                        setEditAddress(st.address || "")
                                                    }}
                                                    disabled={isPending}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                                                    onClick={() => handleDelete(st.id)}
                                                    disabled={isPending || initialStores.length <= 1}
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Edit Dialog */}
            <Dialog open={editingStore !== null} onOpenChange={(open) => !open && setEditingStore(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier le magasin</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2 pb-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nom du magasin <span className="text-red-500">*</span></Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Adresse</Label>
                            <Input
                                id="edit-address"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setEditingStore(null)}
                            disabled={isPending}
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleUpdate}
                            disabled={isPending}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            {isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
