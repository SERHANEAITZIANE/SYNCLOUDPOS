"use client"

import { Plus, FileSpreadsheet, FileText, LayoutGrid, List } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"

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
    const locale = useLocale()
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")
    const columns = useProductColumns()
    const [importOpen, setImportOpen] = useState(false)
    const [isPriceListOpen, setIsPriceListOpen] = useState(false)
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

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
                    <ProductGridView data={data} />
                    {/* Pagination will eventually need to be wired up for grid but relying on server-data-table pagination logic right now is tricky. We'll show the grid for the current page. */}
                </div>
            ) : (
                <ServerDataTable searchKey="name" columns={columns} data={data} pageCount={pageCount} currentPage={currentPage} />
            )}

            <ExcelImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title={t("importTitle")}
                description={t("importDesc")}
                columns={[
                    { key: t("fields.name"), label: t("fields.name") },
                    { key: t("fields.price"), label: t("fields.price") },
                    { key: t("fields.purchasePrice"), label: t("fields.purchasePrice") },
                    { key: t("fields.wholesalePrice"), label: t("fields.wholesalePrice") },
                    { key: t("fields.stock"), label: t("fields.stock") },
                    { key: t("fields.minStock"), label: t("fields.minStock") },
                    { key: t("fields.category"), label: t("fields.category") },
                    { key: t("fields.brand"), label: t("fields.brand") },
                    { key: t("fields.barcode"), label: t("fields.barcode") },
                    { key: t("fields.description"), label: t("fields.description") },
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
