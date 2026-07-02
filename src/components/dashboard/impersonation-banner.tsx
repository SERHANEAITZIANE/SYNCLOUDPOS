"use client"

import { useTransition } from "react"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { stopImpersonation } from "@/actions/superadmin"

interface ImpersonationBannerProps {
    tenantName: string
}

export const ImpersonationBanner = ({ tenantName }: ImpersonationBannerProps) => {
    const [isPending, startTransition] = useTransition()

    const onStop = () => {
        startTransition(async () => {
            toast.loading("Retour à l'espace superadmin...", { id: "stop-impersonate" })
            const result = await stopImpersonation()
            if (result.success) {
                toast.success("Retour réussi !", { id: "stop-impersonate" })
                window.location.href = "/superadmin"
            } else {
                toast.error(result.error || "Erreur", { id: "stop-impersonate" })
            }
        })
    }

    return (
        <div className="bg-amber-500 text-black py-2.5 px-4 flex items-center justify-between text-sm font-medium z-[99999] shadow-sm select-none border-b border-amber-600">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 animate-pulse text-amber-950" />
                <span>
                    Mode Impersonation : Vous naviguez en tant que <strong>{tenantName}</strong>.
                </span>
            </div>
            <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onStop}
                className="bg-black/90 hover:bg-black/80 text-amber-500 hover:text-amber-400 border-none h-7 px-3 text-xs"
            >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Quitter l'Espace
            </Button>
        </div>
    )
}
