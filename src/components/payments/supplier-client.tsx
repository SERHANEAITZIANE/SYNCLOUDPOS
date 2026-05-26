"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { useRouter } from "@/i18n/routing"
import { toast } from "react-hot-toast"
import { Plus } from "lucide-react"

import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SupplierPaymentColumn, useSupplierPaymentColumns } from "./supplier-columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { registerSupplierPayment } from "@/actions/suppliers"
import { ImageUpload } from "@/components/ui/image-upload"

interface SupplierPaymentsClientProps {
    data: SupplierPaymentColumn[]
    suppliers: { id: string; name: string }[]
    accounts: { id: string; name: string; type: string }[]
}

export const SupplierPaymentsClient: React.FC<SupplierPaymentsClientProps> = ({ data, suppliers, accounts }) => {
    const columns = useSupplierPaymentColumns()
    const router = useRouter()

    // Filter states
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedSupplier, setSelectedSupplier] = React.useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")

    // Create dialog state
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createLoading, setCreateLoading] = React.useState(false)
    const [newPayment, setNewPayment] = React.useState({
        supplierId: "",
        amount: "",
        accountId: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
        imageUrl: "",
    })

    // Apply filters
    React.useEffect(() => {
        let result = data

        if (selectedSupplier !== "ALL") {
            result = result.filter(item => item.supplierId === selectedSupplier)
        }

        if (selectedAccount !== "ALL") {
            result = result.filter(item => item.accountName === selectedAccount)
        }

        if (dateRange?.from) {
            result = result.filter(item => {
                const itemDate = new Date(item.date)
                itemDate.setHours(0, 0, 0, 0)
                const fromDate = new Date(dateRange.from!)
                fromDate.setHours(0, 0, 0, 0)

                if (dateRange.to) {
                    const toDate = new Date(dateRange.to)
                    toDate.setHours(23, 59, 59, 999)
                    return itemDate >= fromDate && itemDate <= toDate
                }
                return itemDate.getTime() === fromDate.getTime()
            })
        }

        setFilteredData(result)
    }, [data, dateRange, selectedSupplier, selectedAccount])

    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + ' DA'

    const uniqueAccounts = React.useMemo(() => {
        const names = new Set(data.map(d => d.accountName))
        return Array.from(names).filter(Boolean)
    }, [data])

    const handleCreate = async () => {
        try {
            setCreateLoading(true)
            const amount = parseFloat(newPayment.amount)
            if (isNaN(amount) || amount <= 0) {
                toast.error("Montant invalide")
                return
            }
            if (!newPayment.supplierId) {
                toast.error("Veuillez sélectionner un fournisseur")
                return
            }
            if (!newPayment.accountId) {
                toast.error("Veuillez sélectionner une caisse/banque")
                return
            }

            const result = await registerSupplierPayment({
                supplierId: newPayment.supplierId,
                amount,
                accountId: newPayment.accountId,
                notes: newPayment.notes,
                date: newPayment.date,
                imageUrl: newPayment.imageUrl || undefined,
            })

            if ('error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Paiement fournisseur enregistré")
                setCreateOpen(false)
                setNewPayment({ supplierId: "", amount: "", accountId: "", notes: "", date: new Date().toISOString().slice(0, 10), imageUrl: "" })
                router.refresh()
            }
        } catch {
            toast.error("Erreur lors de l'enregistrement")
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Paiements Fournisseurs (${filteredData.length})`}
                    description={"Suivez tous les décaissements fournisseurs — Achats et Règlements"}
                />
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 text-red-700 dark:bg-red-950/30 font-bold px-4 py-2 rounded-md border border-red-200 shadow-sm">
                        Total: {formattedTotal}
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau Paiement
                    </Button>
                </div>
            </div>
            <Separator />

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
                <div className="w-full sm:w-[250px]">
                    <SearchableSelect
                        options={[
                            { value: "ALL", label: "Tous les Fournisseurs" },
                            ...suppliers.map(s => ({ value: s.id, label: s.name }))
                        ]}
                        value={selectedSupplier}
                        onChange={setSelectedSupplier}
                        placeholder="Filtrer par Fournisseur"
                        searchPlaceholder="Rechercher un fournisseur..."
                    />
                </div>

                <div className="w-full sm:w-[220px]">
                    <SearchableSelect
                        options={[
                            { value: "ALL", label: "Toutes les modalités" },
                            ...uniqueAccounts.map(name => ({ value: name, label: name }))
                        ]}
                        value={selectedAccount}
                        onChange={setSelectedAccount}
                        placeholder="Modalité de paiement"
                        searchPlaceholder="Rechercher une modalité..."
                    />
                </div>

                <div className="w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <DataTable exportTitle={"Export"} exportDescription={""} searchKey="supplierName" columns={columns} data={filteredData} />

            {/* Create Payment Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nouveau Paiement Fournisseur</DialogTitle>
                        <DialogDescription>
                            Enregistrer un règlement de dette fournisseur
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Fournisseur</Label>
                            <SearchableSelect
                                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                value={newPayment.supplierId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, supplierId: v }))}
                                placeholder="Sélectionner un fournisseur"
                                searchPlaceholder="Rechercher un fournisseur..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Montant (DA)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={newPayment.amount}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Caisse / Banque</Label>
                            <SearchableSelect
                                options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type})` }))}
                                value={newPayment.accountId}
                                onChange={(v) => setNewPayment(prev => ({ ...prev, accountId: v }))}
                                placeholder="Sélectionner une caisse"
                                searchPlaceholder="Rechercher une caisse..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={newPayment.date}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Observation</Label>
                            <Input
                                value={newPayment.notes}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Note optionnelle"
                            />
                        </div>
                        <div className="grid gap-2 items-center justify-center border-t pt-4">
                            <Label className="w-full text-center">Justificatif de Paiement (Photo)</Label>
                            <ImageUpload
                                value={newPayment.imageUrl ? [newPayment.imageUrl] : []}
                                disabled={createLoading}
                                onChange={(url) => setNewPayment(prev => ({ ...prev, imageUrl: url }))}
                                onRemove={() => setNewPayment(prev => ({ ...prev, imageUrl: "" }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreate} disabled={createLoading}>
                            {createLoading ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
