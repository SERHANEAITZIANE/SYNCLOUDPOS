"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Calculator } from "lucide-react"

import { createReconciliation } from "@/actions/treasury"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { TreasuryAccountColumn } from "./types"
import { cn, formatter } from "@/lib/utils"

const ReconciliationFormSchema = z.object({
    accountId: z.string().min(1, "Sélectionnez un compte"),
    realAmount: z.coerce.number().min(0, "Le montant doit être positif"),
})

interface ReconciliationModalProps {
    isOpen: boolean
    onClose: () => void
    accounts: TreasuryAccountColumn[]
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ isOpen, onClose, accounts }) => {
    const [loading, setLoading] = useState(false)

    const form = useForm<any>({
        resolver: zodResolver(ReconciliationFormSchema),
        defaultValues: {
            accountId: "",
            realAmount: 0,
        }
    })

    useEffect(() => {
        if (isOpen) {
            form.reset({
                accountId: "",
                realAmount: 0,
            })
        }
    }, [isOpen])

    const selectedAccountId = form.watch("accountId")
    const realAmount = form.watch("realAmount")

    const selectedAccount = accounts.find(a => a.id === selectedAccountId)
    const logicielAmount = selectedAccount ? selectedAccount.rawBalance : 0
    const difference = Number(realAmount || 0) - logicielAmount
    const isPositive = difference > 0
    const isNegative = difference < 0

    const onSubmit = async (values: any) => {
        if (difference === 0) {
            toast.success("Aucun décalage, la caisse est déjà juste !")
            onClose()
            return
        }

        try {
            setLoading(true)
            const result = await createReconciliation(values.accountId, values.realAmount)
            if (result.error) { toast.error(result.error) }
            else {
                toast.success(result.success || "Rapprochement effectué avec succès.")
                form.reset()
                onClose()
            }
        } catch { toast.error("Une erreur est survenue.") }
        finally { setLoading(false) }
    }

    return (
        <Modal title="" description="" isOpen={isOpen} onClose={onClose}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 -mt-2">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950">
                    <Calculator className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Rapprochement de Caisse</h2>
                    <p className="text-sm text-muted-foreground">Corriger un décalage entre le logiciel et le réel</p>
                </div>
            </div>
            <Separator className="mb-4" />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* ACCOUNT */}
                    <FormField control={form.control} name="accountId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caisse / Compte</FormLabel>
                            <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une caisse..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{a.name}</span>
                                                <span className="text-xs text-muted-foreground">Solde: {a.balance}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-4 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500">Montant Logiciel :</span>
                            <span className="font-bold">{formatter.format(logicielAmount)}</span>
                        </div>

                        {/* REAL AMOUNT */}
                        <FormField control={form.control} name="realAmount" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montant Physique Réel</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            disabled={loading || !selectedAccountId}
                                            placeholder="0.00"
                                            className="text-xl font-bold pr-14 h-12"
                                            {...field}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">DA</span>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500">Décalage (Écart) :</span>
                            <span className={cn(
                                "font-bold text-lg",
                                isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-slate-400"
                            )}>
                                {isPositive ? "+" : ""}{formatter.format(difference)}
                            </span>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button disabled={loading} variant="outline" type="button" onClick={onClose}>Annuler</Button>
                        <Button
                            disabled={loading || !selectedAccountId}
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-24"
                        >
                            {loading ? "En cours..." : "Valider l'ajustement"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
