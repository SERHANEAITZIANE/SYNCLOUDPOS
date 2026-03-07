"use client"

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, Download, FileText, Printer, FileSpreadsheet } from "lucide-react"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect, useRef } from "react"
import { useDebounce } from "use-debounce"
import { useTranslations } from "next-intl"

import { useReactToPrint } from "react-to-print"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ServerDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey: string
    pageCount: number
    currentPage: number
    exportTitle?: string
    exportDescription?: string
}

export function ServerDataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    pageCount,
    currentPage,
    exportTitle = "Export Data",
    exportDescription = "",
}: ServerDataTableProps<TData, TValue>) {
    const t = useTranslations("Common")
    const tDataTable = useTranslations("DataTable")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchQuery, setSearchQuery] = useState(searchParams.get(searchKey) || "")
    const [debouncedSearch] = useDebounce(searchQuery, 500)

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set(name, value)
            return params.toString()
        },
        [searchParams]
    )

    useEffect(() => {
        if (debouncedSearch !== searchParams.get(searchKey)) {
            const params = new URLSearchParams(searchParams.toString())
            if (debouncedSearch) {
                params.set(searchKey, debouncedSearch)
            } else {
                params.delete(searchKey)
            }
            params.set("page", "1") // reset page on new search
            router.push(pathname + "?" + params.toString())
        }
    }, [debouncedSearch, pathname, router, searchParams, searchKey])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pageCount,
    })

    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${exportTitle.replace(/[^a-z0-9]/gi, '_')}_Page${currentPage}_${new Date().toLocaleDateString()}`
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
                    if (val === null || val === undefined) return ""
                    if (typeof val === 'object') {
                        if (val instanceof Date) return val.toLocaleDateString()
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
        XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${currentPage}`)
        XLSX.writeFile(workbook, `${exportTitle.replace(/[^a-z0-9]/gi, '_')}_Page${currentPage}_${new Date().toLocaleDateString()}.xlsx`)
    }

    const handleExportPDF = () => {
        const { headers, rows } = extractTableData()
        const doc = new jsPDF()

        doc.setFontSize(16)
        doc.text(`${exportTitle} (Page ${currentPage})`, 14, 15)
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

        doc.save(`${exportTitle.replace(/[^a-z0-9]/gi, '_')}_Page${currentPage}_${new Date().toLocaleDateString()}.pdf`)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <Input
                        id="global-search-input"
                        placeholder={tDataTable("search")}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="max-w-sm w-full"
                    />
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
                            <h1 className="text-3xl font-bold text-black font-serif">{exportTitle}</h1>
                            {exportDescription && <p className="text-base text-gray-700 mt-2 font-medium">{exportDescription}</p>}
                            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wider">SYNCLOUDPOS - {t("print")} (Page {currentPage})</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-black">{t("date")}: {new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto print:overflow-visible print:max-h-none">
                    <Table className="print:w-full print:border-collapse print:text-black">
                        <TableHeader className="print:bg-gray-100 print:text-black print:border-b-2 print:border-gray-800">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="print:border-b print:border-gray-300">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="print:text-black print:font-bold">
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
                                            <TableCell key={cell.id}>
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
                    </Table>
                </div>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const newPage = Math.max(1, currentPage - 1)
                        router.push(pathname + "?" + createQueryString("page", String(newPage)))
                    }}
                    disabled={currentPage <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">{tDataTable("page")} {currentPage} / {pageCount}</div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const newPage = Math.min(pageCount, currentPage + 1)
                        router.push(pathname + "?" + createQueryString("page", String(newPage)))
                    }}
                    disabled={currentPage >= pageCount}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
