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
import { useState, useMemo, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileText, Printer, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
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
    exportTitle?: string
    exportDescription?: string
    hidePrintHeader?: boolean
    hideSearch?: boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    showPagination = true,
    footerRow,
    exportTitle = "Export Data",
    exportDescription = "",
    hidePrintHeader = false,
    hideSearch = false,
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("Common")
    const tDataTable = useTranslations("DataTable")
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    // If pagination is disabled, we set the initial page size to a very large number
    // Default to 20 rows when pagination is enabled
    const initialState = useMemo(() => {
        return showPagination ? { pagination: { pageSize: 20, pageIndex: 0 } } : { pagination: { pageSize: 999999, pageIndex: 0 } };
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

    // Page number generation for pagination
    const getPageNumbers = useCallback(() => {
        const pageCount = table.getPageCount()
        const currentPage = table.getState().pagination.pageIndex
        const pages: (number | 'ellipsis')[] = []
        if (pageCount <= 7) {
            for (let i = 0; i < pageCount; i++) pages.push(i)
        } else {
            pages.push(0)
            if (currentPage > 2) pages.push('ellipsis')
            const start = Math.max(1, currentPage - 1)
            const end = Math.min(pageCount - 2, currentPage + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (currentPage < pageCount - 3) pages.push('ellipsis')
            pages.push(pageCount - 1)
        }
        return pages
    }, [table])

    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${exportTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString()}`
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
        XLSX.writeFile(workbook, `${exportTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString()}.xlsx`)
    }

    const handleExportPDF = () => {
        const { headers, rows } = extractTableData()
        const doc = new jsPDF()

        doc.setFontSize(16)
        doc.text(exportTitle, 14, 15)
        doc.setFontSize(10)

        let startY = 25;
        if (exportDescription) {
            doc.text(exportDescription, 14, 22)
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28)
            startY = 32;
        } else {
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22)
            startY = 25;
        }

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: startY,
            theme: 'grid',
            styles: { fontSize: 8, font: "helvetica" },
            headStyles: { fillColor: [41, 128, 185] },
        })

        doc.save(`${exportTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toLocaleDateString()}.pdf`)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0 no-print">
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    {!hideSearch && (
                        <Input
                            id="global-search-input"
                            placeholder={tDataTable("search")}
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="max-w-sm w-full"
                        />
                    )}

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

            {/* Row count selector — above the table */}
            {showPagination && (
                <div className="flex items-center gap-1.5 pb-3 no-print">
                    <span className="text-xs text-muted-foreground font-medium mr-1">
                        {tDataTable("show")} :
                    </span>
                    {[20, 50, 100, 200].map((size) => {
                        const active = table.getState().pagination.pageSize === size
                        return (
                            <button
                                key={size}
                                className={cn(
                                    "h-7 min-w-[2.5rem] text-xs font-semibold px-2.5 rounded-md border transition-all duration-150",
                                    active
                                        ? "bg-primary text-primary-foreground shadow-sm border-primary"
                                        : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                                )}
                                onClick={() => table.setPageSize(size)}
                            >
                                {size}
                            </button>
                        )
                    })}
                    <button
                        className={cn(
                            "h-7 min-w-[2.5rem] text-xs font-semibold px-2.5 rounded-md border transition-all duration-150",
                            table.getState().pagination.pageSize >= 999999
                                ? "bg-primary text-primary-foreground shadow-sm border-primary"
                                : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => table.setPageSize(999999)}
                    >
                        {tDataTable("all")}
                    </button>
                    <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                        ({table.getFilteredRowModel().rows.length} {tDataTable("results")})
                    </span>
                </div>
            )}

            <div className="rounded-md border overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0" ref={printRef}>
                {/* Print Header - Only visible when printing */}
                {!hidePrintHeader && <div className="hidden print:block mb-8 mt-4">
                    <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-black font-serif">{exportTitle}</h1>
                            {exportDescription && <p className="text-base text-gray-700 mt-2 font-medium">{exportDescription}</p>}
                            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wider">SYNCLOUDPOS</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-black">{t("date")}: {new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>}

                <Table className="print:w-full print:border-collapse print:text-black" containerClassName="max-h-[70vh] print:max-h-none print:overflow-visible">
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
            {showPagination && table.getPageCount() > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 no-print">
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {tDataTable("page")} <span className="font-semibold text-foreground">{table.getState().pagination.pageIndex + 1}</span> / <span className="font-semibold text-foreground">{table.getPageCount()}</span>
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {getPageNumbers().map((page, i) =>
                            page === 'ellipsis' ? (
                                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                            ) : (
                                <Button
                                    key={page}
                                    variant={table.getState().pagination.pageIndex === page ? "default" : "outline"}
                                    size="icon"
                                    className="h-8 w-8 text-xs font-semibold"
                                    onClick={() => table.setPageIndex(page)}
                                >
                                    {page + 1}
                                </Button>
                            )
                        )}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
