"use client"

import * as React from "react"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useSupplierLedgerColumns } from "./ledger-columns"
import { LedgerLine } from "@/actions/ledger"
import { TableRow, TableCell } from "@/components/ui/table"

interface SupplierLedgerClientProps {
    data: LedgerLine[]
    finalBalance: number
    supplierName: string
}

export const SupplierLedgerClient: React.FC<SupplierLedgerClientProps> = ({
    data,
    finalBalance,
    supplierName
}) => {
    const columns = useSupplierLedgerColumns()

    // Calculate sum totals based on categories
    const totalAchat = data.filter(line => line.category === "PURCHASE").reduce((acc, curr) => acc + curr.debit, 0)
    const totalPaiement = data.filter(line => line.category === "PAYMENT").reduce((acc, curr) => acc + curr.credit, 0)
    const totalEmprunt = data.filter(line => line.category === "LOAN").reduce((acc, curr) => acc + curr.debit, 0)
    const totalRetour = data.filter(line => line.category === "RETURN").reduce((acc, curr) => acc + curr.credit, 0)
    const resteAPayer = finalBalance

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .format(val) + ' DA'
    }

    // Build footer row containing the totals for Achat, Emprunt, Paiement, Retour and Reste à payer
    const footerRow = (
        <TableRow className="bg-muted/80 font-bold border-t-2 border-border print:text-black">
            <TableCell className="p-3">Totaux</TableCell>
            <TableCell className="p-3 text-right">
                <div className="text-red-600">Achat: {formatCurrency(totalAchat)}</div>
                <div className="text-amber-600 mt-1">Emprunt: {formatCurrency(totalEmprunt)}</div>
            </TableCell>
            <TableCell className="p-3 text-right">
                <div className="text-emerald-600">Paiement: {formatCurrency(totalPaiement)}</div>
                <div className="text-teal-600 mt-1">Retour: {formatCurrency(totalRetour)}</div>
            </TableCell>
            <TableCell className={`p-3 text-right font-black ${resteAPayer > 0 ? "text-red-700" : "text-emerald-700"}`}>
                Reste: {formatCurrency(resteAPayer)}
            </TableCell>
            <TableCell className="p-3"></TableCell>
        </TableRow>
    )

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: auto;
                        margin: 10mm 10mm 10mm 10mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Hide sidebar, headers, and UI controls */
                    aside,
                    nav,
                    header,
                    footer,
                    button,
                    .no-print,
                    [class*="sidebar"],
                    [class*="header"],
                    [class*="Shortcuts"],
                    div.hidden.border-r,
                    #global-search-input {
                        display: none !important;
                    }
                    /* Ensure full width and normal padding */
                    main,
                    .flex-col,
                    .flex-1 {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    /* Style table for high quality print */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        page-break-inside: auto !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        page-break-after: auto !important;
                    }
                    th, td {
                        padding: 8px 10px !important;
                        font-size: 10px !important;
                        border: 1px solid #ddd !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tfoot {
                        display: table-footer-group !important;
                    }
                }
            `}} />

            <div className="flex items-center justify-between pb-4 no-print">
                <Heading
                    title={`Log d'un fournisseur: ${supplierName}`}
                    description="Historique détaillé des achats, emprunts et paiements fournisseurs"
                />
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimer
                </Button>
            </div>

            {/* Print-only title */}
            <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-black uppercase text-black">Relevé de Compte Fournisseur</h1>
                <p className="text-lg font-bold text-gray-800 mt-1">Fournisseur: {supplierName}</p>
                <p className="text-xs text-gray-500 mt-1">Date d'édition: {new Date().toLocaleString("fr-FR")}</p>
            </div>

            <Separator className="no-print" />

            {/* Top Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Achats</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(totalAchat)}</span>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Paiements</span>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaiement)}</span>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Emprunts</span>
                    <span className="text-lg font-bold text-amber-600">{formatCurrency(totalEmprunt)}</span>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Retours</span>
                    <span className="text-lg font-bold text-teal-600">{formatCurrency(totalRetour)}</span>
                </div>
                <div className={`p-4 border rounded-xl flex flex-col items-center justify-center col-span-2 md:col-span-1 shadow-sm ${resteAPayer > 0 ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20' : 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20'}`}>
                    <span className={`text-xs uppercase tracking-wider font-semibold mb-1 ${resteAPayer > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Reste à payer</span>
                    <span className={`text-xl font-black ${resteAPayer > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{formatCurrency(resteAPayer)}</span>
                </div>
            </div>

            <div className="border rounded-md print:border-none print:shadow-none">
                <DataTable
                    exportTitle={`Log Fournisseur: ${supplierName}`}
                    exportDescription={`Relevé de compte pour le fournisseur ${supplierName}`}
                    searchKey="observation"
                    columns={columns}
                    data={data}
                    showPagination={false}
                    footerRow={footerRow}
                    hidePrintHeader
                />
            </div>
        </>
    )
}

