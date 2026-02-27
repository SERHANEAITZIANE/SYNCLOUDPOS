"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Landmark } from "lucide-react"
import { registerCustomerLoan } from "@/actions/customers"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "@/i18n/routing"

interface LoanModalProps {
    open: boolean
    onClose: () => void
    customers: { id: string; name: string }[]
}

interface LoanFormValues {
    customerId: string
    amount: string
    notes: string
}

export const LoanModal: React.FC<LoanModalProps> = ({ open, onClose, customers }) => {
    const router = useRouter()
    const [loading, setLoading] = React.useState(false)

    const form = useForm<LoanFormValues>({
        defaultValues: {
            customerId: "",
            amount: "",
            notes: "",
        }
    })

    const onSubmit = async (values: LoanFormValues) => {
        if (!values.customerId) {
            toast.error("Veuillez sélectionner un client")
            return
        }
        const amount = parseFloat(values.amount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Montant invalide")
            return
        }

        setLoading(true)
        try {
            const result = await registerCustomerLoan({
                customerId: values.customerId,
                amount,
                notes: values.notes || undefined,
            })

            if (result && "error" in result) {
                toast.error(result.error)
            } else {
                toast.success("Emprunt enregistré avec succès")
                form.reset()
                onClose()
                router.refresh()
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-red-500" />
                        Enregistrer un Emprunt Client
                    </DialogTitle>
                    <DialogDescription>
                        Cette opération augmente le solde (dette) du client sélectionné.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un client..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Montant (DA)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observation (optionnel)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Raison de l'emprunt..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {loading ? "Enregistrement..." : "Confirmer l'Emprunt"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
