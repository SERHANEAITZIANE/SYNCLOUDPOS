"use client"

import { useState } from "react"
import { TransferColumn } from "./columns"
import { Button } from "@/components/ui/button"
import { Check, X, Truck } from "lucide-react"
import { updateTransferStatus } from "@/actions/transfers"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface TransferCellActionProps {
    data: TransferColumn
}

export const TransferCellAction: React.FC<TransferCellActionProps> = ({ data }) => {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const onUpdateStatus = async (status: string) => {
        try {
            setLoading(true)
            const res = await updateTransferStatus(data.id, status)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Statut mis à jour")
                router.refresh()
            }
        } catch (error) {
            toast.error("Erreur inattendue")
        } finally {
            setLoading(false)
        }
    }

    if (data.status === "COMPLETED" || data.status === "CANCELLED") {
        return null 
    }

    return (
        <div className="flex items-center space-x-2">
            {data.status === "PENDING" && (
                <>
                    <Button disabled={loading} variant="outline" size="icon" onClick={() => onUpdateStatus("SENT")} title="Marquer comme Expédié">
                        <Truck className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button disabled={loading} variant="outline" size="icon" onClick={() => onUpdateStatus("CANCELLED")} title="Annuler">
                        <X className="h-4 w-4 text-red-500" />
                    </Button>
                </>
            )}
            {data.status === "SENT" && (
                <Button disabled={loading} variant="outline" size="icon" onClick={() => onUpdateStatus("COMPLETED")} title="Marquer comme Reçu">
                    <Check className="h-4 w-4 text-green-500" />
                </Button>
            )}
        </div>
    )
}
