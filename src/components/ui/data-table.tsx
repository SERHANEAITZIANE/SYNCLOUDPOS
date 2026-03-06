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
import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"

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
    const t = useTranslations("DataTable")
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

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 py-4">
                <Input
                    id="global-search-input"
                    placeholder={t("search")}
                    value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn(searchKey)?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />

                {/* Client Type Filter */}
                {table.getAllColumns().some(c => c.id === "clientType") && (
                    <Select
                        value={(table.getColumn("clientType")?.getFilterValue() as string) ?? "ALL"}
                        onValueChange={(value) =>
                            table.getColumn("clientType")?.setFilterValue(value === "ALL" ? "" : value)
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t("allTypes")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                            <SelectItem value="RETAIL">{t("retail")}</SelectItem>
                            <SelectItem value="RESELLER">{t("reseller")}</SelectItem>
                            <SelectItem value="WHOLESALE">{t("wholesale")}</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto max-h-[800px]">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="whitespace-nowrap">
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
                                        {t("noResults")}
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
