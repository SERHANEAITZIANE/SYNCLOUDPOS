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
                    variant="ghost-info"
                    size="icon-sm"
                    onClick={() => router.push(`/sales/${data.id}`)}
                    title={tCommon("view")}
                >
                    <Eye className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost-success"
                    size="icon-sm"
                    onClick={() => setSendDialogOpen(true)}
                    title="Envoyer"
                >
                    <Send className="h-4 w-4" />
                </Button>

                {(session?.user?.role === "ADMIN" || session?.user?.isSuperadmin || session?.user?.canDelete) && (
                    <Button
                        variant="ghost-danger"
                        size="icon-sm"
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
