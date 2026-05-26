"use client"

import { useState, useTransition, useCallback } from "react"
import { format } from "date-fns"
import {
    BookOpen, Download, FileText, TrendingUp, TrendingDown,
    Calendar, Filter, Wallet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getSalesJournal, getPurchaseJournal, type SalesJournalEntry } from "@/actions/journals"
import { getCashbook } from "@/actions/treasury"
import { toast } from "react-hot-toast"

function formatDA(amount: number): string {
    return new Intl.NumberFormat("fr-DZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)
}

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

type JournalTab = "sales" | "purchases" | "cashbook"

interface SalesJournalData {
    entries: SalesJournalEntry[]
    totals: {
        totalHT: number
        totalTVA19: number
        totalTVA9: number
        totalTVA0HT: number
        totalTVA: number
        totalTimbre: number
        totalTTC: number
        invoiceCount: number
        creditNoteCount: number
    }
    period: string
    tenant: {
        name: string
        nif: string | null
        rc: string | null
        address: string | null
    } | null
}

interface PurchaseJournalData {
    entries: any[]
    totals: {
        totalHT: number
        totalTVA19: number
        totalTVA9: number
        totalTVA0HT: number
        totalTVA: number
        totalWithholding: number
        totalTTC: number
        purchaseCount: number
    }
    period: string
    tenant: any
}

interface CashbookData {
    entries: any[]
    totals: {
        openingBalance: number
        totalIn: number
        totalOut: number
        closingBalance: number
    }
    accountName: string
    period: string
}

export default function JournalsClient({ accounts = [] }: { accounts?: any[] }) {
    const now = new Date()
    const [activeTab, setActiveTab] = useState<JournalTab>("sales")
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [typeFilter, setTypeFilter] = useState("ALL")
    const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : "")
    const [salesData, setSalesData] = useState<SalesJournalData | null>(null)
    const [purchaseData, setPurchaseData] = useState<PurchaseJournalData | null>(null)
    const [cashbookData, setCashbookData] = useState<CashbookData | null>(null)
    const [isPending, startTransition] = useTransition()

    const loadData = useCallback(() => {
        startTransition(async () => {
            try {
                if (activeTab === "sales") {
                    const result = await getSalesJournal(year, month, typeFilter)
                    if ("error" in result) {
                        toast.error(result.error)
                        return
                    }
                    setSalesData(result)
                } else if (activeTab === "purchases") {
                    const result = await getPurchaseJournal(year, month)
                    if ("error" in result) {
                        toast.error(result.error)
                        return
                    }
                    setPurchaseData(result as PurchaseJournalData)
                } else if (activeTab === "cashbook") {
                    if (!accountId) {
                        toast.error("Veuillez sélectionner un compte")
                        return
                    }
                    const result = await getCashbook(accountId, year, month)
                    if ("error" in result) {
                        toast.error(result.error)
                        return
                    }
                    setCashbookData(result as CashbookData)
                }
            } catch {
                toast.error("Erreur lors du chargement")
            }
        })
    }, [activeTab, year, month, typeFilter, accountId])

    const exportCSV = () => {
        if (activeTab === "sales" && salesData) {
            const headers = ["Date", "N°", "Type", "Client", "NIF Client", "HT", "TVA 19%", "TVA 9%", "Exonéré HT", "Total TVA", "Timbre", "TTC", "Paiement"]
            const rows = salesData.entries.map(e => [
                format(new Date(e.date), "dd/MM/yyyy"),
                e.receiptNumber || "",
                e.type,
                e.customerName,
                e.customerNif || "",
                formatDA(e.subtotalHT),
                formatDA(e.tva19),
                formatDA(e.tva9),
                formatDA(e.tva0HT),
                formatDA(e.totalTVA),
                formatDA(e.stampTax),
                formatDA(e.totalTTC),
                e.paymentMethod
            ])
            rows.push([
                "TOTAUX", "", "", "", "",
                formatDA(salesData.totals.totalHT),
                formatDA(salesData.totals.totalTVA19),
                formatDA(salesData.totals.totalTVA9),
                formatDA(salesData.totals.totalTVA0HT),
                formatDA(salesData.totals.totalTVA),
                formatDA(salesData.totals.totalTimbre),
                formatDA(salesData.totals.totalTTC),
                ""
            ])

            const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(";")).join("\n")
            const BOM = "\uFEFF"
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `journal-ventes-${year}-${String(month).padStart(2, "0")}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Export CSV téléchargé")
        } else if (activeTab === "purchases" && purchaseData) {
            const headers = ["Date", "Fournisseur", "NIF Fournisseur", "Référence", "Statut", "HT", "TVA 19%", "TVA 9%", "Exonéré HT", "Total TVA", "Retenue Source", "TTC"]
            const rows = purchaseData.entries.map((e: any) => [
                format(new Date(e.date), "dd/MM/yyyy"),
                e.supplierName,
                e.supplierNif || "",
                e.reference || "",
                e.status,
                formatDA(e.subtotalHT),
                formatDA(e.tva19),
                formatDA(e.tva9),
                formatDA(e.tva0HT),
                formatDA(e.totalTVA),
                formatDA(e.withholdingAmount),
                formatDA(e.totalTTC)
            ])
            rows.push([
                "TOTAUX", "", "", "", "",
                formatDA(purchaseData.totals.totalHT),
                formatDA(purchaseData.totals.totalTVA19),
                formatDA(purchaseData.totals.totalTVA9),
                formatDA(purchaseData.totals.totalTVA0HT),
                formatDA(purchaseData.totals.totalTVA),
                formatDA(purchaseData.totals.totalWithholding),
                formatDA(purchaseData.totals.totalTTC)
            ])

            const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(";")).join("\n")
            const BOM = "\uFEFF"
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `journal-achats-${year}-${String(month).padStart(2, "0")}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Export CSV téléchargé")
        } else if (activeTab === "cashbook" && cashbookData) {
            const headers = ["Date", "Description", "Réf", "Recettes (+)", "Dépenses (-)", "Solde"]
            const rows = [
                ["", "SOLDE INITIAL", "", "", "", formatDA(cashbookData.totals.openingBalance)]
            ]
            cashbookData.entries.forEach((e: any) => {
                rows.push([
                    format(new Date(e.date), "dd/MM/yyyy HH:mm"),
                    e.description,
                    e.referenceId || "",
                    e.type === "CREDIT" ? formatDA(e.amount) : "",
                    e.type === "DEBIT" ? formatDA(e.amount) : "",
                    formatDA(e.balanceAfter)
                ])
            })
            rows.push([
                "TOTAUX", "", "", 
                formatDA(cashbookData.totals.totalIn),
                formatDA(cashbookData.totals.totalOut),
                ""
            ])
            rows.push([
                "", "SOLDE FINAL", "", "", "", formatDA(cashbookData.totals.closingBalance)
            ])

            const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(";")).join("\n")
            const BOM = "\uFEFF"
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `livre-caisse-${year}-${String(month).padStart(2, "0")}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Export CSV téléchargé")
        }
    }

    const data = activeTab === "sales" ? salesData : activeTab === "purchases" ? purchaseData : cashbookData
    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-8 w-8 text-indigo-500" />
                        Journaux Comptables
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Journaux des ventes et achats — Documents réglementaires DGI
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <Button
                    variant={activeTab === "sales" ? "default" : "outline"}
                    onClick={() => { setActiveTab("sales"); setSalesData(null) }}
                    className={activeTab === "sales" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Journal des Ventes
                </Button>
                <Button
                    variant={activeTab === "purchases" ? "default" : "outline"}
                    onClick={() => { setActiveTab("purchases"); setPurchaseData(null) }}
                    className={activeTab === "purchases" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Journal des Achats
                </Button>
                <Button
                    variant={activeTab === "cashbook" ? "default" : "outline"}
                    onClick={() => { setActiveTab("cashbook"); setCashbookData(null) }}
                    className={activeTab === "cashbook" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                >
                    <Wallet className="h-4 w-4 mr-2" />
                    Livre de Caisse
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border bg-card">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Année
                    </label>
                    <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Mois
                    </label>
                    <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m, i) => (
                                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {activeTab === "sales" && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Type
                        </label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les types</SelectItem>
                                <SelectItem value="INVOICE">Factures uniquement</SelectItem>
                                <SelectItem value="ORDER">Bons de livraison</SelectItem>
                                <SelectItem value="CREDIT_NOTE">Avoirs</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {activeTab === "cashbook" && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Wallet className="h-3 w-3" /> Compte
                        </label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Button onClick={loadData} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                    {isPending ? "Chargement..." : "Générer le journal"}
                </Button>

                {data && (
                    <Button variant="outline" onClick={exportCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter CSV
                    </Button>
                )}
            </div>

            {/* Results — Sales Journal */}
            {activeTab === "sales" && salesData && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <SummaryCard label="Total HT" value={formatDA(salesData.totals.totalHT)} color="blue" />
                        <SummaryCard label="TVA 19%" value={formatDA(salesData.totals.totalTVA19)} color="orange" />
                        <SummaryCard label="TVA 9%" value={formatDA(salesData.totals.totalTVA9)} color="amber" />
                        <SummaryCard label="Total TVA" value={formatDA(salesData.totals.totalTVA)} color="red" />
                        <SummaryCard label="Timbre" value={formatDA(salesData.totals.totalTimbre)} color="purple" />
                        <SummaryCard label="Total TTC" value={formatDA(salesData.totals.totalTTC)} color="green" />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>
                            {salesData.totals.invoiceCount} facture(s)
                            {salesData.totals.creditNoteCount > 0 && ` · ${salesData.totals.creditNoteCount} avoir(s)`}
                            {" · "}Période: <strong>{salesData.period}</strong>
                        </span>
                    </div>

                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">N°</TableHead>
                                    <TableHead className="font-bold">Type</TableHead>
                                    <TableHead className="font-bold">Client</TableHead>
                                    <TableHead className="font-bold">NIF</TableHead>
                                    <TableHead className="text-right font-bold">HT</TableHead>
                                    <TableHead className="text-right font-bold">TVA 19%</TableHead>
                                    <TableHead className="text-right font-bold">TVA 9%</TableHead>
                                    <TableHead className="text-right font-bold">Total TVA</TableHead>
                                    <TableHead className="text-right font-bold">Timbre</TableHead>
                                    <TableHead className="text-right font-bold">TTC</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salesData.entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                            Aucune écriture pour cette période
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    salesData.entries.map((entry) => (
                                        <TableRow key={entry.id} className={entry.type === "CREDIT_NOTE" ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                                            <TableCell className="font-mono text-xs">
                                                {format(new Date(entry.date), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-medium">
                                                {entry.receiptNumber || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={entry.type === "CREDIT_NOTE" ? "destructive" : entry.type === "INVOICE" ? "default" : "secondary"} className="text-[10px]">
                                                    {entry.type === "INVOICE" ? "FA" : entry.type === "CREDIT_NOTE" ? "AV" : "BL"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate">{entry.customerName}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{entry.customerNif || "—"}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.subtotalHT)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.tva19)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.tva9)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs font-medium">{formatDA(entry.totalTVA)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.stampTax)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs font-bold">{formatDA(entry.totalTTC)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {salesData.entries.length > 0 && (
                                <TableFooter>
                                    <TableRow className="bg-indigo-50 dark:bg-indigo-950/30 font-bold">
                                        <TableCell colSpan={5}>TOTAUX</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(salesData.totals.totalHT)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(salesData.totals.totalTVA19)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(salesData.totals.totalTVA9)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(salesData.totals.totalTVA)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(salesData.totals.totalTimbre)}</TableCell>
                                        <TableCell className="text-right font-mono text-lg">{formatDA(salesData.totals.totalTTC)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </div>
            )}

            {/* Results — Purchase Journal */}
            {activeTab === "purchases" && purchaseData && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <SummaryCard label="Total HT" value={formatDA(purchaseData.totals.totalHT)} color="blue" />
                        <SummaryCard label="TVA 19%" value={formatDA(purchaseData.totals.totalTVA19)} color="orange" />
                        <SummaryCard label="TVA 9%" value={formatDA(purchaseData.totals.totalTVA9)} color="amber" />
                        <SummaryCard label="TVA Déductible" value={formatDA(purchaseData.totals.totalTVA)} color="green" />
                        <SummaryCard label="Retenue Source" value={formatDA(purchaseData.totals.totalWithholding)} color="red" />
                        <SummaryCard label="Total TTC" value={formatDA(purchaseData.totals.totalTTC)} color="purple" />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>
                            {purchaseData.totals.purchaseCount} achat(s) · Période: <strong>{purchaseData.period}</strong>
                        </span>
                    </div>

                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Fournisseur</TableHead>
                                    <TableHead className="font-bold">NIF</TableHead>
                                    <TableHead className="font-bold">Référence</TableHead>
                                    <TableHead className="font-bold">Statut</TableHead>
                                    <TableHead className="text-right font-bold">HT</TableHead>
                                    <TableHead className="text-right font-bold">TVA 19%</TableHead>
                                    <TableHead className="text-right font-bold">TVA 9%</TableHead>
                                    <TableHead className="text-right font-bold">TVA Déductible</TableHead>
                                    <TableHead className="text-right font-bold">Retenue Source</TableHead>
                                    <TableHead className="text-right font-bold">TTC</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseData.entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                            Aucun achat pour cette période
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchaseData.entries.map((entry: any) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-mono text-xs">
                                                {format(new Date(entry.date), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate">{entry.supplierName}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{entry.supplierNif || "—"}</TableCell>
                                            <TableCell className="font-mono text-xs font-semibold">{entry.reference || "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px]">{entry.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.subtotalHT)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.tva19)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{formatDA(entry.tva9)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs font-medium">{formatDA(entry.totalTVA)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-red-600">{formatDA(entry.withholdingAmount)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs font-bold">{formatDA(entry.totalTTC)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {purchaseData.entries.length > 0 && (
                                <TableFooter>
                                    <TableRow className="bg-blue-50 dark:bg-blue-950/30 font-bold">
                                        <TableCell colSpan={5}>TOTAUX</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(purchaseData.totals.totalHT)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(purchaseData.totals.totalTVA19)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(purchaseData.totals.totalTVA9)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatDA(purchaseData.totals.totalTVA)}</TableCell>
                                        <TableCell className="text-right font-mono text-red-600">{formatDA(purchaseData.totals.totalWithholding)}</TableCell>
                                        <TableCell className="text-right font-mono text-lg">{formatDA(purchaseData.totals.totalTTC)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </div>
            )}

            {/* Results — Cashbook */}
            {activeTab === "cashbook" && cashbookData && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard label="Solde Initial" value={formatDA(cashbookData.totals.openingBalance)} color="blue" />
                        <SummaryCard label="Total Recettes (+)" value={formatDA(cashbookData.totals.totalIn)} color="green" />
                        <SummaryCard label="Total Dépenses (-)" value={formatDA(cashbookData.totals.totalOut)} color="red" />
                        <SummaryCard label="Solde Final" value={formatDA(cashbookData.totals.closingBalance)} color="purple" />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                        <span>
                            Livre de caisse: <strong>{cashbookData.accountName}</strong> · Période: <strong>{cashbookData.period}</strong>
                        </span>
                    </div>

                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Description</TableHead>
                                    <TableHead className="font-bold">Réf</TableHead>
                                    <TableHead className="text-right font-bold text-green-600">Recettes (+)</TableHead>
                                    <TableHead className="text-right font-bold text-red-600">Dépenses (-)</TableHead>
                                    <TableHead className="text-right font-bold">Solde</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 font-medium">
                                    <TableCell colSpan={5} className="text-right">SOLDE INITIAL</TableCell>
                                    <TableCell className="text-right font-mono">{formatDA(cashbookData.totals.openingBalance)}</TableCell>
                                </TableRow>
                                {cashbookData.entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Aucune opération pour cette période
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    cashbookData.entries.map((entry: any) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-mono text-xs">
                                                {format(new Date(entry.date), "dd/MM/yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{entry.referenceId || "—"}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-green-600">
                                                {entry.type === "CREDIT" ? formatDA(entry.amount) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-red-600">
                                                {entry.type === "DEBIT" ? formatDA(entry.amount) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-medium">{formatDA(entry.balanceAfter)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell colSpan={3}>TOTAUX PÉRIODE</TableCell>
                                    <TableCell className="text-right font-mono text-green-600">{formatDA(cashbookData.totals.totalIn)}</TableCell>
                                    <TableCell className="text-right font-mono text-red-600">{formatDA(cashbookData.totals.totalOut)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow className="bg-purple-50 dark:bg-purple-950/30 font-bold text-lg">
                                    <TableCell colSpan={5} className="text-right uppercase">Solde Final</TableCell>
                                    <TableCell className="text-right font-mono">{formatDA(cashbookData.totals.closingBalance)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!data && !isPending && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <BookOpen className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Sélectionnez une période et cliquez sur &quot;Générer&quot;</p>
                    <p className="text-sm mt-1">Le journal sera généré à partir des données de facturation enregistrées</p>
                </div>
            )}
        </div>
    )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
        orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
        amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
        red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
        green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
        purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    }

    return (
        <div className={`rounded-xl border p-3 ${colorMap[color] || ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-lg font-bold font-mono mt-1">{value} <span className="text-xs font-normal">DA</span></p>
        </div>
    )
}
