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
import { PaymentColumn, usePaymentColumns } from "./columns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { registerCustomerPayment } from "@/actions/customers"

interface PaymentsClientProps {
    data: PaymentColumn[]
    customers: { id: string; name: string }[]
    accounts: { id: string; name: string; type: string }[]
}

export const PaymentsClient: React.FC<PaymentsClientProps> = ({ data, customers, accounts }) => {
    const columns = usePaymentColumns()
    const router = useRouter()

    // Filter states
    const [filteredData, setFilteredData] = React.useState(data)
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
    const [selectedCustomer, setSelectedCustomer] = React.useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")

    // Create dialog state
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createLoading, setCreateLoading] = React.useState(false)
    const [newPayment, setNewPayment] = React.useState({
        customerId: "",
        amount: "",
        accountId: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
    })

    // Apply filters
    React.useEffect(() => {
        let result = data

        // 1. Filter by Customer
        if (selectedCustomer !== "ALL") {
            result = result.filter(item => item.customerId === selectedCustomer)
        }

        // 2. Filter by Account (Modalité de paiement)
        if (selectedAccount !== "ALL") {
            result = result.filter(item => item.accountName === selectedAccount)
        }

        // 3. Filter by Date range
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
    }, [data, dateRange, selectedCustomer, selectedAccount])

    // Calculate total
    const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0)
    const formattedTotal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(totalAmount) + ' DA'

    // Get unique account names for the filter
    const uniqueAccounts = React.useMemo(() => {
        const names = new Set(data.map(d => d.accountName))
        return Array.from(names).filter(Boolean)
    }, [data])

    // Create payment handler
    const handleCreate = async () => {
        try {
            setCreateLoading(true)
            const amount = parseFloat(newPayment.amount)
            if (isNaN(amount) || amount <= 0) {
                toast.error("Montant invalide")
                return
            }
            if (!newPayment.customerId) {
                toast.error("Veuillez sélectionner un client")
                return
            }
            if (!newPayment.accountId) {
                toast.error("Veuillez sélectionner une caisse/banque")
                return
            }

            const result = await registerCustomerPayment({
                customerId: newPayment.customerId,
                amount,
                accountId: newPayment.accountId,
                notes: newPayment.notes,
                date: newPayment.date,
            })

            if ('error' in result) {
                toast.error(result.error as string)
            } else {
                toast.success("Paiement enregistré")
                setCreateOpen(false)
                setNewPayment({ customerId: "", amount: "", accountId: "", notes: "", date: new Date().toISOString().slice(0, 10) })
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
                    title={`Paiements Clients (${filteredData.length})`}
                    description={"Suivez tous les encaissements clients — Ventes directes et Recouvrements"}
                />
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 font-bold px-4 py-2 rounded-md border border-emerald-200 shadow-sm">
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
                {/* Filter by Client */}
                <div className="w-full sm:w-[250px]">
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrer par Client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les Clients</SelectItem>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filter by Modalité (Account) */}
                <div className="w-full sm:w-[220px]">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger>
                            <SelectValue placeholder="Modalité de paiement" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Toutes les modalités</SelectItem>
                            {uniqueAccounts.map(name => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filter by Date */}
                <div className="w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            <DataTable exportTitle={"Export"} exportDescription={""} searchKey="customerName" columns={columns} data={filteredData} />

            {/* Create Payment Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nouveau Paiement Client</DialogTitle>
                        <DialogDescription>
                            Enregistrer un recouvrement de dette client
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Client</Label>
                            <Select value={newPayment.customerId} onValueChange={(v) => setNewPayment(prev => ({ ...prev, customerId: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            <Select value={newPayment.accountId} onValueChange={(v) => setNewPayment(prev => ({ ...prev, accountId: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une caisse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.name} ({a.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
