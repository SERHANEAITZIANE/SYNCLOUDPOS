"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { CategoryColumn, useCategoryColumns } from "./columns"
import { CategoryModal } from "./category-modal"

interface CategoryClientProps {
    data: CategoryColumn[]
}

export const CategoryClient: React.FC<CategoryClientProps> = ({ data }) => {
    const [open, setOpen] = useState(false)
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
                <Button id="global-add-new" onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                    <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F3]</span>
                </Button>
            </div>
            <Separator />
            <DataTable searchKey="name" columns={columns} data={data} />
        </>
    )
}
