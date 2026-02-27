"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useCustomerColumns } from "./columns"
import { CustomerColumn } from "./types"
import { Link, useRouter } from "@/i18n/routing"

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
import { Edit, MoreHorizontal, Trash, ScrollText, HandCoins } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteCustomer } from "@/actions/customers"

interface CustomerClientProps {
    data: CustomerColumn[]
    accounts: { id: string, name: string, type: string }[]
}

export const CustomerClient: React.FC<CustomerClientProps> = ({ data, accounts }) => {
    const t = useTranslations("Customers")
    const tCommon = useTranslations("Common")
    const router = useRouter()

    // Modal Statess
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerColumn | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [accountId, setAccountId] = useState<string>("")
    const [notes, setNotes] = useState<string>("")
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Base Columns
    const baseColumns = useCustomerColumns()

    // We augment the standard actions column to inject the "Ajouter Paiement" button uniquely tied to this client's state
    const actionColumn = {
        id: "actions",
        cell: ({ row }: any) => {
            const customer = row.original

            const onConfirmDelete = async () => {
                try {
                    await deleteCustomer(customer.id)
                    toast.success("Client supprimé.")
                    router.refresh()
                } catch {
                    toast.error("Erreur lors de la suppression.")
                }
            }

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{tCommon("actions")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>

                        <DropdownMenuItem onClick={() => {
                            setSelectedCustomer(customer)
                            setPaymentAmount("")
                            setAccountId(accounts.length > 0 ? accounts[0].id : "")
                            setNotes("Paiement / Avance")
                            setDate(new Date().toISOString().split('T')[0])
                            setPaymentModalOpen(true)
                        }}>
                            <HandCoins className="mr-2 h-4 w-4 text-emerald-600" /> Ajouter Paiement
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}/ledger`)}>
                            <ScrollText className="mr-2 h-4 w-4" /> Voir Historique (Log)
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                            <Edit className="mr-2 h-4 w-4" /> {tCommon("edit")}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onConfirmDelete} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> {tCommon("delete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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

        try {
            setIsSubmitting(true)
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
                router.refresh()
            }
        } catch (error) {
            toast.error("Une erreur est survenue")
        } finally {
            setIsSubmitting(false)
        }
    }


    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("title")} (${data.length})`}
                    description={t("subtitle")}
                />
                <div className="flex flex-row space-x-2">
                    <Link href="/customers/unpaid">
                        <Button variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:hover:bg-red-900/50">
                            Impayés
                        </Button>
                    </Link>
                    <Link href="/customers/new">
                        <Button id="global-add-new">
                            <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                            <span className="ml-1 text-[10px] opacity-60 font-bold uppercase tracking-widest">[F3]</span>
                        </Button>
                    </Link>
                </div>
            </div>
            <Separator />
            <DataTable searchKey="name" columns={columns} data={data} />

            {/* Advance Payment Modal Overlay */}
            <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Enregistrer un Paiement (Avance / Réglement)</DialogTitle>
                        <DialogDescription>
                            Client: <strong>{selectedCustomer?.name}</strong> <br />
                            Solde actuel: <strong>{selectedCustomer?.balance} DA</strong>
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
                        <Button disabled={isSubmitting} onClick={onSubmitPayment}>
                            {isSubmitting ? "Chargement..." : "Confirmer le Paiement"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
