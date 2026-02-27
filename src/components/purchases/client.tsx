"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { usePurchaseColumns } from "@/components/purchases/columns"
import { PurchaseOrderColumn } from "@/components/purchases/types"
import { Link } from "@/i18n/routing"

interface PurchasesClientProps {
    data: PurchaseOrderColumn[]
}

export const PurchasesClient: React.FC<PurchasesClientProps> = ({ data }) => {
    const t = useTranslations("Purchases")
    const tCommon = useTranslations("Common")
    const columns = usePurchaseColumns()

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("title")} (${data.length})`}
                    description={t("subtitle")}
                />
                <Link href="/purchases/new">
                    <Button id="global-add-new">
                        <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F3]</span>
                    </Button>
                </Link>
            </div>
            <Separator />
            <DataTable searchKey="supplier" columns={columns} data={data} />
        </>
    )
}
