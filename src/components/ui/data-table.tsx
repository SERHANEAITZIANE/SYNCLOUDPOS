"use client"

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useMemo, useRef } from "react"
import { ChevronLeft, ChevronRight, Download, FileText, Printer, FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"

import { useReactToPrint } from "react-to-print"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey: string
    showPagination?: boolean
    footerRow?: React.ReactNode
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    showPagination = true,
    footerRow,
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("Common")
    const tDataTable = useTranslations("DataTable")
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    // If pagination is disabled, we set the initial page size to a very large number
    const initialState = useMemo(() => {
        return showPagination ? {} : { pagination: { pageSize: 999999, pageIndex: 0 } };
    }, [showPagination]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        initialState,
        state: {
            sorting,
            columnFilters,
        },
    })

    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Export_${new Date().toLocaleDateString()}`
    })

    const extractTableData = () => {
        const headers = table.getAllLeafColumns()
            .filter(col => col.getIsVisible() && col.id !== "actions" && col.id !== "select")
            .map(col => typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id)

        const rows = table.getRowModel().rows.map(row => {
            return table.getAllLeafColumns()
                .filter(col => col.getIsVisible() && col.id !== "actions" && col.id !== "select")
                .map(col => {
                    const val = row.getValue(col.id)
                    // Try to extract a clean string if it's an object or a React node
                    if (val === null || val === undefined) return ""
                    if (typeof val === 'object') {
                        // Handle simple objects like dates or nested properties if needed
                        if (val instanceof Date) return val.toLocaleDateString()
                        // If it's a complex React Node, we'll try to fallback. In reality, generic data export from Tanstack table handles raw data, not React Nodes.
                        // We access the raw data from `row.original` if needed, but `getValue` gives the accessor value.
                    }
                    return String(val)
                })
        })

        return { headers, rows }
    }

    const handleExportExcel = () => {
        const { headers, rows } = extractTableData()
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
        XLSX.writeFile(workbook, `Export_${new Date().toLocaleDateString()}.xlsx`)
    }

    const handleExportPDF = () => {
        const { headers, rows } = extractTableData()
        const doc = new jsPDF()

        doc.setFontSize(16)
        doc.text("Export Data", 14, 15)
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22)

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 25,
            theme: 'grid',
            styles: { fontSize: 8, font: "helvetica" },
            headStyles: { fillColor: [41, 128, 185] },
        })

        doc.save(`Export_${new Date().toLocaleDateString()}.pdf`)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <Input
                        id="global-search-input"
                        placeholder={tDataTable("search")}
                        value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn(searchKey)?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm w-full"
                    />

                    {/* Client Type Filter */}
                    {table.getAllColumns().some(c => c.id === "clientType") && (
                        <Select
                            value={(table.getColumn("clientType")?.getFilterValue() as string) ?? "ALL"}
                            onValueChange={(value) =>
                                table.getColumn("clientType")?.setFilterValue(value === "ALL" ? "" : value)
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder={tDataTable("allTypes")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{tDataTable("allTypes")}</SelectItem>
                                <SelectItem value="RETAIL">{tDataTable("retail")}</SelectItem>
                                <SelectItem value="RESELLER">{tDataTable("reseller")}</SelectItem>
                                <SelectItem value="WHOLESALE">{tDataTable("wholesale")}</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handlePrint()} className="hidden sm:flex">
                        <Printer className="mr-2 h-4 w-4" />
                        {t("print")}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                {t("exportExcel")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                                <FileText className="mr-2 h-4 w-4 text-red-600" />
                                {t("exportPdf")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint()} className="cursor-pointer sm:hidden">
                                <Printer className="mr-2 h-4 w-4" />
                                {t("print")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-md border overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0" ref={printRef}>
                {/* Print Header - Only visible when printing */}
                <div className="hidden print:block mb-8 mt-4">
                    <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-black font-serif">SYNCLOUDPOS</h1>
                            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wider">{t("print")}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-black">{t("date")}: {new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[800px] print:overflow-visible print:max-h-none">
                    <Table className="print:w-full print:border-collapse print:text-black">
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 print:bg-gray-100 print:text-black print:border-b-2 print:border-gray-800">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="print:border-b print:border-gray-300">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="whitespace-nowrap print:text-black print:font-bold">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="whitespace-normal min-w-[150px]">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        {tDataTable("noResults")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        {footerRow && (
                            <TableFooter className="sticky bottom-0 z-10 bg-muted font-bold shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
                                {footerRow}
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </div>
            {showPagination && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
