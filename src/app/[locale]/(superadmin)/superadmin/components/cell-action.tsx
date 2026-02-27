"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, ShieldCheck, Clock } from "lucide-react"
import { toast } from "react-hot-toast"
import { useRouter } from "@/i18n/routing"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { updateTenantSubscription, toggleTenantBlock } from "@/actions/superadmin"

interface TenantColumn {
    id: string;
    name: string;
    phone: string | null;
    subscriptionEndsAt: Date | null;
    isBlocked: boolean;
    ownerDetails: { name: string | null, email: string, phone: string | null } | null;
}

interface CellActionProps {
    data: TenantColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const onExtend = async (months: number) => {
        try {
            setLoading(true)
            const result = await updateTenantSubscription(data.id, months)
            if (result.success) {
                toast.success(result.success)
                router.refresh()
            } else {
                toast.error(result.error || "Une erreur s'est produite")
            }
        } catch (error) {
            toast.error("Erreur système")
        } finally {
            setLoading(false)
        }
    }

    const onToggleBlock = async () => {
        try {
            setLoading(true)
            const result = await toggleTenantBlock(data.id, !data.isBlocked)
            if (result.success) {
                toast.success(result.success)
                router.refresh()
            } else {
                toast.error(result.error || "Une erreur s'est produite")
            }
        } catch (error) {
            toast.error("Erreur système")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem disabled={loading} onClick={() => onExtend(1)}>
                        <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                        Prolonger 1 Mois
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={loading} onClick={() => onExtend(6)}>
                        <Clock className="mr-2 h-4 w-4 text-emerald-500" />
                        Prolonger 6 Mois
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={loading} onClick={() => onExtend(12)}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                        Prolonger 1 An
                    </DropdownMenuItem>
                    <div className="h-px bg-slate-200 my-1" />
                    <DropdownMenuItem disabled={loading} onClick={onToggleBlock}>
                        <ShieldCheck className={`mr-2 h-4 w-4 ${data.isBlocked ? 'text-emerald-500' : 'text-red-500'}`} />
                        {data.isBlocked ? "Débloquer l'Espace" : "Bloquer l'Espace"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
