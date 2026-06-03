"use client"

import { useState } from "react"
import { Eye, Send, Trash } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/modals/alert-modal"
import { deleteSalesOrder } from "@/actions/sales-orders"
import { SalesOrderColumn } from "./types"
import { SendDocumentDialog } from "./send-document-dialog"

interface CellActionProps {
    data: SalesOrderColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const tCommon = useTranslations("Common")
    const { data: session } = useSession()
    const [sendDialogOpen, setSendDialogOpen] = useState(false)
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const onDelete = async () => {
        try {
            setLoading(true)
            const res = await deleteSalesOrder(data.id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(res.success || "Vente annulée ou supprimée avec succès")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue lors de la suppression")
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    return (
        <>
            <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onDelete} loading={loading} />
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

                {session?.user?.canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setOpen(true)}
                        title={tCommon("delete")}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
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
