"use client"

import { useState } from "react"
import { Eye, Send } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { SalesOrderColumn } from "./types"
import { SendDocumentDialog } from "./send-document-dialog"

interface CellActionProps {
    data: SalesOrderColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const tCommon = useTranslations("Common")
    const [sendDialogOpen, setSendDialogOpen] = useState(false)

    return (
        <>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => router.push(`/sales/${data.id}`)}
                    title={tCommon("view")}
                >
                    <Eye className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => setSendDialogOpen(true)}
                    title="Envoyer"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>

            <SendDocumentDialog
                open={sendDialogOpen}
                onClose={() => setSendDialogOpen(false)}
                salesOrderId={data.id}
                receiptNumber={data.receiptNumber}
                documentType={data.type}
                customerName={data.customer}
                customerPhone={data.customerPhone}
                customerEmail={data.customerEmail}
                total={data.total}
            />
        </>
    )
}
