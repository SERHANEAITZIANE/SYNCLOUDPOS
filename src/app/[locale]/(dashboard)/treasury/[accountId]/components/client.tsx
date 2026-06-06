"use client"

import { useState, useMemo } from "react"
import { 
    ArrowLeft, 
    TrendingUp, 
    TrendingDown, 
    Scale, 
    Wallet, 
    Landmark,
    FileSpreadsheet,
    FileText,
    Activity,
    Calendar,
    BarChart3,
    ListFilter
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { TreasuryAccount } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { TreasuryTransactionColumn } from "./types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip,
    BarChart,
    Bar,
    Legend
} from "recharts"

interface TransactionsClientProps {
    data: TreasuryTransactionColumn[]
    account: TreasuryAccount
    locale: string
}

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#ec4899"]

const T: Record<string, Record<string, string>> = {
    fr: {
        back: "Retour",
        kpi_opening: "Solde Initial",
        kpi_credit: "Total Entrées (Crédit)",
        kpi_debit: "Total Sorties (Débit)",
        kpi_net: "Flux Net",
        kpi_closing: "Solde Actuel",
        tab_visual: "Visualisations & Graphiques",
        tab_journal: "Journal des Transactions",
        chart_balance: "Évolution du Solde en Temps Réel",
        chart_volumes: "Volumes des Flux Journaliers",
        export_excel: "Excel",
        export_pdf: "Relevé PDF",
        subtitle: "Historique et analyse des mouvements financiers",
        no_data: "Aucune transaction enregistrée pour cette période.",
        observations: "Observations",
        date: "Date & Heure",
        type: "Type",
        amount: "Montant",
        balance: "Solde après",
        credit_label: "Crédits (Entrées)",
        debit_label: "Débits (Sorties)",
        solde_label: "Solde",
        period: "Période",
        all_time: "Historique Complet",
    },
    en: {
        back: "Back",
        kpi_opening: "Opening Balance",
        kpi_credit: "Total Inflows (Credit)",
        kpi_debit: "Total Outflows (Debit)",
        kpi_net: "Net Flow",
        kpi_closing: "Current Balance",
        tab_visual: "Visualizations & Charts",
        tab_journal: "Transaction Journal",
        chart_balance: "Real-Time Balance Evolution",
        chart_volumes: "Daily Flow Volumes",
        export_excel: "Excel",
        export_pdf: "PDF Statement",
        subtitle: "History and analysis of financial movements",
        no_data: "No transactions recorded for this period.",
        observations: "Observations",
        date: "Date & Time",
        type: "Type",
        amount: "Amount",
        balance: "Balance after",
        credit_label: "Credits (Inflows)",
        debit_label: "Debits (Outflows)",
        solde_label: "Balance",
        period: "Period",
        all_time: "Full History",
    },
    ar: {
        back: "رجوع",
        kpi_opening: "الرصيد الافتتاحي",
        kpi_credit: "إجمالي المقبوضات",
        kpi_debit: "إجمالي المصروفات",
        kpi_net: "صافي التدفق",
        kpi_closing: "الرصيد الحالي",
        tab_visual: "الرسوم البيانية والتحليلات",
        tab_journal: "سجل المعاملات",
        chart_balance: "تطور الرصيد لحظياً",
        chart_volumes: "حجم التدفقات اليومية",
        export_excel: "تصدير Excel",
        export_pdf: "كشف كاشير PDF",
        subtitle: "سجل وتحليل الحركات المالية للحساب",
        no_data: "لا توجد معاملات مسجلة في هذه الفترة.",
        observations: "ملاحظات",
        date: "التاريخ والوقت",
        type: "النوع",
        amount: "المبلغ",
        balance: "الرصيد بعد العملية",
        credit_label: "المقبوضات (دائن)",
        debit_label: "المصروفات (مدين)",
        solde_label: "الرصيد",
        period: "الفترة",
        all_time: "السجل الكامل",
    }
}

