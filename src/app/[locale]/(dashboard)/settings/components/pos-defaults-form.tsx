"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Wallet, CreditCard, Receipt } from "lucide-react"

const STORAGE_KEY = "pos_defaults_prefs"

export interface PosDefaultPrefs {
    defaultAccountId: string
    defaultPaymentMethod: "CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM"
    showTvaOnReceipt: boolean
    showHtPricesOnReceipt: boolean
}

const defaults: PosDefaultPrefs = {
    defaultAccountId: "none",
    defaultPaymentMethod: "CASH",
    showTvaOnReceipt: false,
    showHtPricesOnReceipt: false,
}

interface Account {
    id: string
    name: string
    type: string
    balance: number
}

interface PosDefaultsFormProps {
    accounts: Account[]
}

export const PosDefaultsForm = ({ accounts }: PosDefaultsFormProps) => {
    const [prefs, setPrefs] = useState<PosDefaultPrefs>(defaults)

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) setPrefs(prev => ({ ...prev, ...JSON.parse(stored) }))
        } catch { /* noop */ }
    }, [])

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
        toast.success("Paramètres POS sauvegardés sur cet appareil !")
    }

    const cashAccounts = accounts.filter(a => a.type === "CAISSE")
    const bankAccounts = accounts.filter(a => a.type === "BANK")

    return (
        <div className="space-y-8">
            {/* Default Account */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-5 h-5 text-green-500" />
                    <h3 className="text-base font-semibold">Caisse / Banque par Défaut</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div className="space-y-2">
                        <Label>Compte de dépôt par défaut</Label>
                        <Select
                            value={prefs.defaultAccountId}
                            onValueChange={(v) => setPrefs(p => ({ ...p, defaultAccountId: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un compte" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">— Aucun (saisir à chaque fois) —</SelectItem>
                                {cashAccounts.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Caisses</div>
                                        {cashAccounts.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                💰 {a.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                                {bankAccounts.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Banques</div>
                                        {bankAccounts.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                🏦 {a.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Ce compte sera pré-sélectionné automatiquement dans le POS à chaque vente.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Default Payment Method */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-semibold">Méthode de Paiement par Défaut</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div className="space-y-2">
                        <Label>Mode de règlement</Label>
                        <Select
                            value={prefs.defaultPaymentMethod}
                            onValueChange={(v) => setPrefs(p => ({ ...p, defaultPaymentMethod: v as PosDefaultPrefs["defaultPaymentMethod"] }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Espèces</SelectItem>
                                <SelectItem value="CARD">Carte Bancaire</SelectItem>
                                <SelectItem value="TRANSFER">Virement</SelectItem>
                                <SelectItem value="CHECK">Chèque</SelectItem>
                                <SelectItem value="TERM">À Terme (Crédit)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Receipt Display Options */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-orange-500" />
                    <h3 className="text-base font-semibold">Affichage sur le Reçu</h3>
                </div>
                <div className="space-y-4 bg-muted/40 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Afficher TVA par ligne</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Affiche le taux et montant TVA pour chaque article
                            </p>
                        </div>
                        <Switch
                            checked={prefs.showTvaOnReceipt}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showTvaOnReceipt: v }))}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Afficher les prix HT</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Affiche le prix hors taxe en plus du prix TTC
                            </p>
                        </div>
                        <Switch
                            checked={prefs.showHtPricesOnReceipt}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showHtPricesOnReceipt: v }))}
                        />
                    </div>
                </div>
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
                ⚠️ Ces réglages sont sauvegardés <strong>sur cet appareil uniquement</strong> (localStorage). Chaque poste peut avoir ses propres paramètres.
            </p>

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} className="min-w-36">
                    Sauvegarder
                </Button>
            </div>
        </div>
    )
}
