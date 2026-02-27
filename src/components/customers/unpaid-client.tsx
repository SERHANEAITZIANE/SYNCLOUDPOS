"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { CustomerColumn } from "./types"
import { useCustomerColumns } from "./columns"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerCustomerPayment } from "@/actions/customers"
import { toast } from "react-hot-toast"

interface UnpaidClientProps {
    data: CustomerColumn[]
    accounts: { id: string, name: string, type: string }[]
}

export const UnpaidClient: React.FC<UnpaidClientProps> = ({ data, accounts }) => {
    const t = useTranslations("Customers")
    // Reuse primary columns for viewing clients
    const baseColumns = useCustomerColumns()

    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerColumn | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [accountId, setAccountId] = useState<string>("")
    const [notes, setNotes] = useState<string>("")
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)

    // Add immediate action column to list
    const actionColumn = {
        id: "actions",
        cell: ({ row }: any) => {
            const customer = row.original
            return (
                <div className="flex flex-row space-x-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        onClick={() => {
                            setSelectedCustomer(customer)
                            setPaymentAmount(customer.balance.toString())
                            setAccountId(accounts.length > 0 ? accounts[0].id : "")
                            setNotes("Paiement partiel / solde")
                            setDate(new Date().toISOString().split('T')[0])
                            setPaymentModalOpen(true)
                        }}
                    >
                        Recevoir Paiement
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.location.href = `/customers/${customer.id}/ledger`}
                    >
                        Historique
                    </Button>
                </div>
            )
        }
    }

    const columns = [...baseColumns.filter(c => c.id !== "actions"), actionColumn]

    const onSubmitPayment = async () => {
        if (!selectedCustomer) return
        if (!accountId) {
            toast.error("Veuillez sélectionner un compte / caisse")
            return
        }

        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Veuillez entrer un montant valide")
            return
        }

        if (amount > (selectedCustomer.balance ?? 0)) {
            toast.error("Le montant entré est supérieur à la dette du client.")
            return
        }

        try {
            setLoading(true)
            const result = await registerCustomerPayment({
                customerId: selectedCustomer.id,
                amount,
                accountId,
                notes,
                date: new Date(date).toISOString()
            })

            if (result.error) toast.error(result.error)
            else {
                toast.success(result.success ?? "Success")
                setPaymentModalOpen(false)
            }
        } catch (error) {
            toast.error("Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Clients Impayés (${data.length})`}
                    description={"Gérez et collectez les paiements des clients ayant des dettes en cours."}
                />
            </div>
            <Separator />
            <DataTable searchKey="name" columns={columns} data={data} />

            <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Enregistrer un Paiement</DialogTitle>
                        <DialogDescription>
                            Client: <strong>{selectedCustomer?.name}</strong> <br />
                            Dette totale: <strong>{selectedCustomer?.balance} DA</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Montant</Label>
                            <Input
                                id="amount"
                                type="number"
                                className="col-span-3"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="account" className="text-right">Caisse/Banque</Label>
                            <div className="col-span-3">
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un compte" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                className="col-span-3"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right">Observation</Label>
                            <Input
                                id="notes"
                                className="col-span-3"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button disabled={loading} onClick={onSubmitPayment}>
                            {loading ? "Chargement..." : "Confirmer le Paiement"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
