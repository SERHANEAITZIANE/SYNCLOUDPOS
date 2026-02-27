"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Building2 } from "lucide-react"
import { registerSupplierLoan } from "@/actions/suppliers"
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

interface SupplierLoanModalProps {
    open: boolean
    onClose: () => void
    suppliers: { id: string; name: string }[]
    treasuryAccounts: { id: string; name: string; balance: number }[]
}

interface LoanFormValues {
    supplierId: string
    accountId: string
    amount: string
    notes: string
}

export const SupplierLoanModal: React.FC<SupplierLoanModalProps> = ({ open, onClose, suppliers, treasuryAccounts }) => {
    const router = useRouter()
    const [loading, setLoading] = React.useState(false)

    const form = useForm<LoanFormValues>({
        defaultValues: {
            supplierId: "",
            accountId: "",
            amount: "",
            notes: "",
        }
    })

    const onSubmit = async (values: LoanFormValues) => {
        if (!values.supplierId) {
            toast.error("Veuillez sélectionner un fournisseur")
            return
        }
        if (!values.accountId) {
            toast.error("Veuillez sélectionner une caisse/banque")
            return
        }
        const amount = parseFloat(values.amount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Montant invalide")
            return
        }

        setLoading(true)
        try {
            const result = await registerSupplierLoan({
                supplierId: values.supplierId,
                accountId: values.accountId,
                amount,
                notes: values.notes || undefined,
            })

            if (result && "error" in result) {
                toast.error(result.error)
            } else {
                toast.success("Emprunt fournisseur enregistré avec succès")
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
                        <Building2 className="h-5 w-5 text-orange-500" />
                        Enregistrer un Emprunt Fournisseur
                    </DialogTitle>
                    <DialogDescription>
                        Cette opération augmente la dette envers le fournisseur sélectionné.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fournisseur</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un fournisseur..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="accountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Caisse / Banque</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une caisse/banque..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {treasuryAccounts.map(account => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.name} ({account.balance} DA)
                                                </SelectItem>
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
                                className="bg-orange-600 hover:bg-orange-700 text-white"
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
