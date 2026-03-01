"use client"

import { Edit, MoreHorizontal, Trash } from "lucide-react"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { useState } from "react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ProductColumn } from "./columns"

import { deleteProduct } from "@/actions/products"

interface CellActionProps {
    data: ProductColumn
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(false)
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                    {session?.user?.canEdit && (
                        <DropdownMenuItem onClick={() => router.push(`/products/${data.id}`)}>
                            <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                    )}

                    {session?.user?.canDelete && (
                        <DropdownMenuItem
                            onClick={onConfirm}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                            <Trash className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
