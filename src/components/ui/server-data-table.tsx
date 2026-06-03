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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileText, Printer, FileSpreadsheet, Search } from "lucide-react"

import { useSearchParams } from "next/navigation"
import { useRouter, usePathname } from "@/i18n/routing"
import { useCallback, useState, useEffect, useRef } from "react"
import { useDebounce } from "use-debounce"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

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

    // Safe fallbacks for searchParams (can be null during SSR/prerender)
    const getSafeSearchParam = useCallback((key: string) => {
        return searchParams?.get(key) || ""
    }, [searchParams])

    const getSafeSearchParamsString = useCallback(() => {
        return searchParams?.toString() || ""
    }, [searchParams])

    const [searchQuery, setSearchQuery] = useState(getSafeSearchParam(searchKey))
    const [debouncedSearch] = useDebounce(searchQuery, 500)

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(getSafeSearchParamsString())
            params.set(name, value)
            return params.toString()
        },
        [getSafeSearchParamsString]
    )

    useEffect(() => {
        const currentSearchParam = getSafeSearchParam(searchKey)
        if (debouncedSearch !== currentSearchParam) {
            const params = new URLSearchParams(getSafeSearchParamsString())
            if (debouncedSearch) {
                params.set(searchKey, debouncedSearch)
            } else {
                params.delete(searchKey)
            }
            params.set("page", "1") // reset page on new search
            router.push(pathname + "?" + params.toString())
        }
    }, [debouncedSearch, pathname, router, getSafeSearchParam, getSafeSearchParamsString, searchKey])

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

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        const maxVisible = 5
        if (pageCount <= maxVisible + 2) {
            for (let i = 1; i <= pageCount; i++) pages.push(i)
        } else {
            pages.push(1)
            if (currentPage > 3) pages.push("...")
            const start = Math.max(2, currentPage - 1)
            const end = Math.min(pageCount - 1, currentPage + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (currentPage < pageCount - 2) pages.push("...")
            pages.push(pageCount)
        }
        return pages
    }

    const goToPage = (page: number) => {
        router.push(pathname + "?" + createQueryString("page", String(page)))
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
                <div className="relative w-full sm:w-auto sm:min-w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        id="global-search-input"
                        placeholder={tDataTable("search")}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePrint()} className="hidden sm:flex h-9 text-xs font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        {t("print")}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                                <Download className="mr-1.5 h-3.5 w-3.5" />
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

            {/* Table */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm bg-white dark:bg-zinc-950 print:border-none print:shadow-none print:m-0 print:p-0" ref={printRef}>
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
                                <TableRow key={headerGroup.id} className="border-b border-zinc-200/80 dark:border-zinc-800/60 bg-zinc-50/80 dark:bg-zinc-900/40 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 print:border-b print:border-gray-300">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-11 px-4 first:pl-4 print:text-black print:font-bold">
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
                                table.getRowModel().rows.map((row, index) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={`
                                            transition-colors duration-150
                                            hover:bg-blue-50/50 dark:hover:bg-blue-950/20
                                            ${index % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/50 dark:bg-zinc-900/20'}
                                            border-b border-zinc-100 dark:border-zinc-800/40
                                        `}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="px-4 py-3 text-sm">
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
                                        className="h-32 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Search className="h-8 w-8 mb-2 opacity-40" />
                                            <p className="text-sm font-medium">{tDataTable("noResults")}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-zinc-100 dark:border-zinc-800/40 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {tDataTable("page")} <span className="font-semibold text-foreground">{currentPage}</span> / <span className="font-semibold text-foreground">{pageCount}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground font-medium">Afficher :</span>
                        {[20, 50, 100, 200].map((size) => {
                            const limit = Number(getSafeSearchParam("limit")) || 20
                            const active = limit === size
                            return (
                                <Button
                                    key={size}
                                    variant={active ? "default" : "outline"}
                                    className={cn(
                                        "h-7 w-10 text-xs font-semibold p-0",
                                        active
                                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-blue-600"
                                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850"
                                    )}
                                    onClick={() => {
                                        const params = new URLSearchParams(getSafeSearchParamsString())
                                        params.set("limit", String(size))
                                        params.set("page", "1")
                                        router.push(pathname + "?" + params.toString())
                                    }}
                                >
                                    {size}
                                </Button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* First page */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-zinc-200 dark:border-zinc-800"
                        onClick={() => goToPage(1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    {/* Previous */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-zinc-200 dark:border-zinc-800"
                        onClick={() => goToPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page numbers */}
                    {getPageNumbers().map((page, idx) =>
                        typeof page === "string" ? (
                            <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
                        ) : (
                            <Button
                                key={page}
                                variant={page === currentPage ? "default" : "outline"}
                                size="icon"
                                className={`h-8 w-8 text-xs font-semibold ${page === currentPage
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 border-blue-600"
                                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                                    }`}
                                onClick={() => goToPage(page)}
                            >
                                {page}
                            </Button>
                        )
                    )}

                    {/* Next */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-zinc-200 dark:border-zinc-800"
                        onClick={() => goToPage(Math.min(pageCount, currentPage + 1))}
                        disabled={currentPage >= pageCount}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {/* Last page */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-zinc-200 dark:border-zinc-800"
                        onClick={() => goToPage(pageCount)}
                        disabled={currentPage >= pageCount}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
