"use client"

import { Plus } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { useExpenseColumns } from "@/components/expenses/columns"
import { ExpenseColumn } from "@/components/expenses/types"

interface ExpensesClientProps {
    data: ExpenseColumn[]
}

export const ExpensesClient: React.FC<ExpensesClientProps> = ({ data }) => {
    const router = useRouter()
    const t = useTranslations("Expenses")
    const tCommon = useTranslations("Common")
    const columns = useExpenseColumns()

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`${t("title")} (${data.length})`}
                    description={t("subtitle")}
                />
                <Button onClick={() => router.push(`/expenses/new`)}>
                    <Plus className="mr-2 h-4 w-4" /> {tCommon("addNew")}
                </Button>
            </div>
            <Separator />
            <DataTable  exportTitle={t("title")} exportDescription={t("subtitle")} searchKey="description" columns={columns} data={data} />
        </>
    )
}
