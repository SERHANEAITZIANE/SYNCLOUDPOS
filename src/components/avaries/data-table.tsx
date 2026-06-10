"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
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
import { AddSpoilageModal } from "./add-spoilage-modal"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    products: { id: string, name: string, quantity: number }[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
    products
}: DataTableProps<TData, TValue>) {
    const tDataTable = useTranslations("DataTable")
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [isModalOpen, setIsModalOpen] = React.useState(false)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            pagination: { pageSize: 20, pageIndex: 0 }
        },
        state: {
            sorting,
            columnFilters,
        },
        meta: {
            products
        }
    })

    // Page number generation for pagination
    const getPageNumbers = React.useCallback(() => {
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

    return (
        <div>
            <AddSpoilageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                products={products}
            />
            <div className="flex items-center justify-between py-4">
                <Input
                    placeholder={tDataTable("search")}
                    value={(table.getColumn("productName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("productName")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <Button onClick={() => setIsModalOpen(true)}>Déclarer une Avarie (Perte stock)</Button>
            </div>

            {/* Row count selector — above the table */}
            <div className="flex items-center gap-1.5 pb-3">
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

            <div className="rounded-md border">
                <Table containerClassName="max-h-[70vh]">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
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
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {tDataTable("noResults")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {table.getPageCount() > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {tDataTable("page")} <span className="font-semibold text-foreground">{table.getState().pagination.pageIndex + 1}</span> / <span className="font-semibold text-foreground">{table.getPageCount()}</span>
                    </p>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
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
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
