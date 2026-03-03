"use client"

import { Edit, MoreHorizontal, Trash, History } from "lucide-react"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"
import { useTranslations } from "next-intl"

import { deleteProduct } from "@/actions/products"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProductColumn } from "./columns"

import { StockHistoryModal } from "./stock-history-modal"

interface CellActionProps {
    data: ProductColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const params = useParams()
    const t = useTranslations("Products")
    const tCommon = useTranslations("Common")
    const [loading, setLoading] = useState(false)
    const [openHistory, setOpenHistory] = useState(false)
    const { data: session } = useSession()

    const onConfirm = async () => {
        try {
            setLoading(true)
            await deleteProduct(data.id)
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <StockHistoryModal
                isOpen={openHistory}
                onClose={() => setOpenHistory(false)}
                productId={data.id}
                productName={data.name}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => setOpenHistory(true)}>
                        <History className="mr-2 h-4 w-4 text-blue-500" /> {t("stockHistoryLabel")}
                    </DropdownMenuItem>

                    {session?.user?.canEdit && (
                        <DropdownMenuItem onClick={() => router.push(`/products/${data.id}`)}>
                            <Edit className="mr-2 h-4 w-4" /> {tCommon("edit")}
                        </DropdownMenuItem>
                    )}

                    {session?.user?.canDelete && (
                        <DropdownMenuItem
                            onClick={onConfirm}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                            <Trash className="mr-2 h-4 w-4" /> {tCommon("delete")}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
