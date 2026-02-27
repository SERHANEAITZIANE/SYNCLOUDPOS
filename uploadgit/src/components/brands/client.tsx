"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { BrandColumn, useBrandColumns } from "./columns"
import { BrandModal } from "./brand-modal"

interface BrandClientProps {
    data: BrandColumn[]
}

export const BrandClient: React.FC<BrandClientProps> = ({ data }) => {
    const [open, setOpen] = useState(false)
    const t = useTranslations("Brands")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const columns = useBrandColumns()

    return (
        <>
            <BrandModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={() => { setOpen(false); router.refresh() }}
            />
            <div className="flex items-center justify-between">
                <Heading title={`${t("title")} (${data.length})`} description={t("subtitle")} />
                <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                </Button>
            </div>
            <Separator />
            <DataTable searchKey="name" columns={columns} data={data} />
        </>
    )
}
