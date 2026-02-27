"use client"

import { Plus } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ProductColumn, useProductColumns } from "./columns"

interface ProductClientProps {
    data: ProductColumn[]
}

export const ProductClient: React.FC<ProductClientProps> = ({
    data
}) => {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")
    const columns = useProductColumns()

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title={`${t("title")} (${data.length})`} description={t("subtitle")} />
                <div className="flex flex-row space-x-2">
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
            <DataTable searchKey="name" columns={columns} data={data} />

        </>
    )
}
