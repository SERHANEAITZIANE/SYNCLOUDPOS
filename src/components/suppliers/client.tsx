"use client"

import { Plus, FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useSupplierColumns } from "./columns"
import { SupplierColumn } from "./types"
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
import { registerSupplierPayment, deleteSupplier, importSuppliers } from "@/actions/suppliers"
import { ExcelImportModal } from "@/components/ui/excel-import-modal"
import { Edit, MoreHorizontal, Trash, HandCoins, ScrollText } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SupplierClientProps {
    data: SupplierColumn[]
    accounts: { id: string, name: string, type: string }[]
}

export const SupplierClient: React.FC<SupplierClientProps> = ({ data, accounts }) => {
    const t = useTranslations("Suppliers")
    const tCommon = useTranslations("Common")
    const router = useRouter()

    // Modal States
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierColumn | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [accountId, setAccountId] = useState<string>("")
    const [notes, setNotes] = useState<string>("")
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [importOpen, setImportOpen] = useState(false)

    // Base Columns
    const baseColumns = useSupplierColumns()

    // Augment columns to include our specific payments action alongside normal ones
    const actionColumn = {
        id: "actions",
        cell: ({ row }: any) => {
            const supplier = row.original

            const onConfirmDelete = async () => {
                try {
                    await deleteSupplier(supplier.id)
                    toast.success("Fournisseur supprimé.")
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
                            setSelectedSupplier(supplier)
                            setPaymentAmount("")
                            setAccountId(accounts.length > 0 ? accounts[0].id : "")
                            setNotes("Paiement / Avance Fournisseur")
                            setDate(new Date().toISOString().split('T')[0])
                            setPaymentModalOpen(true)
                        }}>
                            <HandCoins className="mr-2 h-4 w-4 text-emerald-600" /> Ajouter Paiement
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => router.push(`/suppliers/${supplier.id}/ledger`)}>
                            <ScrollText className="mr-2 h-4 w-4" /> Voir Historique (Log)
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => router.push(`/suppliers/${supplier.id}`)}>
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
        if (!selectedSupplier) return
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
            const result = await registerSupplierPayment({
                supplierId: selectedSupplier.id,
                amount,
                accountId,
                notes,
                date: new Date(date).toISOString()
            })

            if ("error" in result && result.error) {
                toast.error(result.error)
            } else if ("success" in result) {
                toast.success(result.success)
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
                <div className="flex flex-row flex-wrap gap-2">
                    <Button variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/50" onClick={() => setImportOpen(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
                    </Button>
                    <Link href="/suppliers/new">
                        <Button id="global-add-new">
                            <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                            <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F3]</span>
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
                        <DialogTitle>Enregistrer un Paiement Fournisseur</DialogTitle>
                        <DialogDescription>
                            Fournisseur: <strong>{selectedSupplier?.name}</strong> <br />
                            Dette/Solde actuel: <strong>{selectedSupplier?.balance} DA</strong>
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

            {/* Excel Import Modal */}
            <ExcelImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Importer des Fournisseurs depuis Excel"
                description="Téléchargez le modèle, remplissez-le, puis importez."
                columns={[
                    { key: "name", label: "Nom" },
                    { key: "contactPerson", label: "Contact" },
                    { key: "phone", label: "Téléphone" },
                    { key: "email", label: "Email" },
                    { key: "address", label: "Adresse" },
                    { key: "nif", label: "NIF" },
                    { key: "nis", label: "NIS" },
                    { key: "artImposition", label: "Article Imposition" },
                    { key: "rc", label: "NRC" },
                    { key: "rib", label: "RIB" },
                ]}
                onImport={importSuppliers as any}
                templateFileName="fournisseurs_template"
            />
        </>
    )
}
