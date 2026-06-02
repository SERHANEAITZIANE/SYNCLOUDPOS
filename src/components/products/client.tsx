"use client"

import { Plus, FileSpreadsheet, FileText, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useDebounce } from "use-debounce"

import { Button } from "@/components/ui/button"
import { ServerDataTable } from "@/components/ui/server-data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ProductColumn, useProductColumns } from "./columns"
import { ProductGridView } from "./product-grid-view"
import { ExcelImportModal } from "@/components/ui/excel-import-modal"
import { cn } from "@/lib/utils"
import { importProducts } from "@/actions/products"
import { PriceListModal } from "@/components/products/price-list-modal"
import { Input } from "@/components/ui/input"

interface ProductClientProps {
    data: ProductColumn[]
    totalCount: number
    pageCount: number
    currentPage: number
}

export const ProductClient: React.FC<ProductClientProps> = ({
    data,
    totalCount,
    pageCount,
    currentPage
}) => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const locale = useLocale()
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")
    const tDataTable = useTranslations("DataTable")
    const columns = useProductColumns()
    const [importOpen, setImportOpen] = useState(false)
    const [isPriceListOpen, setIsPriceListOpen] = useState(false)
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

    const [searchQuery, setSearchQuery] = useState(searchParams?.get("name") || "")
    const [debouncedSearch] = useDebounce(searchQuery, 500)

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams?.toString() || "")
            params.set(name, value)
            return params.toString()
        },
        [searchParams]
    )

    useEffect(() => {
        if (viewMode !== "grid") return
        if (searchParams) {
            const currentSearch = searchParams.get("name") || ""
            if (debouncedSearch !== currentSearch) {
                const params = new URLSearchParams(searchParams.toString())
                if (debouncedSearch) {
                    params.set("name", debouncedSearch)
                } else {
                    params.delete("name")
                }
                params.set("page", "1") // reset page on new search
                router.push(pathname + "?" + params.toString())
            }
        }
    }, [debouncedSearch, pathname, router, searchParams, viewMode])

    useEffect(() => {
        if (viewMode !== "grid") return
        if (searchParams) {
            setSearchQuery(searchParams.get("name") || "")
        }
    }, [searchParams, viewMode])

    // Load saved preference on mount
    useEffect(() => {
        const savedView = localStorage.getItem("productCatalogView") as "grid" | "table"
        if (savedView) setViewMode(savedView)
    }, [])

    const toggleViewMode = (mode: "grid" | "table") => {
        setViewMode(mode)
        localStorage.setItem("productCatalogView", mode)
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title={`${t("title")} (${totalCount})`} description={t("subtitle")} />
                <div className="flex flex-row flex-wrap gap-2">
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-md p-1 mr-2 border border-border/50">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toggleViewMode("grid")}
                            className={cn("h-8 px-2.5", viewMode === "grid" ? "shadow-sm" : "text-muted-foreground")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toggleViewMode("table")}
                            className={cn("h-8 px-2.5", viewMode === "table" ? "shadow-sm" : "text-muted-foreground")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50" onClick={() => setIsPriceListOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" /> {t("catalogue")}
                    </Button>
                    <Button variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/50" onClick={() => setImportOpen(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> {t("importExcel")}
                    </Button>
                    <Button variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 dark:bg-orange-950/30 dark:border-orange-900/50 dark:hover:bg-orange-900/50" onClick={() => router.push(`/products/inventory`)}>
                        {t("outOfStock")}
                    </Button>
                    <Button id="global-add-new" onClick={() => router.push(`/products/new`)}>
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F3]</span>
                    </Button>
                </div>
            </div>
            <Separator />

            {viewMode === "grid" ? (
                <div className="mt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
                        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                            <Input
                                id="global-search-input-grid"
                                placeholder={tDataTable("search")}
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="max-w-sm w-full"
                            />
                        </div>
                    </div>

                    <ProductGridView data={data} />

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
            ) : (
                <ServerDataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="name" columns={columns} data={data} pageCount={pageCount} currentPage={currentPage} />
            )}

            <ExcelImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title={t("importTitle")}
                description={t("importDesc")}
                columns={[
                    { key: "name", label: t("fields.name") },
                    { key: "price", label: t("fields.price") },
                    { key: "cost", label: t("fields.purchasePrice") },
                    { key: "wholesalePrice", label: t("fields.wholesalePrice") },
                    { key: "dealerPrice", label: t("fields.dealerPrice") },
                    { key: "stock", label: t("fields.stock") },
                    { key: "minStock", label: t("fields.minStock") },
                    { key: "category", label: t("fields.category") },
                    { key: "brand", label: t("fields.brand") },
                    { key: "barcode", label: t("fields.barcode") },
                    { key: "description", label: t("fields.description") },
                    { key: "tvaRate", label: "TVA %" },
                    { key: "favoris", label: "Favoris (1 / 0)" },
                    { key: "archive", label: "Archivé (1 / 0)" },
                ]}
                onImport={importProducts as any}
                templateFileName="produits_template"
            />

            <PriceListModal
                isOpen={isPriceListOpen}
                onClose={() => setIsPriceListOpen(false)}
            />
        </>
    )
}
