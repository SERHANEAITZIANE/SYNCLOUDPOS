"use client"

import { Plus, FileSpreadsheet } from "lucide-react"
import { useState } from "react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { ServerDataTable } from "@/components/ui/server-data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ProductColumn, useProductColumns } from "./columns"
import { ExcelImportModal } from "@/components/ui/excel-import-modal"
import { importProducts } from "@/actions/products"

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

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title={`${t("title")} (${totalCount})`} description={t("subtitle")} />
                <div className="flex flex-row flex-wrap gap-2">
                    <Button variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/50" onClick={() => setImportOpen(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
                    </Button>
                    <Button variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 dark:bg-orange-950/30 dark:border-orange-900/50 dark:hover:bg-orange-900/50" onClick={() => router.push(`/products/inventory`)}>
                        Rupture Stock
                    </Button>
                    <Button id="global-add-new" onClick={() => router.push(`/products/new`)}>
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F3]</span>
                    </Button>
                </div>
            </div>
            <Separator />
            <ServerDataTable searchKey="name" columns={columns} data={data} pageCount={pageCount} currentPage={currentPage} />

            <ExcelImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Importer des Produits depuis Excel"
                description="Téléchargez le modèle, remplissez-le et importez."
                columns={[
                    { key: "Nom", label: "Nom" },
                    { key: "Prix Vente", label: "Prix Vente" },
                    { key: "Prix Achat", label: "Prix Achat" },
                    { key: "Prix Gros", label: "Prix Gros" },
                    { key: "Stock", label: "Stock" },
                    { key: "Stock Min", label: "Stock Min" },
                    { key: "Catégorie", label: "Catégorie" },
                    { key: "Marque", label: "Marque" },
                    { key: "Code-barres", label: "Code-barres" },
                    { key: "Description", label: "Description" },
                ]}
                onImport={importProducts as any}
                templateFileName="produits_template"
            />
        </>
    )
}
