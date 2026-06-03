"use client"

import * as React from "react"
import { Printer, User, Phone, MapPin, CreditCard, TrendingDown, TrendingUp, Scale, FileText, FileSpreadsheet, Download, Layout } from "lucide-react"
import { useRef, useState } from "react"
import { useReactToPrint } from "react-to-print"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Separator } from "@/components/ui/separator"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLedgerColumns } from "./ledger-columns"
import { LedgerLine } from "@/actions/ledger"
import { PrintSimple, PrintClassique, PrintPremium, PrintTemplate } from "./ledger-print-templates"

interface LedgerClientProps {
    data: LedgerLine[]
    finalBalance: number
    customerName: string
    customerPhone?: string
    customerAddress?: string
    customerCity?: string
    customerTaxId?: string
    customerType?: string
    storeName?: string
}

export const LedgerClient: React.FC<LedgerClientProps> = ({
    data,
    finalBalance,
    customerName,
    customerPhone,
    customerAddress,
    customerCity,
    customerTaxId,
    customerType = "RETAIL",
    storeName = "SYNCLOUDPOS",
}) => {
    const columns = useLedgerColumns()
    const printRef = useRef<HTMLDivElement>(null)
    const [printTemplate, setPrintTemplate] = useState<PrintTemplate>("classique")

    const totalDebits = data.filter(line => !line.id.startsWith("initial-balance-")).reduce((acc, curr) => acc + curr.debit, 0)
    const totalCredits = data.filter(line => !line.id.startsWith("initial-balance-")).reduce((acc, curr) => acc + curr.credit, 0)

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .format(val) + ' DA'
    }

    const isOwed = finalBalance > 0

    const typeLabel = customerType === "WHOLESALE" ? "Grossiste" : customerType === "RESELLER" ? "Revendeur" : "Détaillant"

    const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Relevé_${customerName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString()}` })

    const handleExportExcel = () => {
        const headers = ["Date", "Vente/Emprunt", "Paiement", "Solde", "Observations"]
        const rows = data.map(line => [
            format(new Date(line.date), "dd/MM/yyyy HH:mm"),
            line.debit > 0 ? line.debit.toFixed(2) : "-",
            line.credit > 0 ? line.credit.toFixed(2) : "-",
            line.balance.toFixed(2),
            line.observation
        ])
        rows.push([])
        rows.push(["", "Total Vente/Emprunt", formatCurrency(totalDebits), "", ""])
        rows.push(["", "Total Paiement", formatCurrency(totalCredits), "", ""])
        rows.push(["", "Solde Actuel", formatCurrency(finalBalance), "", ""])

        const ws = XLSX.utils.aoa_to_sheet([
            [`Relevé de Compte — ${customerName}`],
            [customerPhone ? `Tél: ${customerPhone}` : "", customerAddress ? `Adr: ${customerAddress}` : ""],
            [],
            headers,
            ...rows
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Relevé")
        XLSX.writeFile(wb, `Releve_${customerName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString()}.xlsx`)
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text(`Relevé de Compte`, 14, 18)
        doc.setFontSize(12)
        doc.text(customerName, 14, 26)
        doc.setFontSize(9)
        let y = 32
        if (customerPhone) { doc.text(`Tél: ${customerPhone}`, 14, y); y += 5 }
        if (customerAddress) { doc.text(`Adresse: ${customerAddress}${customerCity ? `, ${customerCity}` : ""}`, 14, y); y += 5 }
        if (customerTaxId) { doc.text(`NIF: ${customerTaxId}`, 14, y); y += 5 }
        doc.text(`Type: ${typeLabel}`, 14, y); y += 5
        doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 14, y); y += 8

        const headers = ["Date", "Vente/Emprunt", "Paiement", "Solde", "Observations"]
        const rows = data.map(line => [
            format(new Date(line.date), "dd/MM/yyyy HH:mm"),
            line.debit > 0 ? `${line.debit.toFixed(2)} DA` : "-",
            line.credit > 0 ? `${line.credit.toFixed(2)} DA` : "-",
            `${line.balance.toFixed(2)} DA`,
            line.observation
        ])

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: y,
            theme: 'grid',
            styles: { fontSize: 7.5, font: "helvetica" },
            headStyles: { fillColor: [30, 64, 175] },
        })

        const finalY = (doc as any).lastAutoTable?.finalY || y + 20
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text(`Total Vente/Emprunt: ${formatCurrency(totalDebits)}`, 14, finalY + 10)
        doc.text(`Total Paiement: ${formatCurrency(totalCredits)}`, 14, finalY + 16)
        doc.setFontSize(12)
        doc.text(`Solde Actuel: ${formatCurrency(finalBalance)}`, 14, finalY + 24)

        doc.save(`Releve_${customerName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString()}.pdf`)
    }

    const templateNames: Record<PrintTemplate, string> = {
        simple: "Simple",
        classique: "Classique",
        premium: "Premium",
    }

    const printProps = {
        data, totalDebits, totalCredits, finalBalance,
        customerName, customerPhone, customerAddress, customerCity,
        customerTaxId, typeLabel, storeName, isOwed, formatCurrency,
    }

    return (
        <>
            {/* ── SCREEN HEADER (hidden on print) ── */}
            <div className="no-print">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
                            Relevé de Compte
                        </h2>
                        <p className="text-muted-foreground mt-1">Historique détaillé des ventes, emprunts et paiements</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Template selector */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Layout className="h-4 w-4" /> {templateNames[printTemplate]}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {(Object.keys(templateNames) as PrintTemplate[]).map(key => (
                                    <DropdownMenuItem
                                        key={key}
                                        onClick={() => setPrintTemplate(key)}
                                        className={`cursor-pointer ${printTemplate === key ? 'bg-accent font-semibold' : ''}`}
                                    >
                                        <span className={`mr-2 inline-block w-2 h-2 rounded-full ${key === "simple" ? "bg-gray-400" : key === "classique" ? "bg-blue-500" : "bg-indigo-600"}`} />
                                        {templateNames[key]}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-2">
                            <Printer className="h-4 w-4" /> Imprimer
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="h-4 w-4" /> Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                                    <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                                    <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <Separator />

                {/* ── Customer Card ── */}
                <div className="my-6 p-5 rounded-xl border bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 dark:from-blue-950/30 dark:via-background dark:to-indigo-950/20 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold shadow-lg">
                            {customerName.charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-lg">{customerName}</span>
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium">{typeLabel}</span>
                            </div>
                            {customerPhone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5" /> {customerPhone}
                                </div>
                            )}
                            {(customerAddress || customerCity) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" /> {[customerAddress, customerCity].filter(Boolean).join(", ")}
                                </div>
                            )}
                            {customerTaxId && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CreditCard className="h-3.5 w-3.5" /> NIF: {customerTaxId}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative overflow-hidden p-5 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/10 border border-red-100 dark:border-red-900/50 rounded-xl shadow-sm">
                        <TrendingDown className="absolute -right-2 -bottom-2 h-16 w-16 text-red-200/60 dark:text-red-800/30" />
                        <span className="text-xs uppercase tracking-wider text-red-500 font-semibold">Total Vente / Emprunt</span>
                        <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{formatCurrency(totalDebits)}</p>
                    </div>
                    <div className="relative overflow-hidden p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-xl shadow-sm">
                        <TrendingUp className="absolute -right-2 -bottom-2 h-16 w-16 text-emerald-200/60 dark:text-emerald-800/30" />
                        <span className="text-xs uppercase tracking-wider text-emerald-500 font-semibold">Total Paiement</span>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(totalCredits)}</p>
                    </div>
                    <div className={`relative overflow-hidden p-5 rounded-xl shadow-sm border ${isOwed ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/10 border-red-200 dark:border-red-900/50' : 'bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/20 dark:to-cyan-950/10 border-emerald-200 dark:border-emerald-900/50'}`}>
                        <Scale className={`absolute -right-2 -bottom-2 h-16 w-16 ${isOwed ? 'text-red-200/60 dark:text-red-800/30' : 'text-emerald-200/60 dark:text-emerald-800/30'}`} />
                        <span className={`text-xs uppercase tracking-wider font-semibold ${isOwed ? 'text-red-500' : 'text-emerald-500'}`}>Solde Actuel</span>
                        <p className={`text-3xl font-black mt-1 ${isOwed ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{formatCurrency(finalBalance)}</p>
                    </div>
                </div>
            </div>

            {/* ── PRINTABLE AREA ── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 8mm 6mm; }
                    body { margin: 0; padding: 0; }
                    .ledger-print-area { background: white !important; }
                }
            `}} />
            <div ref={printRef} className="ledger-print-area">
                {/* Print-only: selected template */}
                <div className="hidden print:block">
                    {printTemplate === "simple" && <PrintSimple {...printProps} />}
                    {printTemplate === "classique" && <PrintClassique {...printProps} />}
                    {printTemplate === "premium" && <PrintPremium {...printProps} />}
                </div>

                {/* Data Table (screen only) */}
                <div className="border rounded-md print:hidden">
                    <DataTable
                        exportTitle={`Relevé — ${customerName}`}
                        exportDescription={`Client: ${customerName}${customerPhone ? ` | Tél: ${customerPhone}` : ''}`}
                        searchKey="observation"
                        columns={columns}
                        data={data}
                        hidePrintHeader
                    />
                </div>
            </div>
        </>
    )
}