export const TransactionsClient: React.FC<TransactionsClientProps> = ({
    data,
    account,
    locale
}) => {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"visual" | "journal">("visual")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    const lang = T[locale] ? locale : "fr"
    const t = (key: string) => T[lang][key] || key

    // Format Currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("fr-DZ", { 
            style: "currency", 
            currency: "DZD",
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(val).replace("DZD", "DA")
    }

    // Filtered data based on Date Picker
    const filteredData = useMemo(() => {
        let result = data
        if (dateRange?.from) {
            const fromTime = dateRange.from.getTime()
            const toTime = dateRange.to ? dateRange.to.getTime() + 86400000 : fromTime + 86400000

            result = result.filter(item => {
                const itemTime = new Date(item.rawDate).getTime()
                return itemTime >= fromTime && itemTime <= toTime
            })
        }
        return result
    }, [data, dateRange])

    // KPIs calculations
    const kpis = useMemo(() => {
        let totalCredit = 0
        let totalDebit = 0

        filteredData.forEach(item => {
            const amt = item.rawAmount
            if (item.type === "CREDIT") {
                totalCredit += amt
            } else if (item.type === "DEBIT") {
                totalDebit += amt
            }
        })

        const netFlow = totalCredit - totalDebit
        
        // In filteredData, elements are sorted DESC (newest first)
        const closingBalance = filteredData.length > 0 ? filteredData[0].rawBalanceAfter : Number(account.balance)
        const openingBalance = filteredData.length > 0 ? filteredData[filteredData.length - 1].rawBalanceBefore : Number(account.balance)

        return {
            totalCredit,
            totalDebit,
            netFlow,
            openingBalance,
            closingBalance
        }
    }, [filteredData, account])

    // Chronological data for trends
    const chronologicalData = useMemo(() => {
        return [...filteredData].reverse()
    }, [filteredData])

    // Chart 1: Balance over time
    const chartData = useMemo(() => {
        return chronologicalData.map(item => ({
            date: format(new Date(item.rawDate), "dd MMM HH:mm"),
            [t("solde_label")]: item.rawBalanceAfter,
            description: item.description
        }))
    }, [chronologicalData, lang])

    // Chart 2: Daily Credit vs Debit Bar Chart
    const dailyData = useMemo(() => {
        const dailyBins: Record<string, { date: string, credit: number, debit: number, rawDateStr: string }> = {}
        
        filteredData.forEach(item => {
            const dateKey = format(new Date(item.rawDate), "yyyy-MM-dd")
            const dateLabel = format(new Date(item.rawDate), "dd MMM")
            const amt = item.rawAmount
            
            if (!dailyBins[dateKey]) {
                dailyBins[dateKey] = {
                    date: dateLabel,
                    credit: 0,
                    debit: 0,
                    rawDateStr: dateKey
                }
            }
            
            if (item.type === "CREDIT") {
                dailyBins[dateKey].credit += amt
            } else {
                dailyBins[dateKey].debit += amt
            }
        })
        
        return Object.values(dailyBins).sort((a, b) => a.rawDateStr.localeCompare(b.rawDateStr))
    }, [filteredData])

    // PDF Statement Generator
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
        doc.text(`RELEVE DE COMPTE - ${account.name.toUpperCase()}`, 14, y)
        
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100)
        doc.text(`Rapport généré le: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, y + 5)
        
        // Date range indicator
        const dateStr = dateRange?.from 
            ? `Période: du ${format(dateRange.from, "dd/MM/yyyy")}${dateRange.to ? ` au ${format(dateRange.to, "dd/MM/yyyy")}` : ""}`
            : "Période: Historique Complet"
        doc.text(dateStr, pageWidth - 14, y, { align: "right" })
        doc.text(`Type de compte: ${account.type === "BANK" ? "Compte Bancaire" : "Caisse / Espèces"}`, pageWidth - 14, y + 5, { align: "right" })

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
        const headers = ["Date", "Source", "Observations", "Entrée (DA)", "Sortie (DA)", "Solde après"]
        const rows = chronologicalData.map(m => {
            return [
                m.date,
                m.source,
                m.description || "-",
                m.type === "CREDIT" ? `${m.rawAmount.toFixed(2)}` : "-",
                m.type === "DEBIT" ? `${m.rawAmount.toFixed(2)}` : "-",
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
        doc.text(`SOLDE DE CLÔTURE DE PERIODE: ${formatCurrency(kpis.closingBalance)}`, 14, finalY + 10)

        // Footer signatures
        const sigY = Math.min(finalY + 25, 270)
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(120)
        doc.text("Visa Caissier / Comptable", 30, sigY)
        doc.line(14, sigY + 2, 70, sigY + 2)

        doc.text("Signature du Gérant / Direction", pageWidth - 70, sigY)
        doc.line(pageWidth - 70, sigY + 2, pageWidth - 14, sigY + 2)

        doc.save(`Releve_${account.name.replace(/[^a-z0-9]/gi, "_")}_${format(new Date(), "dd-MM-yyyy")}.pdf`)
    }

    // Excel Exporter
    const handleExportExcel = () => {
        const headers = ["Date", "Observations", "Type", "Source / Catégorie", "Montant (DA)", "Solde Cumulé"]
        const rows = chronologicalData.map(m => {
            return [
                m.date,
                m.description || "",
                m.type === "CREDIT" ? "CRÉDIT" : "DÉBIT",
                m.source,
                m.rawAmount,
                m.rawBalanceAfter
            ]
        })

        rows.push([])
        rows.push(["", "", "", "Solde Initial", kpis.openingBalance])
        rows.push(["", "", "", "Total Entrées", kpis.totalCredit])
        rows.push(["", "", "", "Total Sorties", kpis.totalDebit])
        rows.push(["", "", "", "Flux Net", kpis.netFlow])
        rows.push(["", "", "", "Solde de Clôture", kpis.closingBalance])

        const ws = XLSX.utils.aoa_to_sheet([
            [`RELEVE DE TRESORERIE — ${account.name.toUpperCase()}`],
            [dateRange?.from ? `Période: du ${format(dateRange.from, "dd/MM/yyyy")} au ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : ""}` : "Historique Complet"],
            [],
            headers,
            ...rows
        ])

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Relevé")
        XLSX.writeFile(wb, `Releve_${account.name.replace(/[^a-z0-9]/gi, "_")}_${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    }

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => router.push("/treasury")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <Heading
                            title={`${account.name}`}
                            description={t("subtitle")}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DatePickerWithRange
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-[250px] sm:w-[280px]"
                    />
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 text-xs font-bold border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl">
                        <FileSpreadsheet className="w-4 h-4" /> {t("export_excel")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 text-xs font-bold border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-xl">
                        <FileText className="w-4 h-4" /> {t("export_pdf")}
                    </Button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("kpi_opening")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-slate-700 dark:text-slate-200">
                            {formatCurrency(kpis.openingBalance)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Avant la période filtrée</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <TrendingUp className="w-12 h-12 text-emerald-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("kpi_credit")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(kpis.totalCredit)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Total des entrées</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-rose-50/50 via-white to-white dark:from-rose-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <TrendingDown className="w-12 h-12 text-rose-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("kpi_debit")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                            {formatCurrency(kpis.totalDebit)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Total des dépenses / sorties</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15">
                        <Scale className="w-12 h-12 text-indigo-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("kpi_net")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-xl font-black", kpis.netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                            {kpis.netFlow >= 0 ? "+" : ""}{formatCurrency(kpis.netFlow)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Solde net sur la période</p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-blue-950/10 dark:via-gray-900 dark:to-gray-900">
                    <div className="absolute right-0 bottom-0 p-3 opacity-15 font-bold">
                        {account.type === "BANK" ? <Landmark className="w-12 h-12 text-blue-600" /> : <Wallet className="w-12 h-12 text-blue-600" />}
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("kpi_closing")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                            {formatCurrency(kpis.closingBalance)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Solde disponible final</p>
                    </CardContent>
                </Card>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-gray-100/80 dark:bg-gray-800/50 rounded-xl w-fit border border-gray-200/50 dark:border-gray-700/50">
                <button
                    onClick={() => setActiveTab("visual")}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                        activeTab === "visual"
                            ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    {t("tab_visual")}
                </button>
                <button
                    onClick={() => setActiveTab("journal")}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                        activeTab === "journal"
                            ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <ListFilter className="w-4 h-4" />
                    {t("tab_journal")}
                </button>
            </div>

            {/* Separator */}
            <Separator />

            {/* Tab Contents */}
            {activeTab === "visual" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-250">
                    {/* Area Chart: Balance evolution */}
                    <Card className="border border-gray-100 dark:border-gray-800/50 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                {t("chart_balance")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {chartData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground text-xs">
                                    <Calendar className="w-8 h-8 mb-2 opacity-30" />
                                    {t("no_data")}
                                </div>
                            ) : (
                                <div className="w-full h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                                            <Area type="monotone" name={t("solde_label")} dataKey={t("solde_label")} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Bar Chart: Daily volumes */}
                    <Card className="border border-gray-100 dark:border-gray-800/50 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-emerald-500" />
                                {t("chart_volumes")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dailyData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground text-xs">
                                    <Calendar className="w-8 h-8 mb-2 opacity-30" />
                                    {t("no_data")}
                                </div>
                            ) : (
                                <div className="w-full h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-800" />
                                            <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8" }} />
                                            <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8" }} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                                                labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: "11px" }}
                                                itemStyle={{ fontSize: "11px" }}
                                            />
                                            <Legend style={{ fontSize: "11px" }} />
                                            <Bar name={t("credit_label")} dataKey="credit" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar name={t("debit_label")} dataKey="debit" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm animate-in fade-in duration-250">
                    <DataTable  exportTitle={t("export_excel")} exportDescription={""} searchKey="description" columns={columns} data={filteredData} />
                </div>
            )}
        </div>
    )
}
