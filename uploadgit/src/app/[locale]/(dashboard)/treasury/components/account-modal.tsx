"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { Landmark, Wallet } from "lucide-react"

import { TreasuryAccountSchema } from "@/schemas"
import { createTreasuryAccount } from "@/actions/treasury"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AccountModalProps {
    isOpen: boolean
    onClose: () => void
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false)

    const form = useForm<any>({
        resolver: zodResolver(TreasuryAccountSchema),
        defaultValues: { name: "", type: "CAISSE", balance: 0, rib: "" }
    })

    const onSubmit = async (values: any) => {
        try {
            setLoading(true)
            await createTreasuryAccount(values)
            toast.success("Compte créé avec succès.")
            form.reset()
            onClose()
        } catch { toast.error("Une erreur est survenue.") }
        finally { setLoading(false) }
    }

    const accountType = form.watch("type")

    return (
        <Modal title="" description="" isOpen={isOpen} onClose={onClose}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 -mt-2">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950">
                    {accountType === "BANK"
                        ? <Landmark className="h-5 w-5 text-blue-600" />
                        : <Wallet className="h-5 w-5 text-blue-600" />
                    }
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Nouveau compte de trésorerie</h2>
                    <p className="text-sm text-muted-foreground">Ajouter une caisse ou un compte bancaire</p>
                </div>
            </div>
            <Separator className="mb-4" />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    {/* TYPE toggle */}
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type de compte</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => field.onChange("CAISSE")}
                                    className={cn(
                                        "flex items-center gap-2 justify-center p-3 rounded-lg border-2 transition-all font-medium text-sm",
                                        field.value === "CAISSE"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <Wallet className="h-4 w-4" /> Caisse (Espèces)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("BANK")}
                                    className={cn(
                                        "flex items-center gap-2 justify-center p-3 rounded-lg border-2 transition-all font-medium text-sm",
                                        field.value === "BANK"
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <Landmark className="h-4 w-4" /> Compte Bancaire
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* NAME */}
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom du compte</FormLabel>
                            <FormControl>
                                <Input disabled={loading} placeholder="Ex: Caisse Principale, BNA..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* BALANCE */}
                    <FormField control={form.control} name="balance" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Solde initial</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input type="number" step="0.01" disabled={loading} placeholder="0.00" className="text-xl font-bold pr-14 h-12" {...field} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">DA</span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* RIB - only for bank */}
                    {accountType === "BANK" && (
                        <FormField control={form.control} name="rib" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">RIB / Identifiant bancaire (Optionnel)</FormLabel>
                                <FormControl>
                                    <Input disabled={loading} placeholder="Numéro de compte bancaire..." {...field} value={field.value || ""} className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    <Separator />

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button disabled={loading} variant="outline" type="button" onClick={onClose}>Annuler</Button>
                        <Button disabled={loading} type="submit" className="min-w-24 bg-blue-600 hover:bg-blue-700">
                            {loading ? "Création..." : "Créer le compte"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
