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
    VisibilityState,
    ColumnPinningState,
    FilterFn,
    Row,
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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import {
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Download, FileText, Printer, FileSpreadsheet,
    ArrowUpDown, ArrowUp, ArrowDown,
    SlidersHorizontal, GripVertical, RefreshCw,
    Pin, PinOff, Copy, EyeOff, Clipboard, Eye,
    Check, Search, HelpCircle, X,
} from "lucide-react"
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
    storageKey?: string
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
    storageKey
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("Common")
    const tDataTable = useTranslations("DataTable")
    const localStorageKey = useMemo(() => {
        const cleanTitle = exportTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")
        return storageKey ? `table-settings-${storageKey}` : `table-settings-${cleanTitle}`
    }, [storageKey, exportTitle])

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState("")
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [columnOrder, setColumnOrder] = useState<string[]>([])
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] })
    const [rowDensity, setRowDensity] = useState<"compact" | "normal" | "relaxed">("normal")
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; columnId?: string; rowIndex?: number; cellValue?: string } | null>(null)
    const [columnsPanelOpen, setColumnsPanelOpen] = useState(false)
    const [columnSearch, setColumnSearch] = useState("")
    const [copiedToast, setCopiedToast] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Keyboard shortcut: "/" focuses the search input
    useEffect(() => {
        if (hideSearch) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [hideSearch])

    // If pagination is disabled, we set the initial page size to a very large number
    // Default to 20 rows when pagination is enabled
    const initialState = useMemo(() => {
        return showPagination ? { pagination: { pageSize: 20, pageIndex: 0 } } : { pagination: { pageSize: 999999, pageIndex: 0 } };
    }, [showPagination]);

    // Universal global filter: searches all visible columns (text + numbers)
    const universalFilterFn: FilterFn<TData> = useCallback((row: Row<TData>, columnId: string, filterValue: string) => {
        if (!filterValue || filterValue.length === 0) return true
        const search = filterValue.toLowerCase().trim()
        // Check all visible columns
        for (const col of row.getAllCells()) {
            if (col.column.getIsVisible()) {
                const val = col.getValue()
                if (val == null) continue
                // String match: case-insensitive includes
                if (typeof val === 'string' && val.toLowerCase().includes(search)) return true
                // Number match: starts-with (50 matches 50, 500, 50.99)
                if (typeof val === 'number' && String(val).startsWith(search)) return true
                // Boolean match
                if (typeof val === 'boolean') {
                    const boolStr = val ? 'oui yes true' : 'non no false'
                    if (boolStr.includes(search)) return true
                }
            }
        }
        return false
    }, [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        onColumnPinningChange: setColumnPinning,
        globalFilterFn: universalFilterFn,
        onGlobalFilterChange: setGlobalFilter,
        initialState,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            columnVisibility,
            columnOrder,
            columnPinning,
        },
    })

    // Load settings from localStorage once mounted
    useEffect(() => {
        if (!localStorageKey) return
        try {
            const saved = localStorage.getItem(localStorageKey)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed.columnVisibility) setColumnVisibility(parsed.columnVisibility)
                if (parsed.columnOrder) setColumnOrder(parsed.columnOrder)
                if (parsed.rowDensity) setRowDensity(parsed.rowDensity)
                if (parsed.columnPinning) setColumnPinning(parsed.columnPinning)
            } else {
                if (table) {
                    setColumnOrder(table.getAllLeafColumns().map(d => d.id))
                }
            }
        } catch (e) {
            console.error("Error loading table settings", e)
        }
    }, [localStorageKey, mounted])

    // Save settings to localStorage on change
    useEffect(() => {
        if (!localStorageKey || !mounted) return
        try {
            const settings = {
                columnVisibility,
                columnOrder,
                rowDensity,
                columnPinning,
            }
            localStorage.setItem(localStorageKey, JSON.stringify(settings))
        } catch (e) {
            console.error("Error saving table settings", e)
        }
    }, [columnVisibility, columnOrder, rowDensity, columnPinning, localStorageKey, mounted])

    // Sync columns when props change (fallback if no local storage saved)
    useEffect(() => {
        if (table && mounted) {
            try {
                const saved = localStorage.getItem(localStorageKey)
                if (!saved) {
                    setColumnOrder(table.getAllLeafColumns().map(d => d.id))
                }
            } catch (e) {}
        }
    }, [columns, localStorageKey, mounted])

    const dragColumnId = useRef<string | null>(null)

    const handleDragStart = (e: React.DragEvent, columnId: string) => {
        dragColumnId.current = columnId
        e.dataTransfer.setData("text/plain", columnId)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault()
        const sourceColumnId = dragColumnId.current
        if (!sourceColumnId || sourceColumnId === targetColumnId) return

        // Prevent dragging actions or selection columns
        if (sourceColumnId === "actions" || targetColumnId === "actions" || sourceColumnId === "select" || targetColumnId === "select") {
            return
        }

        const currentOrder = [...table.getState().columnOrder]
        const sourceIndex = currentOrder.indexOf(sourceColumnId)
        const targetIndex = currentOrder.indexOf(targetColumnId)

        if (sourceIndex !== -1 && targetIndex !== -1) {
            currentOrder.splice(sourceIndex, 1)
            currentOrder.splice(targetIndex, 0, sourceColumnId)
            setColumnOrder(currentOrder)
        }
        dragColumnId.current = null
    }

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

    // Copy to clipboard helper
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedToast(true)
            setTimeout(() => setCopiedToast(false), 1500)
        })
    }

    // Copy entire row as tab-separated
    const copyRow = (rowIndex: number) => {
        const row = table.getRowModel().rows[rowIndex]
        if (!row) return
        const values = table.getAllLeafColumns()
            .filter(col => col.getIsVisible() && col.id !== "actions" && col.id !== "select")
            .map(col => {
                const val = row.getValue(col.id)
                return val === null || val === undefined ? "" : String(val)
            })
        copyToClipboard(values.join("\t"))
    }

    // Get column label for display
    const getColumnLabel = (column: { id: string; columnDef: { header: unknown } }) => {
        if (column.id === "select") return tDataTable("selection")
        if (column.id === "actions") return "Actions"
        return typeof column.columnDef.header === "string" ? column.columnDef.header : column.id
    }

    // Filtered columns for visibility panel search
    const filteredPanelColumns = useMemo(() => {
        return table
            .getAllColumns()
            .filter(col => col.id !== "actions")
            .filter(col => {
                if (!columnSearch) return true
                const label = getColumnLabel(col)
                return label.toLowerCase().includes(columnSearch.toLowerCase())
            })
    }, [table, columnSearch, columnVisibility])

    // Count visible columns
    const visibleCount = table.getAllColumns().filter(c => c.getIsVisible() && c.id !== "actions").length
    const totalManageableCount = table.getAllColumns().filter(c => c.id !== "actions").length

    // Selected rows count
    const selectedCount = table.getSelectedRowModel().rows.length

    // Current sort info
    const currentSort = sorting.length > 0 ? sorting[0] : null
    const sortedColumn = currentSort ? table.getColumn(currentSort.id) : null
    const sortedColumnLabel = sortedColumn ? getColumnLabel(sortedColumn) : null

    // Get pinned columns info
    const leftPinnedIds = columnPinning.left || []
    const rightPinnedIds = columnPinning.right || []

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0 no-print">
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    {!hideSearch && (
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                id="global-search-input"
                                placeholder={tDataTable("search")}
                                value={globalFilter ?? ""}
                                onChange={(event) => setGlobalFilter(event.target.value)}
                                className="pl-9 pr-8 h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all"
                            />
                            {globalFilter && (
                                <button
                                    onClick={() => setGlobalFilter("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
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

                    {/* Column Visibility Panel Trigger */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        onClick={() => setColumnsPanelOpen(true)}
                    >
                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                        {tDataTable("columns")}
                        <span className="ml-1.5 text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full font-bold tabular-nums">
                            {visibleCount}/{totalManageableCount}
                        </span>
                    </Button>

                    {/* Shortcuts Info Button */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 shrink-0"
                                title={tDataTable("help") || "Raccourcis & Astuces"}
                            >
                                <HelpCircle className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[320px] p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50">
                            <div className="space-y-3">
                                <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-150 flex items-center gap-1.5 border-b border-zinc-150 dark:border-zinc-800 pb-2">
                                    <HelpCircle className="h-4 w-4 text-blue-500" />
                                    {tDataTable("helpTitle") || "Raccourcis & Astuces de Table"}
                                </h4>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex flex-col gap-1 shrink-0 w-24">
                                            <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xs text-zinc-600 dark:text-zinc-300">
                                                Clic G. + Glisser
                                            </kbd>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-tight">
                                            {tDataTable("shortcutDragScroll") || "Faire glisser le tableau pour défiler de gauche à droite."}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex flex-col gap-1 shrink-0 w-24">
                                            <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xs text-zinc-600 dark:text-zinc-300">
                                                Shift + Molette
                                            </kbd>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-tight">
                                            {tDataTable("shortcutSwipe") || "Faire défiler horizontalement avec le clavier et la souris."}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex flex-col gap-1 shrink-0 w-24">
                                            <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xs text-zinc-600 dark:text-zinc-300">
                                                Glisser En-tête
                                            </kbd>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-tight">
                                            {tDataTable("shortcutDragHeader") || "Glisser-déposer les en-têtes de colonnes pour les réordonner."}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex flex-col gap-1 shrink-0 w-24">
                                            <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xs text-zinc-600 dark:text-zinc-300">
                                                Clic Droit
                                            </kbd>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-tight">
                                            {tDataTable("shortcutRightClick") || "Menu contextuel : copier, trier, épingler et masquer."}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex flex-col gap-1 shrink-0 w-24">
                                            <kbd className="px-1.5 py-0.5 text-[9px] font-semibold text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xs text-zinc-600 dark:text-zinc-300">
                                                Boutons &lt; &gt;
                                            </kbd>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-tight">
                                            {tDataTable("shortcutArrows") || "Boutons fléchés sur les côtés du tableau pour défiler."}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
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
             <div 
                className="rounded-md border overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0 relative" 
                ref={printRef}
                onContextMenu={(e) => {
                    e.preventDefault()
                    const target = e.target as HTMLElement
                    const cell = target.closest("td, th")
                    const row = target.closest("tr")
                    let columnId: string | undefined
                    let rowIndex: number | undefined
                    let cellValue: string | undefined

                    if (cell) {
                        const cellIndex = Array.from(cell.parentElement?.children || []).indexOf(cell)
                        const visibleColumns = table.getVisibleLeafColumns()
                        if (cellIndex >= 0 && cellIndex < visibleColumns.length) {
                            columnId = visibleColumns[cellIndex].id
                        }
                        cellValue = cell.textContent || ""
                    }

                    if (row) {
                        const tbody = row.closest("tbody")
                        if (tbody) {
                            rowIndex = Array.from(tbody.children).indexOf(row)
                        }
                    }

                    setContextMenu({ x: e.clientX, y: e.clientY, columnId, rowIndex, cellValue })
                }}
            >
                {/* Print Header - Only visible when printing */}
                {!hidePrintHeader && <div className="hidden print:block mb-8 mt-4">
                    <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-black font-serif">{exportTitle}</h1>
                            {exportDescription && <p className="text-base text-gray-700 mt-2 font-medium">{exportDescription}</p>}
                            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wider">SYNCLOUDPOS</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-black">{t("date")}: {mounted ? new Date().toLocaleDateString() : ""}</p>
                            <p className="text-xs text-gray-500 mt-1">{mounted ? new Date().toLocaleTimeString() : ""}</p>
                        </div>
                    </div>
                </div>}

                <Table className="print:w-full print:border-collapse print:text-black" containerClassName="max-h-[70vh] print:max-h-none print:overflow-visible">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 print:bg-gray-100 print:text-black print:border-b-2 print:border-gray-800">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="print:border-b print:border-gray-300">
                                {headerGroup.headers.map((header, headerIndex) => {
                                    const isSticky = headerIndex === 0 && (header.column.columnDef.meta as any)?.sticky
                                    const canDrag = header.column.id !== "actions" && header.column.id !== "select"
                                    const isPinnedLeft = leftPinnedIds.includes(header.column.id)
                                    const isPinnedRight = rightPinnedIds.includes(header.column.id)
                                    const isPinned = isPinnedLeft || isPinnedRight
                                    const isSorted = currentSort?.id === header.column.id

                                    return (
                                        <TableHead 
                                            key={header.id} 
                                            className={cn(
                                                "whitespace-nowrap print:text-black print:font-bold transition-all relative group",
                                                isSticky && "sticky left-0 z-20 bg-muted/95 backdrop-blur-sm shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-[1px] after:bg-border",
                                                canDrag && "cursor-grab active:cursor-grabbing hover:bg-muted/80",
                                                isPinnedLeft && !isSticky && "sticky left-0 z-20 bg-muted/95 backdrop-blur-sm shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-[2px] after:bg-blue-400/30",
                                                isPinnedRight && "sticky right-0 z-20 bg-muted/95 backdrop-blur-sm shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.1)] after:absolute after:top-0 after:left-0 after:bottom-0 after:w-[2px] after:bg-blue-400/30",
                                                isSorted && "text-blue-600 dark:text-blue-400"
                                            )}
                                            draggable={canDrag}
                                            onDragStart={(e) => handleDragStart(e, header.column.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, header.column.id)}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div className="flex items-center gap-1.5">
                                                    {isPinned && (
                                                        <Pin className="h-2.5 w-2.5 text-blue-500 shrink-0 -ml-0.5" />
                                                    )}
                                                    {canDrag && !isPinned && (
                                                        <GripVertical className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0 -ml-1" />
                                                    )}
                                                    <div 
                                                        className={cn(
                                                            "flex items-center gap-1.5 select-none", 
                                                            header.column.getCanSort() && "cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200"
                                                        )}
                                                        onClick={(e) => {
                                                            if (e.defaultPrevented) return
                                                            header.column.getToggleSortingHandler()?.(e)
                                                        }}
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {header.column.getCanSort() && (
                                                            <div className="flex flex-col items-center justify-center text-muted-foreground w-4 shrink-0">
                                                                {{
                                                                    asc: <ArrowUp className="h-3 w-3 text-blue-500" />,
                                                                    desc: <ArrowDown className="h-3 w-3 text-blue-500" />,
                                                                }[header.column.getIsSorted() as string] ?? (
                                                                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100 transition-opacity" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
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
                                    className={cn(
                                        row.getIsSelected() && "border-l-2 border-l-blue-500"
                                    )}
                                >
                                    {row.getVisibleCells().map((cell, cellIndex) => {
                                        const isSticky = cellIndex === 0 && (cell.column.columnDef.meta as any)?.sticky
                                        const isPinnedLeft = leftPinnedIds.includes(cell.column.id)
                                        const isPinnedRight = rightPinnedIds.includes(cell.column.id)
                                        const isSortedCol = currentSort?.id === cell.column.id

                                        return (
                                            <TableCell 
                                                key={cell.id} 
                                                className={cn(
                                                    "whitespace-normal min-w-[150px] transition-all duration-150",
                                                    isSticky && "sticky left-0 z-10 bg-background/95 backdrop-blur-sm shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-[1px] after:bg-border/50",
                                                    rowDensity === "compact" ? "py-1" : rowDensity === "relaxed" ? "py-4.5" : "py-2.5",
                                                    isPinnedLeft && !isSticky && "sticky left-0 z-10 bg-background/95 backdrop-blur-sm shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-[2px] after:bg-blue-400/20",
                                                    isPinnedRight && "sticky right-0 z-10 bg-background/95 backdrop-blur-sm shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.06)] after:absolute after:top-0 after:left-0 after:bottom-0 after:w-[2px] after:bg-blue-400/20",
                                                    isSortedCol && "bg-blue-50/30 dark:bg-blue-950/10",
                                                )}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        )
                                    })}
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

            {/* Status Bar */}
            <div className="flex items-center gap-3 px-1 py-2 text-[11px] text-muted-foreground no-print">
                <span className="tabular-nums">{table.getFilteredRowModel().rows.length} {tDataTable("results")}</span>
                {selectedCount > 0 && (
                    <>
                        <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{selectedCount} {tDataTable("selected")}</span>
                    </>
                )}
                {sortedColumnLabel && (
                    <>
                        <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                        <span className="flex items-center gap-1">
                            {tDataTable("sortedBy")}: <span className="font-medium text-foreground">{sortedColumnLabel}</span>
                            {currentSort?.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        </span>
                    </>
                )}
                {(leftPinnedIds.length > 0 || rightPinnedIds.length > 0) && (
                    <>
                        <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                        <span className="flex items-center gap-1">
                            <Pin className="h-3 w-3" /> {leftPinnedIds.length + rightPinnedIds.length} {tDataTable("pinned")}
                        </span>
                    </>
                )}
            </div>

            {/* Click-outside context menu overlay */}
            {contextMenu && (
                <div 
                    className="fixed inset-0 z-50 no-print" 
                    onClick={() => setContextMenu(null)}
                    onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu(null)
                    }}
                />
            )}

            {/* Enhanced Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-50 min-w-[240px] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 text-xs text-zinc-700 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100 no-print"
                    style={{ 
                        left: `${Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 260)}px`, 
                        top: `${Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 400)}px` 
                    }}
                >
                    {/* Column-specific actions */}
                    {contextMenu.columnId && contextMenu.columnId !== "actions" && contextMenu.columnId !== "select" && (
                        <>
                            <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                {getColumnLabel(table.getColumn(contextMenu.columnId)!)}
                            </div>
                            <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />

                            {contextMenu.cellValue && (
                                <button 
                                    onClick={() => { copyToClipboard(contextMenu.cellValue || ""); setContextMenu(null); }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                >
                                    <Copy className="h-3.5 w-3.5 text-zinc-500" />
                                    <span>{tDataTable("copyCell")}</span>
                                    <span className="ml-auto text-[10px] text-zinc-400">Ctrl+C</span>
                                </button>
                            )}

                            {contextMenu.rowIndex !== undefined && (
                                <button 
                                    onClick={() => { copyRow(contextMenu.rowIndex!); setContextMenu(null); }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                >
                                    <Clipboard className="h-3.5 w-3.5 text-zinc-500" />
                                    <span>{tDataTable("copyRow")}</span>
                                </button>
                            )}

                            <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />

                            {table.getColumn(contextMenu.columnId)?.getCanSort() && (
                                <>
                                    <button 
                                        onClick={() => { 
                                            setSorting([{ id: contextMenu.columnId!, desc: false }])
                                            setContextMenu(null) 
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                    >
                                        <ArrowUp className="h-3.5 w-3.5 text-blue-500" />
                                        <span>{tDataTable("sortAsc")}</span>
                                    </button>
                                    <button 
                                        onClick={() => { 
                                            setSorting([{ id: contextMenu.columnId!, desc: true }])
                                            setContextMenu(null) 
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                    >
                                        <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
                                        <span>{tDataTable("sortDesc")}</span>
                                    </button>
                                    <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />
                                </>
                            )}

                            {leftPinnedIds.includes(contextMenu.columnId) || rightPinnedIds.includes(contextMenu.columnId) ? (
                                <button 
                                    onClick={() => { 
                                        table.getColumn(contextMenu.columnId!)?.pin(false)
                                        setContextMenu(null) 
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                >
                                    <PinOff className="h-3.5 w-3.5 text-orange-500" />
                                    <span>{tDataTable("unpin")}</span>
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => { 
                                            table.getColumn(contextMenu.columnId!)?.pin("left")
                                            setContextMenu(null) 
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                    >
                                        <Pin className="h-3.5 w-3.5 text-blue-500" />
                                        <span>{tDataTable("pinLeft")}</span>
                                    </button>
                                    <button 
                                        onClick={() => { 
                                            table.getColumn(contextMenu.columnId!)?.pin("right")
                                            setContextMenu(null) 
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                                    >
                                        <Pin className="h-3.5 w-3.5 text-purple-500 rotate-90" />
                                        <span>{tDataTable("pinRight")}</span>
                                    </button>
                                </>
                            )}

                            <button 
                                onClick={() => { 
                                    table.getColumn(contextMenu.columnId!)?.toggleVisibility(false)
                                    setContextMenu(null) 
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                            >
                                <EyeOff className="h-3.5 w-3.5 text-zinc-500" />
                                <span>{tDataTable("hideColumn")}</span>
                            </button>

                            <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />
                        </>
                    )}

                    {/* General table actions */}
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {tDataTable("tableActions")}
                    </div>
                    <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />
                    
                    <button 
                        onClick={() => { handleExportExcel(); setContextMenu(null); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                        <span>{tDataTable("exportExcel")}</span>
                    </button>
                    <button 
                        onClick={() => { handleExportPDF(); setContextMenu(null); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                    >
                        <FileText className="h-3.5 w-3.5 text-red-600" />
                        <span>{tDataTable("exportPdf")}</span>
                    </button>
                    <button 
                        onClick={() => { handlePrint(); setContextMenu(null); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left"
                    >
                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                        <span>{tDataTable("printPage")}</span>
                    </button>
                    
                    <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {tDataTable("displayDensity")}
                    </div>
                    
                    {(["compact", "normal", "relaxed"] as const).map((density) => (
                        <button
                            key={density}
                            onClick={() => { setRowDensity(density); setContextMenu(null); }}
                            className={cn(
                                "w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left capitalize",
                                rowDensity === density && "font-bold text-blue-600 dark:text-blue-400"
                            )}
                        >
                            <span>{density === "compact" ? tDataTable("compact") : density === "relaxed" ? tDataTable("relaxed") : tDataTable("default")}</span>
                            {rowDensity === density && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
                        </button>
                    ))}

                    <div className="h-[1px] bg-zinc-150 dark:bg-zinc-800/60 my-1" />
                    
                    <button
                        onClick={() => {
                            try {
                                if (localStorageKey) localStorage.removeItem(localStorageKey)
                                setColumnVisibility({})
                                setColumnOrder(table.getAllLeafColumns().map(d => d.id))
                                setColumnPinning({ left: [], right: [] })
                                setRowDensity("normal")
                            } catch (e) {}
                            setContextMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors text-left"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{tDataTable("resetDisplay")}</span>
                    </button>
                </div>
            )}

            {/* Copied Toast */}
            {copiedToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200 no-print">
                    <Check className="h-4 w-4 text-green-400 dark:text-green-600" />
                    {tDataTable("copied")}
                </div>
            )}

            {/* Column Visibility Sidebar Panel */}
            <Sheet open={columnsPanelOpen} onOpenChange={setColumnsPanelOpen}>
                <SheetContent side="right" className="w-[340px] sm:w-[380px] flex flex-col p-0">
                    <SheetHeader className="p-5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <SheetTitle className="text-base">{tDataTable("manageColumns")}</SheetTitle>
                        <SheetDescription className="text-xs">{tDataTable("manageColumnsDesc")}</SheetDescription>
                    </SheetHeader>

                    {/* Search + Bulk Actions */}
                    <div className="px-4 pt-3 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder={tDataTable("searchColumns")}
                                value={columnSearch}
                                onChange={(e) => setColumnSearch(e.target.value)}
                                className="pl-8 h-8 text-xs bg-zinc-50 dark:bg-zinc-900/50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] flex-1"
                                onClick={() => {
                                    table.getAllColumns()
                                        .filter(c => c.id !== "actions")
                                        .forEach(c => c.toggleVisibility(true))
                                }}
                            >
                                <Eye className="mr-1 h-3 w-3" />
                                {tDataTable("showAll")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] flex-1"
                                onClick={() => {
                                    table.getAllColumns()
                                        .filter(c => c.id !== "actions" && c.id !== "select")
                                        .forEach(c => c.toggleVisibility(false))
                                }}
                            >
                                <EyeOff className="mr-1 h-3 w-3" />
                                {tDataTable("hideAll")}
                            </Button>
                        </div>
                    </div>

                    {/* Column List */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                            {tDataTable("dataColumns")} ({visibleCount}/{totalManageableCount})
                        </div>
                        {filteredPanelColumns.map((column) => {
                            const label = getColumnLabel(column)
                            const isVisible = column.getIsVisible()
                            const isPinnedLeft = leftPinnedIds.includes(column.id)
                            const isPinnedRight = rightPinnedIds.includes(column.id)
                            const isPinned = isPinnedLeft || isPinnedRight

                            return (
                                <div
                                    key={column.id}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 group",
                                        isVisible 
                                            ? "bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/40" 
                                            : "opacity-50 hover:opacity-80 hover:bg-zinc-50 dark:hover:bg-zinc-900/20",
                                        isPinned && "ring-1 ring-blue-200 dark:ring-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {isPinned && <Pin className="h-3 w-3 text-blue-500 shrink-0" />}
                                        <span className="text-xs font-medium truncate">{label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {column.id !== "select" && column.id !== "actions" && isVisible && (
                                            <button
                                                onClick={() => {
                                                    if (isPinned) {
                                                        column.pin(false)
                                                    } else {
                                                        column.pin("left")
                                                    }
                                                }}
                                                className={cn(
                                                    "h-6 w-6 rounded-md flex items-center justify-center transition-all",
                                                    isPinned 
                                                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" 
                                                        : "opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                                                )}
                                                title={isPinned ? tDataTable("unpin") : tDataTable("pinLeft")}
                                            >
                                                {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                            </button>
                                        )}
                                        <Switch
                                            size="sm"
                                            checked={isVisible}
                                            onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Panel Footer */}
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            onClick={() => {
                                try {
                                    if (localStorageKey) localStorage.removeItem(localStorageKey)
                                    setColumnVisibility({})
                                    setColumnOrder(table.getAllLeafColumns().map(d => d.id))
                                    setColumnPinning({ left: [], right: [] })
                                    setRowDensity("normal")
                                } catch (e) {}
                            }}
                        >
                            <RefreshCw className="mr-1.5 h-3 w-3" />
                            {tDataTable("resetDisplay")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

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
