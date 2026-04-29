"use client"

import { Eye } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { PurchaseOrderColumn } from "./types"

interface CellActionProps {
    data: PurchaseOrderColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const tCommon = useTranslations("Common")

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => router.push(`/purchases/${data.id}`)}
                title={tCommon("view")}
            >
                <Eye className="h-4 w-4" />
            </Button>
        </div>
    )
}
