"use client"

import { Edit, Trash, ScrollText, QrCode, MoreHorizontal } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { CustomerColumn } from "./types"
import { deleteCustomer } from "@/actions/customers"
import { CustomerQrModal } from "./customer-qr-modal"

import { useSession } from "next-auth/react"

interface CellActionProps {
    data: CustomerColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [qrOpen, setQrOpen] = useState(false)
    const t = useTranslations("Customers")
    const tCommon = useTranslations("Common")
    const { data: session } = useSession()

    const onConfirm = async () => {
        try {
            setLoading(true)
            await deleteCustomer(data.id)
            toast.success(t("messages.deleted"))
            router.refresh()
        } catch {
            toast.error(t("messages.error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <CustomerQrModal
                isOpen={qrOpen}
                onClose={() => setQrOpen(false)}
                customer={data}
            />
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    onClick={() => setQrOpen(true)}
                    title={t("actions.showQr")}
                >
                    <QrCode className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => router.push(`/customers/${data.id}/ledger`)}
                    title={t("actions.viewLog")}
                >
                    <ScrollText className="h-4 w-4" />
                </Button>

                {session?.user?.canEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => router.push(`/customers/${data.id}`)}
                        title={tCommon("edit")}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}

                {session?.user?.canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={onConfirm}
                        disabled={loading}
                        title={tCommon("delete")}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </>
    )
}
