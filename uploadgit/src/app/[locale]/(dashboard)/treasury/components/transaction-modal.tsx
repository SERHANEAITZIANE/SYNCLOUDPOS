"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { ArrowDownCircle, ArrowUpCircle, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"

import { createManualTransaction } from "@/actions/treasury"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { TreasuryAccountColumn } from "./types"
import { cn } from "@/lib/utils"

const TransactionFormSchema = z.object({
    accountId: z.string().min(1, "Sélectionnez un compte"),
    type: z.enum(["CREDIT", "DEBIT"]),
    amount: z.coerce.number().min(0.01, "Le montant doit être supérieur à 0"),
    description: z.string().min(1, "La description est requise"),
    date: z.string(),
    time: z.string(),
})

interface TransactionModalProps {
    isOpen: boolean
    onClose: () => void
    accounts: TreasuryAccountColumn[]
}

const now = () => {
    const d = new Date()
    return { date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm") }
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, accounts }) => {
    const [loading, setLoading] = useState(false)
    const { date: defaultDate, time: defaultTime } = now()

    const form = useForm<any>({
        resolver: zodResolver(TransactionFormSchema),
        defaultValues: {
            accountId: "",
            type: "CREDIT",
            amount: 0,
            description: "",
            date: defaultDate,
            time: defaultTime,
        }
    })

    const onSubmit = async (values: any) => {
        try {
            setLoading(true)
            const result = await createManualTransaction(values.accountId, values.type, values.amount, values.description)
            if (result.error) { toast.error(result.error) }
            else {
                toast.success(result.success || "Transaction enregistrée.")
                form.reset({ ...form.getValues(), amount: 0, description: "", ...now() })
                onClose()
            }
        } catch { toast.error("Une erreur est survenue.") }
        finally { setLoading(false) }
    }

    const opType = form.watch("type")
    const isCredit = opType === "CREDIT"

    return (
        <Modal title="" description="" isOpen={isOpen} onClose={onClose}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 -mt-2">
                <div className={cn("p-2.5 rounded-xl", isCredit ? "bg-emerald-50 dark:bg-emerald-950" : "bg-red-50 dark:bg-red-950")}>
                    {isCredit
                        ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                        : <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    }
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Saisie manuelle</h2>
                    <p className="text-sm text-muted-foreground">Enregistrer une entrée ou une sortie de fonds</p>
                </div>
            </div>
            <Separator className="mb-4" />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    {/* DATE & TIME */}
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

                    {/* ACCOUNT */}
                    <FormField control={form.control} name="accountId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compte concerné</FormLabel>
                            <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un compte..." />
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

                    {/* TYPE selector — visual toggle */}
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type d'opération</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => field.onChange("CREDIT")}
                                    className={cn(
                                        "flex items-center gap-2 justify-center p-3 rounded-lg border-2 transition-all font-medium text-sm",
                                        field.value === "CREDIT"
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <ArrowDownCircle className="h-4 w-4" />
                                    Entrée / Crédit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange("DEBIT")}
                                    className={cn(
                                        "flex items-center gap-2 justify-center p-3 rounded-lg border-2 transition-all font-medium text-sm",
                                        field.value === "DEBIT"
                                            ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-600"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <ArrowUpCircle className="h-4 w-4" />
                                    Sortie / Débit
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

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
                                        className={cn("text-xl font-bold pr-14 h-12", isCredit ? "border-emerald-300 dark:border-emerald-800 focus-visible:ring-emerald-500" : "border-red-300 dark:border-red-800 focus-visible:ring-red-500")}
                                        {...field}
                                    />
                                    <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold", isCredit ? "text-emerald-600" : "text-red-500")}>DA</span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* DESCRIPTION */}
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description / Motif</FormLabel>
                            <FormControl>
                                <Input disabled={loading} placeholder="Raison de la transaction..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <Separator />

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button disabled={loading} variant="outline" type="button" onClick={onClose}>Annuler</Button>
                        <Button
                            disabled={loading}
                            type="submit"
                            className={cn("min-w-24", isCredit ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600")}
                        >
                            {loading ? "En cours..." : isCredit ? "✓ Valider l'entrée" : "✓ Valider la sortie"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
