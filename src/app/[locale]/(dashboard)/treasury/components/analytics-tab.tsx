"use client"

import React, { useMemo } from "react"
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell, 
    Legend,
    BarChart,
    Bar
} from "recharts"
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    FileText, 
    FileSpreadsheet, 
    Wallet, 
    Landmark, 
    PieChart as PieChartIcon, 
    Activity, 
    Scale,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TreasuryMovementColumn } from "./mouvements-columns"
import { TreasuryAccountColumn } from "./types"
import { DateRange } from "react-day-picker"

interface AnalyticsTabProps {
    movements: TreasuryMovementColumn[]
    accounts: TreasuryAccountColumn[]
    dateRange: DateRange | undefined
    selectedAccount: string
}

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#ec4899"]

const SOURCE_LABELS: Record<string, string> = {
    SALE: "Ventes POS & Factures",
    PURCHASE: "Achats Fournisseurs",
    EXPENSE: "Charges & Dépenses",
    TRANSFER: "Virements internes",
    MANUAL_IN: "Entrées manuelles",
    MANUAL_OUT: "Sorties manuelles",
    INITIAL_BALANCE: "Solde initial",
    CHEQUE: "Chèques encaissés/émis"
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
    movements,
    accounts,
    dateRange,
    selectedAccount
}) => {
    // ─── Format Currency ───
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("fr-DZ", { 
            style: "currency", 
            currency: "DZD",
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(val).replace("DZD", "DA")
    }

    // ─── Filtered Account Details ───
    const activeAccountName = useMemo(() => {
        if (selectedAccount === "ALL") return "Tous les comptes"
        return accounts.find(a => a.id === selectedAccount)?.name || "Compte sélectionné"
    }, [selectedAccount, accounts])

    // ─── Visual KPIs ───
    const kpis = useMemo(() => {
        let totalCredit = 0
        let totalDebit = 0

        movements.forEach(m => {
            const amt = Number(String(m.amount).replace(/[^0-9.-]/g, "")) || 0
            if (m.type === "CREDIT") {
                totalCredit += amt
            } else if (m.type === "DEBIT") {
                totalDebit += amt
            }
        })

        // Account balances
        let currentBalance = 0
        if (selectedAccount === "ALL") {
            currentBalance = accounts.reduce((acc, curr) => acc + curr.rawBalance, 0)
        } else {
            currentBalance = accounts.find(a => a.id === selectedAccount)?.rawBalance || 0
        }

        const netFlow = totalCredit - totalDebit
        const openingBalance = currentBalance - netFlow

        return {
            totalCredit,
            totalDebit,
            netFlow,
            openingBalance,
            closingBalance: currentBalance
        }
    }, [movements, accounts, selectedAccount])

    // ─── Aggregation 1: Daily Cash Flow (AreaChart) ───
    const chartData = useMemo(() => {
        const dailyBins: Record<string, { date: string, credit: number, debit: number, net: number }> = {}

        // Pre-fill days in the range to avoid empty gaps if possible
        movements.forEach(m => {
            const dateStr = format(new Date(m.rawDate), "yyyy-MM-dd")
            const amt = Number(String(m.amount).replace(/[^0-9.-]/g, "")) || 0

            if (!dailyBins[dateStr]) {
                dailyBins[dateStr] = { 
                    date: format(new Date(m.rawDate), "dd MMM"), 
                    credit: 0, 
                    debit: 0, 
                    net: 0 
                }
            }

            if (m.type === "CREDIT") {
                dailyBins[dateStr].credit += amt
                dailyBins[dateStr].net += amt
            } else {
                dailyBins[dateStr].debit += amt
                dailyBins[dateStr].net -= amt
            }
        })

        // Convert, sort by raw key
        return Object.entries(dailyBins)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, val]) => val)
    }, [movements])

    // ─── Aggregation 2: Inflow by Source (PieChart) ───
    const inflowSources = useMemo(() => {
        const sourceMap: Record<string, number> = {}

        movements.forEach(m => {
            if (m.type === "CREDIT") {
                const amt = Number(String(m.amount).replace(/[^0-9.-]/g, "")) || 0
                const src = m.source || "MANUAL_IN"
                sourceMap[src] = (sourceMap[src] || 0) + amt
            }
        })

        return Object.entries(sourceMap).map(([key, value]) => ({
            name: SOURCE_LABELS[key] || key,
            value
        })).sort((a, b) => b.value - a.value)
    }, [movements])

    // ─── Aggregation 3: Outflow by Category (PieChart) ───
    const outflowCategories = useMemo(() => {
        const categoryMap: Record<string, number> = {}

        movements.forEach(m => {
            if (m.type === "DEBIT") {
                const amt = Number(String(m.amount).replace(/[^0-9.-]/g, "")) || 0
                const src = m.source || "MANUAL_OUT"
                categoryMap[src] = (categoryMap[src] || 0) + amt
            }
        })

        return Object.entries(categoryMap).map(([key, value]) => ({
            name: SOURCE_LABELS[key] || key,
            value
        })).sort((a, b) => b.value - a.value)
    }, [movements])

    // ─── Aggregation 4: Account Shares ───
    const totalAssets = useMemo(() => {
        return accounts.reduce((sum, acc) => sum + acc.rawBalance, 0) || 1
    }, [accounts])

    // ─── PDF Cash Ledger Statement Generator ───
    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        let y = 15

        // Accent header bar
        doc.setFillColor(16, 185, 129) // Emerald accent
        doc.rect(0, 0, pageWidth, 4, "F")

        // Title & Metadata
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.text("JOURNAL DE CAISSE & COMPTE", 14, y)
        
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100)
        doc.text(`Rapport généré le: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, y + 5)
        
        // Date range indicator
        const dateStr = dateRange?.from 
            ? `Période: du ${format(dateRange.from, "dd/MM/yyyy")}${dateRange.to ? ` au ${format(dateRange.to, "dd/MM/yyyy")}` : ""}`
            : "Période: Historique Complet"
        doc.text(dateStr, pageWidth - 14, y, { align: "right" })
        doc.text(`Compte: ${activeAccountName}`, pageWidth - 14, y + 5, { align: "right" })

        y += 15
        doc.setDrawColor(220)
        doc.line(14, y, pageWidth - 14, y)
        y += 8

        // KPI Summary Box
        doc.setFillColor(244, 245, 247)
        doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, "F")

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(120)
        
        doc.text("SOLDE INITIAL", 20, y + 6)
        doc.text("TOTAL ENTRÉES (+)", 65, y + 6)
        doc.text("TOTAL SORTIES (-)", 110, y + 6)
        doc.text("FLUX NET", 155, y + 6)

        doc.setFontSize(10)
        doc.setTextColor(40)
        doc.text(formatCurrency(kpis.openingBalance), 20, y + 14)
        
        doc.setTextColor(16, 185, 129) // Green
        doc.text(formatCurrency(kpis.totalCredit), 65, y + 14)
        
        doc.setTextColor(244, 63, 94) // Red
        doc.text(formatCurrency(kpis.totalDebit), 110, y + 14)
        
        doc.setTextColor(kpis.netFlow >= 0 ? 16 : 244, kpis.netFlow >= 0 ? 185 : 63, kpis.netFlow >= 0 ? 129 : 94)
        doc.text(formatCurrency(kpis.netFlow), 155, y + 14)

        y += 30

        // Transactions Table
        const headers = ["Date", "Source / Type", "Description", "Entrée (DA)", "Sortie (DA)", "Solde Après"]
        const rows = movements.map(m => {
            const amt = Number(String(m.amount).replace(/[^0-9.-]/g, "")) || 0
            return [
                m.date,
                SOURCE_LABELS[m.source] || m.source,
                m.description || "-",
                m.type === "CREDIT" ? `${amt.toFixed(2)}` : "-",
                m.type === "DEBIT" ? `${amt.toFixed(2)}` : "-",
                m.balanceAfter
            ]
        })

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: y,
            theme: "grid",
            styles: { fontSize: 7, font: "helvetica", cellPadding: 2 },
            headStyles: { fillColor: [16, 185, 129], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                3: { halign: "right" },
                4: { halign: "right" },
                5: { halign: "right" }
            }
        })

        const finalY = (doc as any).lastAutoTable?.finalY || y + 20
        
        // Ending Balance Info
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(40)
        doc.text(`SOLDE FINAL DE CLÔTURE: ${formatCurrency(kpis.closingBalance)}`, 14, finalY + 10)

        // Footer signatures
        const sigY = Math.min(finalY + 25, 270)
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(120)
        doc.text("Visa Comptable / Caissier", 30, sigY)
        doc.line(14, sigY + 2, 70, sigY + 2)

        doc.text("Signature de la Direction", pageWidth - 70, sigY)
        doc.line(pageWidth - 70, sigY + 2, pageWidth - 14, sigY + 2)

        doc.save(`Journal_${activeAccountName.replace(/[^a-z0-9]/gi, "_")}_${format(new Date(), "dd-MM-yyyy")}.pdf`)
    }

    // ─── Excel Spreadsheet Exporter ───
    const handleExportExcel = () => {
        const headers = ["Date & Heure", "Type", "Source / Catégorie", "Montant (DA)", "Solde Cumulé", "Description"]
        const rows = movements.map(m => {
            const amt = Number(String(m.amount).replace(/[^0-9.-]/g, "")) || 0
            return [
                m.date,
                m.type === "CREDIT" ? "CRÉDIT (Entrée)" : "DÉBIT (Sortie)",
                SOURCE_LABELS[m.source] || m.source,
                amt,
                Number(String(m.balanceAfter).replace(/[^0-9.-]/g, "")) || 0,
                m.description || ""
            ]
        })

        // Add summary info at the bottom
        rows.push([])
        rows.push(["", "", "Solde Initial", kpis.openingBalance])
        rows.push(["", "", "Total Entrées", kpis.totalCredit])
        rows.push(["", "", "Total Sorties", kpis.totalDebit])
        rows.push(["", "", "Flux Net", kpis.netFlow])
        rows.push(["", "", "Solde de Clôture", kpis.closingBalance])

        const ws = XLSX.utils.aoa_to_sheet([
            [`JOURNAL DE TRESORERIE — ${activeAccountName.toUpperCase()}`],
            [dateRange?.from ? `Période: du ${format(dateRange.from, "dd/MM/yyyy")} au ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : ""}` : "Historique Complet"],
            [],
            headers,
            ...rows
        ])

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Journal Caisse")
        XLSX.writeFile(wb, `Journal_${activeAccountName.replace(/[^a-z0-9]/gi, "_")}_${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    }

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" />
                        Analyses & Reporting Financier
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Statistiques de trésorerie interactives pour <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeAccountName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 flex-1 sm:flex-initial text-xs font-bold border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 flex-1 sm:flex-initial text-xs font-bold border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                        <FileText className="w-4 h-4" /> Grand Livre PDF
                    </Button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <ArrowUpRight className="w-16 h-16 text-emerald-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Total Entrées (Crédits)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(kpis.totalCredit)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Flux entrant sur la période</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-rose-50/50 via-white to-white dark:from-rose-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <ArrowDownRight className="w-16 h-16 text-rose-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Total Sorties (Débits)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                            {formatCurrency(kpis.totalDebit)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Flux sortant sur la période</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <Scale className="w-16 h-16 text-indigo-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Flux Net de Trésorerie</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-black ${kpis.netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {kpis.netFlow >= 0 ? "+" : ""}{formatCurrency(kpis.netFlow)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Solde net des opérations</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-blue-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <Wallet className="w-16 h-16 text-blue-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Solde de Clôture</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {formatCurrency(kpis.closingBalance)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Solde disponible au dernier jour</p>
                    </CardContent>
                </Card>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Cash Flow evolution chart */}
                <Card className="col-span-1 lg:col-span-2 border border-gray-100 dark:border-gray-800/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Évolution Temporelle des Flux
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chartData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground text-xs">
                                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                                Aucun mouvement enregistré pour cette période.
                            </div>
                        ) : (
                            <div className="w-full h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-800" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8" }} />
                                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8" }} tickFormatter={(val) => `${val}`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                                            labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: "11px" }}
                                            itemStyle={{ fontSize: "11px" }}
                                        />
                                        <Area type="monotone" name="Crédit (Entrées)" dataKey="credit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCredit)" />
                                        <Area type="monotone" name="Débit (Sorties)" dataKey="debit" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDebit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Account Balances and Breakdown list */}
                <Card className="col-span-1 border border-gray-100 dark:border-gray-800/50 shadow-sm flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-emerald-500" />
                            Répartition par Compte
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3 mt-1">
                            {accounts.map((acc, index) => {
                                const percentage = Math.min(Math.max((acc.rawBalance / totalAssets) * 100, 0), 100)
                                return (
                                    <div key={acc.id} className="space-y-1.5 p-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                                {acc.type === "BANK" ? <Landmark className="w-3.5 h-3.5 text-indigo-500" /> : <Wallet className="w-3.5 h-3.5 text-emerald-500" />}
                                                {acc.name}
                                            </span>
                                            <span className="font-black text-gray-900 dark:text-white">
                                                {formatCurrency(acc.rawBalance)}
                                            </span>
                                        </div>
                                        {/* Premium Progress Bar */}
                                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${acc.type === "BANK" ? "bg-indigo-500" : "bg-emerald-500"}`} 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                                            <span>Type: {acc.type === "BANK" ? "Banque" : "Caisse"}</span>
                                            <span>{percentage.toFixed(1)}% des actifs</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl mt-4">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-emerald-800 dark:text-emerald-400">Actif Global de Trésorerie</span>
                                <span className="font-black text-emerald-800 dark:text-emerald-400">{formatCurrency(totalAssets)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Distribution Pies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inflow pie chart */}
                <Card className="border border-gray-100 dark:border-gray-800/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-emerald-500" />
                            Origine des Revenus (Entrées)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        {inflowSources.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-xs">
                                Aucun revenu sur cette période.
                            </div>
                        ) : (
                            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                                <div className="w-[180px] h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={inflowSources}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={70}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {inflowSources.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value} DA`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-1.5 w-full sm:w-[220px]">
                                    {inflowSources.slice(0, 5).map((item, index) => (
                                        <div key={item.name} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 text-muted-foreground truncate w-[130px]">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                {item.name}
                                            </span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100 shrink-0">
                                                {formatCurrency(item.value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Outflow pie chart */}
                <Card className="border border-gray-100 dark:border-gray-800/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-rose-500" />
                            Répartition des Dépenses (Sorties)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        {outflowCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-xs">
                                Aucune dépense sur cette période.
                            </div>
                        ) : (
                            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                                <div className="w-[180px] h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={outflowCategories}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={70}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {outflowCategories.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value} DA`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-1.5 w-full sm:w-[220px]">
                                    {outflowCategories.slice(0, 5).map((item, index) => (
                                        <div key={item.name} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 text-muted-foreground truncate w-[130px]">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                                                {item.name}
                                            </span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100 shrink-0">
                                                {formatCurrency(item.value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
