"use client"

import { Plus, FileSpreadsheet } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { CategoryColumn, useCategoryColumns } from "./columns"
import { CategoryModal } from "./category-modal"
import { ExcelImportModal } from "@/components/ui/excel-import-modal"
import { importCategories } from "@/actions/categories"

interface CategoryClientProps {
    data: CategoryColumn[]
}

export const CategoryClient: React.FC<CategoryClientProps> = ({ data }) => {
    const [open, setOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const t = useTranslations("Categories")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const columns = useCategoryColumns()

    return (
        <>
            <CategoryModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={() => { setOpen(false); router.refresh() }}
            />
            <div className="flex items-center justify-between">
                <Heading title={`${t("title")} (${data.length})`} description={t("subtitle")} />
                <div className="flex flex-row flex-wrap gap-2">
                    <Button variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/50" onClick={() => setImportOpen(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
                    </Button>
                    <Button id="global-add-new" onClick={() => setOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F3]</span>
                    </Button>
                </div>
            </div>
            <Separator />
            <DataTable searchKey="name" columns={columns} data={data} />

            <ExcelImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Importer des Catégories depuis Excel"
                description="Téléchargez le modèle, remplissez-le et importez."
                columns={[{ key: "name", label: "Nom" }]}
                onImport={importCategories as any}
                templateFileName="categories_template"
            />
        </>
    )
}
