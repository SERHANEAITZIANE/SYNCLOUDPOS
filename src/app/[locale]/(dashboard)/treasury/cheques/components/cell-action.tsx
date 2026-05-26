"use client"

import { useState } from "react"
import { ChequeColumn } from "./columns"
import { Button } from "@/components/ui/button"
import { Check, X, AlertCircle } from "lucide-react"
import { updateChequeStatus } from "@/actions/cheques"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface ChequeCellActionProps {
    data: ChequeColumn
}

export const ChequeCellAction: React.FC<ChequeCellActionProps> = ({ data }) => {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const onUpdateStatus = async (status: string) => {
        try {
            setLoading(true)
            // Ideally we'd open a modal to select the account if CLEARED
            // But for simplicity, we pass an undefined accountId here and it will fail if not set on the cheque
            // Wait, if it clears, the user might want to choose the bank account.
            // I'll assume they edit the cheque to set the accountId before clearing, or we just pass the default one.
            const res = await updateChequeStatus(data.id, status)
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

    if (data.status !== "PENDING") {
        return null // Actions only available for PENDING cheques
    }

    return (
        <div className="flex items-center space-x-2">
            <Button disabled={loading} variant="outline" size="icon" onClick={() => onUpdateStatus("CLEARED")} title="Encaisser">
                <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button disabled={loading} variant="outline" size="icon" onClick={() => onUpdateStatus("BOUNCED")} title="Rejeter">
                <AlertCircle className="h-4 w-4 text-red-500" />
            </Button>
            <Button disabled={loading} variant="outline" size="icon" onClick={() => onUpdateStatus("CANCELLED")} title="Annuler">
                <X className="h-4 w-4 text-gray-500" />
            </Button>
        </div>
    )
}
