"use client"

import { useState, useEffect, useTransition } from "react"
import { getCommissionReport } from "@/actions/commissions"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Trophy, TrendingUp, Calculator, Printer, Wallet, Calendar, Plus, Trash2, ShieldAlert } from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createSellerPayment, getSellerPayments, deleteSellerPayment } from "@/actions/seller-payments"
import { useSession } from "next-auth/react"

const MONTHS = [
    { v: 0, l: "Toute l'année" },
    { v: 1, l: "Janvier" }, { v: 2, l: "Février" }, { v: 3, l: "Mars" },
    { v: 4, l: "Avril" }, { v: 5, l: "Mai" }, { v: 6, l: "Juin" },
    { v: 7, l: "Juillet" }, { v: 8, l: "Août" }, { v: 9, l: "Septembre" },
    { v: 10, l: "Octobre" }, { v: 11, l: "Novembre" }, { v: 12, l: "Décembre" },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i)

function fmt(n: number) { 
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2 }).format(n) 
}

export default function CommissionsPage() {
    const { data: session } = useSession()
    const [year, setYear] = useState(currentYear)
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [result, setResult] = useState<any>(null)
    const [payments, setPayments] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<"sellers" | "payments">("sellers")
    const [isPending, startTransition] = useTransition()

    // Payment Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; balance: number } | null>(null)
    const [paymentAmount, setPaymentAmount] = useState(0)
    const [paymentNotes, setPaymentNotes] = useState("")
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
    const [submittingPayment, setSubmittingPayment] = useState(false)

    const load = () => {
        startTransition(async () => {
            const data = await getCommissionReport(year, month === 0 ? undefined : month)
            if ("error" in data) {
                toast.error(data.error)
            } else {
                setResult(data)
            }
            
            const payData = await getSellerPayments()
            setPayments(payData)
        })
    }

    useEffect(() => { 
        load() 
    }, [year, month])

    const handleOpenPaymentModal = (user: { id: string; name: string; balance: number }) => {
        setSelectedUser(user)
        setPaymentAmount(Math.max(0, Number(user.balance.toFixed(2))))
        setPaymentDate(new Date().toISOString().split("T")[0])
        setPaymentNotes("")
        setIsModalOpen(true)
    }

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return
        if (paymentAmount <= 0) {
            toast.error("Le montant doit être supérieur à 0")
            return
        }

        try {
            setSubmittingPayment(true)
            const res = await createSellerPayment({
                userId: selectedUser.id,
                amount: paymentAmount,
                notes: paymentNotes,
                date: paymentDate
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || "Règlement enregistré avec succès !")
                setIsModalOpen(false)
                setSelectedUser(null)
                load() // Reload statistics and payment history
            }
        } catch (err) {
            console.error(err)
            toast.error("Impossible d'enregistrer le règlement")
        } finally {
            setSubmittingPayment(false)
        }
    }

    const handleDeletePayment = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce règlement de commission ? Le solde actuel du vendeur sera automatiquement réajusté.")) {
            return
        }

        try {
            const res = await deleteSellerPayment(id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || "Règlement supprimé avec succès !")
                load()
            }
        } catch (err) {
            console.error(err)
            toast.error("Impossible de supprimer le règlement")
        }
    }

    const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"]

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Commissions Vendeurs
                    </h1>
                    <p className="text-muted-foreground mt-1">Gérez les commissions sur les Bons de Livraison (BL) encaissés et effectuez les règlements</p>
                </div>
                <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-xl no-print border-gray-200 dark:border-gray-800">
                    <Printer size={16} /> Imprimer la synthèse
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end no-print bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Période (Mois)</Label>
                    <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                        <SelectTrigger className="w-48 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTHS.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Année</Label>
                    <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                        <SelectTrigger className="w-32 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {result && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col justify-between shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode de Calcul</span>
                                <Calculator className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="mt-4">
                                <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                                    {result.commissionMode === "BRAND" ? "Par Marque" : "Par Catégorie"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Taux global de secours : {result.commissionRate}%</p>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col justify-between shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CA Encaissé (Période)</span>
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(result.totalRevenue)}</p>
                                <p className="text-xs text-muted-foreground mt-1">DA</p>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col justify-between shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comm. Acquises (Période)</span>
                                <Trophy className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">{fmt(result.totalCommissionEarned)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Au prorata des BL payés</p>
                            </div>
                        </div>

                        <div className={cn(
                            "p-5 rounded-2xl border flex flex-col justify-between shadow-sm transition-all",
                            result.totalBalance > 0 
                                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50" 
                                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                        )}>
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Solde Actuel Dû (Total)</span>
                                <Wallet className={cn("h-5 w-5", result.totalBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400")} />
                            </div>
                            <div className="mt-4">
                                <p className={cn("text-2xl font-black tabular-nums", result.totalBalance > 0 ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-white")}>
                                    {fmt(result.totalBalance)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Reste à verser aux commerciaux</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab Selection */}
                    <div className="flex border-b border-gray-200 dark:border-gray-800 no-print">
                        <button
                            onClick={() => setActiveTab("sellers")}
                            className={cn(
                                "py-3 px-6 font-bold text-sm border-b-2 transition-all",
                                activeTab === "sellers"
                                    ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                                    : "border-transparent text-muted-foreground hover:text-gray-600"
                            )}
                        >
                            Performance & Soldes des Vendeurs
                        </button>
                        <button
                            onClick={() => setActiveTab("payments")}
                            className={cn(
                                "py-3 px-6 font-bold text-sm border-b-2 transition-all",
                                activeTab === "payments"
                                    ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                                    : "border-transparent text-muted-foreground hover:text-gray-600"
                            )}
                        >
                            Historique des Règlements ({payments.length})
                        </button>
                    </div>

                    {/* Sellers Performance Tab */}
                    {activeTab === "sellers" && (
                        result.rows.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>Aucune transaction ou commission enregistrée sur cette période</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-900 dark:bg-gray-800 text-white">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Rang</th>
                                                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Vendeur</th>
                                                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">BL Validés</th>
                                                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">CA Encaissé (Période)</th>
                                                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Comm. Acquise (Période)</th>
                                                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Solde Restant Dû</th>
                                                <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-xs no-print">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {result.rows.map((row: any, i: number) => (
                                                <tr key={row.userId} className={cn(
                                                    "hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors",
                                                    i === 0 ? "bg-amber-50/10 dark:bg-amber-950/5" : ""
                                                )}>
                                                    <td className="px-6 py-4">
                                                        <span className={cn("text-lg font-black", i < 3 ? medalColors[i] : "text-muted-foreground")}>
                                                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-950 dark:text-white">{row.userName}</p>
                                                        <p className="text-xs text-muted-foreground">{row.role}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">{row.orderCount}</td>
                                                    <td className="px-6 py-4 text-right font-mono font-semibold">{fmt(row.totalRevenue)} DA</td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(row.commissionAmount)} DA</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={cn(
                                                            "font-mono font-black px-2.5 py-1 rounded-full text-xs",
                                                            row.currentBalance > 0
                                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                        )}>
                                                            {fmt(row.currentBalance)} DA
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center no-print">
                                                        <Button
                                                            size="sm"
                                                            variant={row.currentBalance > 0 ? "default" : "outline"}
                                                            className="rounded-xl h-8 text-xs font-bold gap-1"
                                                            onClick={() => handleOpenPaymentModal({
                                                                id: row.userId,
                                                                name: row.userName,
                                                                balance: row.currentBalance
                                                            })}
                                                        >
                                                            <Wallet size={12} /> Régler
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                    {/* Payments History Tab */}
                    {activeTab === "payments" && (
                        payments.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>Aucun règlement de commission n'a été enregistré à ce jour.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-900 dark:bg-gray-800 text-white">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Date</th>
                                                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Bénéficiaire</th>
                                                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">Notes / Méthode</th>
                                                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">Montant Réglé</th>
                                                <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-xs no-print">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {payments.map((payment: any) => (
                                                <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-muted-foreground">
                                                        {new Date(payment.date).toLocaleDateString("fr-FR", {
                                                            year: "numeric", month: "long", day: "numeric"
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                        {payment.user?.name || "Inconnu"}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground italic">
                                                        {payment.notes || "Versement de commissions"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                        -{fmt(Number(payment.amount))} DA
                                                    </td>
                                                    <td className="px-6 py-4 text-center no-print">
                                                        {session?.user?.role === "ADMIN" && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                                onClick={() => handleDeletePayment(payment.id)}
                                                                title="Annuler ce règlement"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </>
            )}

            {isPending && !result && (
                <div className="py-20 text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20 animate-pulse" />
                    <p>Calcul des commissions en cours...</p>
                </div>
            )}

            {/* Custom Payment Dialog */}
            <Modal
                title="Enregistrer un versement de commission"
                description={`Saisissez le montant versé à ${selectedUser?.name || ""} pour solder ses commissions.`}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                className="max-w-md"
            >
                <form onSubmit={handleRecordPayment} className="space-y-4 pt-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                        <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Solde Actuel Restant Dû</Label>
                        <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                            {selectedUser ? fmt(selectedUser.balance) : "0,00"} DA
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount" className="font-bold text-xs uppercase text-muted-foreground">Montant du règlement (DA)</Label>
                        <Input
                            id="amount"
                            type="number"
                            min={0.01}
                            step={0.01}
                            required
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(Number(e.target.value))}
                            className="rounded-xl font-mono text-lg font-bold"
                            disabled={submittingPayment}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date" className="font-bold text-xs uppercase text-muted-foreground">Date du règlement</Label>
                        <Input
                            id="date"
                            type="date"
                            required
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="rounded-xl"
                            disabled={submittingPayment}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="font-bold text-xs uppercase text-muted-foreground">Notes / Mode de règlement</Label>
                        <Textarea
                            id="notes"
                            placeholder="Ex: Espèces, Virement CCP, Chèque n°12345..."
                            value={paymentNotes}
                            onChange={e => setPaymentNotes(e.target.value)}
                            className="rounded-xl resize-none"
                            rows={3}
                            disabled={submittingPayment}
                        />
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-xl"
                            disabled={submittingPayment}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl gap-2 font-bold"
                            disabled={submittingPayment}
                        >
                            {submittingPayment ? "Enregistrement..." : "Enregistrer le règlement"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
