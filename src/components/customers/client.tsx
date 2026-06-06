"use client"

import { Plus, FileSpreadsheet, Star, Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { ServerDataTable } from "@/components/ui/server-data-table"
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
import { registerCustomerPayment, deleteCustomer, importCustomers } from "@/actions/customers"
import { ExcelImportModal } from "@/components/ui/excel-import-modal"
import { Edit, Trash, ScrollText, HandCoins } from "lucide-react"
import { LoyaltyBadgeModal } from "./loyalty-badge-modal"

interface CustomerClientProps {
    data: CustomerColumn[]
    accounts: { id: string, name: string, type: string }[]
    totalCount: number
    pageCount: number
    currentPage: number
}

export const CustomerClient: React.FC<CustomerClientProps> = ({ data, accounts, totalCount, pageCount, currentPage }) => {
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
    const [badgeModalOpen, setBadgeModalOpen] = useState(false)
    const [badgeCustomer, setBadgeCustomer] = useState<CustomerColumn | null>(null)
    const [importModalOpen, setImportModalOpen] = useState(false)

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
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => {
                            setSelectedCustomer(customer)
                            setPaymentAmount("")
                            setAccountId(accounts.length > 0 ? accounts[0].id : "")
                            setNotes("Paiement / Avance")
                            setDate(new Date().toISOString().split('T')[0])
                            setPaymentModalOpen(true)
                        }}
                        title="Ajouter Paiement"
                    >
                        <HandCoins className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        onClick={() => router.push(`/customers/${customer.id}/ledger`)}
                        title="Historique"
                    >
                        <ScrollText className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => router.push(`/customers/${customer.id}`)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                            setBadgeCustomer(customer)
                            setBadgeModalOpen(true)
                        }}
                        title="Carte Fidélité"
                    >
                        <Star className="h-4 w-4 fill-current" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={onConfirmDelete}
                        title={tCommon("delete")}
                    >
                        <Trash className="h-4 w-4" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Heading
                    title={`${t("title")} (${totalCount})`}
                    description={t("subtitle")}
                />
                <div className="flex flex-row flex-wrap gap-2 w-full sm:w-auto">
                    <Link href="/customers/unpaid" className="flex-1 sm:flex-none">
                        <Button variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:hover:bg-red-900/50 w-full">
                            Impayés
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={() => setImportModalOpen(true)} className="flex-1 sm:flex-none">
                        <Upload className="mr-2 h-4 w-4" /> Importer Excel
                    </Button>
                    <Link href="/customers/new" className="flex-1 sm:flex-none">
                        <Button id="global-add-new" className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                            <span className="ml-1 text-[10px] opacity-60 font-bold uppercase tracking-widest hidden sm:inline">[F3]</span>
                        </Button>
                    </Link>
                </div>
            </div>
            <Separator />
            <ServerDataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="name" columns={columns as any} data={data} pageCount={pageCount} currentPage={currentPage} />

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

            {/* Loyalty Badge Modal */}
            {badgeCustomer && (
                <LoyaltyBadgeModal
                    isOpen={badgeModalOpen}
                    onClose={() => { setBadgeModalOpen(false); setBadgeCustomer(null) }}
                    customer={{
                        id: badgeCustomer.id,
                        name: badgeCustomer.name,
                        phone: badgeCustomer.phone,
                        barcode: badgeCustomer.barcode,
                        loyaltyPoints: badgeCustomer.loyaltyPoints ?? 0
                    }}
                />
            )}

            {/* Excel Import Modal */}
            <ExcelImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Importer des Clients depuis Excel"
                description="Importez vos clients avec toutes leurs informations : nom, téléphone, adresse, solde, NIF, NIS, RC, etc."
                templateFileName="modele_clients"
                columns={[
                    { label: "Nom", key: "name" },
                    { label: "Téléphone", key: "phone" },
                    { label: "Email", key: "email" },
                    { label: "Adresse", key: "address" },
                    { label: "Ville", key: "city" },
                    { label: "NIF", key: "nif" },
                    { label: "NIS", key: "nis" },
                    { label: "RC", key: "rc" },
                    { label: "RIB", key: "rib" },
                    { label: "Art. Imposition", key: "artImposition" },
                    { label: "Solde", key: "balance" },
                    { label: "Type Client", key: "clientType" },
                    { label: "Notes", key: "notes" },
                ]}
                onImport={async (rows) => {
                    const result = await importCustomers(rows)
                    if (result.success) router.refresh()
                    return result
                }}
            />
        </>
    )
}
