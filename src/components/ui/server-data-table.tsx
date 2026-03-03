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
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { useDebounce } from "use-debounce"
import { useTranslations } from "next-intl"

interface ServerDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey: string
    pageCount: number
    currentPage: number
}

export function ServerDataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    pageCount,
    currentPage,
}: ServerDataTableProps<TData, TValue>) {
    const t = useTranslations("DataTable")
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

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 py-4">
                <Input
                    id="global-search-input"
                    placeholder={t("search")}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="max-w-sm"
                />
            </div>
            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
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
                <div className="text-sm font-medium">{t("page")} {currentPage} / {pageCount}</div>
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
