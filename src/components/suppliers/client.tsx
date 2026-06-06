"use client"

import { Plus, FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useSearchParams } from "next/navigation"

import { ServerDataTable } from "@/components/ui/server-data-table"
import { Button } from "@/components/ui/button"
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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { registerSupplierPayment, deleteSupplier, importSuppliers } from "@/actions/suppliers"
import { ExcelImportModal } from "@/components/ui/excel-import-modal"
import { ImageUpload } from "@/components/ui/image-upload"
import { Edit, Trash, HandCoins, ScrollText } from "lucide-react"

interface SupplierClientProps {
    data: SupplierColumn[]
    accounts: { id: string, name: string, type: string }[]
    totalCount: number
    pageCount: number
    currentPage: number
}

export const SupplierClient: React.FC<SupplierClientProps> = ({ data, accounts, totalCount, pageCount, currentPage }) => {
    const t = useTranslations("Suppliers")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const searchParams = useSearchParams()

    const aPayerActive = searchParams?.get("aPayer") === "true"

    const toggleAPayer = () => {
        const params = new URLSearchParams(searchParams?.toString() || "")
        if (aPayerActive) {
            params.delete("aPayer")
        } else {
            params.set("aPayer", "true")
        }
        params.set("page", "1") // reset page
        router.push(`/suppliers?${params.toString()}`)
    }

    // Modal States
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierColumn | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [accountId, setAccountId] = useState<string>("")
    const [notes, setNotes] = useState<string>("")
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [imageUrl, setImageUrl] = useState<string>("")
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
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => {
                            setSelectedSupplier(supplier)
                            setPaymentAmount("")
                            setAccountId(accounts.length > 0 ? accounts[0].id : "")
                            setNotes("Paiement / Avance Fournisseur")
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
                        onClick={() => router.push(`/suppliers/${supplier.id}/ledger`)}
                        title="Historique"
                    >
                        <ScrollText className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => router.push(`/suppliers/${supplier.id}`)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
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
                date: new Date(date).toISOString(),
                imageUrl: imageUrl || undefined,
            })

            if ("error" in result && result.error) {
                toast.error(result.error)
            } else if ("success" in result) {
                toast.success(result.success)
                setPaymentModalOpen(false)
                setImageUrl("")
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
                    <Button
                        variant={aPayerActive ? "default" : "outline"}
                        className={aPayerActive 
                            ? "bg-rose-600 hover:bg-rose-700 text-white font-bold flex-1 sm:flex-none" 
                            : "text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50 font-bold flex-1 sm:flex-none"
                        }
                        onClick={toggleAPayer}
                    >
                        <HandCoins className="mr-2 h-4 w-4" /> {aPayerActive ? "Tous" : "À Payer"}
                    </Button>
                    <Button variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/50 flex-1 sm:flex-none" onClick={() => setImportOpen(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
                    </Button>
                    <Link href="/suppliers/new" className="flex-1 sm:flex-none">
                        <Button id="global-add-new" className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                            <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest hidden sm:inline">[F3]</span>
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
                                <SearchableSelect
                                    options={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.type})` }))}
                                    value={accountId}
                                    onChange={setAccountId}
                                    placeholder="Sélectionnez un compte"
                                    searchPlaceholder="Rechercher un compte..."
                                />
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
                        <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
                            <Label className="text-right">Justificatif (Photo)</Label>
                            <div className="col-span-3 flex justify-center">
                                <ImageUpload
                                    value={imageUrl ? [imageUrl] : []}
                                    disabled={isSubmitting}
                                    onChange={(url) => setImageUrl(url)}
                                    onRemove={() => setImageUrl("")}
                                />
                            </div>
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
