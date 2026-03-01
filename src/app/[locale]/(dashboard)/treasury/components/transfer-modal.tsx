"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { ArrowLeftRight, Calendar, Clock, Wallet } from "lucide-react"
import { format } from "date-fns"

import { transferFunds } from "@/actions/treasury"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { TreasuryAccountColumn } from "./types"
import { cn } from "@/lib/utils"

const TransferFormSchema = z.object({
    fromAccountId: z.string().min(1, "Sélectionnez un compte source"),
    toAccountId: z.string().min(1, "Sélectionnez un compte destination"),
    amount: z.coerce.number().min(0.01, "Le montant doit être supérieur à 0"),
    description: z.string().optional(),
    date: z.string(),
    time: z.string(),
})

interface TransferModalProps {
    isOpen: boolean
    onClose: () => void
    accounts: TreasuryAccountColumn[]
}

const now = () => {
    const d = new Date()
    return {
        date: format(d, "yyyy-MM-dd"),
        time: format(d, "HH:mm")
    }
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, accounts }) => {
    const [loading, setLoading] = useState(false)
    const { date: defaultDate, time: defaultTime } = now()

    const form = useForm<any>({
        resolver: zodResolver(TransferFormSchema),
        defaultValues: {
            fromAccountId: "",
            toAccountId: "",
            amount: 0,
            description: "",
            date: defaultDate,
            time: defaultTime,
        }
    })

    const onSubmit = async (values: any) => {
        if (values.fromAccountId === values.toAccountId) {
            form.setError("toAccountId", { message: "Les comptes source et destination doivent être différents" })
            return
        }
        try {
            setLoading(true)
            const result = await transferFunds(values.fromAccountId, values.toAccountId, values.amount, values.description)
            if (result.error) { toast.error(result.error) }
            else {
                toast.success(result.success || "Virement effectué avec succès.")
                form.reset({ ...form.getValues(), ...now() })
                onClose()
            }
        } catch { toast.error("Une erreur est survenue.") }
        finally { setLoading(false) }
    }

    const fromAccountId = form.watch("fromAccountId")
    const fromAccount = accounts.find(a => a.id === fromAccountId)

    return (
        <Modal
            title=""
            description=""
            isOpen={isOpen}
            onClose={onClose}
        >
            {/* Custom header */}
            <div className="flex items-center gap-3 mb-4 -mt-2">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950">
                    <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Virement entre comptes</h2>
                    <p className="text-sm text-muted-foreground">Transférer des fonds d'un compte à un autre</p>
                </div>
            </div>
            <Separator className="mb-4" />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    {/* DATE & TIME row */}
                    <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    <Calendar className="h-3 w-3" /> Date
                                </FormLabel>
                                <FormControl>
                                    <Input type="date" disabled={loading} {...field} className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="time" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    <Clock className="h-3 w-3" /> Heure
                                </FormLabel>
                                <FormControl>
                                    <Input type="time" disabled={loading} {...field} className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {/* FROM → TO accounts */}
                    <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="fromAccountId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">De (Source)</FormLabel>
                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="border-red-200 dark:border-red-900">
                                            <SelectValue placeholder="Compte source" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent position="popper" className="z-[9999]">
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
                        <FormField control={form.control} name="toAccountId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vers (Destination)</FormLabel>
                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="border-emerald-200 dark:border-emerald-900">
                                            <SelectValue placeholder="Compte destination" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent position="popper" className="z-[9999]">
                                        {accounts.map(a => (
                                            <SelectItem key={a.id} value={a.id} disabled={a.id === fromAccountId}>
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
                    </div>

                    {/* AMOUNT */}
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montant</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        disabled={loading}
                                        placeholder="0.00"
                                        className="text-xl font-bold pr-14 h-12"
                                        {...field}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">DA</span>
                                </div>
                            </FormControl>
                            {fromAccount && (
                                <p className={cn("text-xs", Number(field.value) > Number(String(fromAccount.balance).replace(/[^0-9.-]/g, '')) ? "text-red-500" : "text-muted-foreground")}>
                                    Solde disponible: {fromAccount.balance}
                                </p>
                            )}
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* DESCRIPTION */}
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Motif (Optionnel)</FormLabel>
                            <FormControl>
                                <Input disabled={loading} placeholder="Raison du virement..." {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <Separator />

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button disabled={loading} variant="outline" type="button" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button disabled={loading} type="submit" className="min-w-24 bg-indigo-600 hover:bg-indigo-700">
                            {loading ? "En cours..." : "Valider le virement"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
