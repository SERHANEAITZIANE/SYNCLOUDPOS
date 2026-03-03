"use client"

import { useState, useTransition, useEffect } from "react"
import toast from "react-hot-toast"
import { toggleRecurringInvoiceStatus } from "@/actions/recurring-invoices"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarClock, CheckCircle, XCircle } from "lucide-react"

export function RecurringListClient({ schedules }: { schedules: any[] }) {
    const [isPending, startTransition] = useTransition()
    // Optimistic UI state
    const [localSchedules, setSchedules] = useState(schedules)

    // Sync if props change
    useEffect(() => {
        setSchedules(schedules)
    }, [schedules])

    const handleToggle = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE"

        // Optimistic update
        setSchedules(prev => prev.map(s =>
            s.id === id ? { ...s, status: newStatus } : s
        ))

        startTransition(async () => {
            const res = await toggleRecurringInvoiceStatus(id)
            if (res.error) {
                toast.error(res.error)
                // Revert on failure
                setSchedules(schedules)
            } else {
                toast.success(`Abonnement ${newStatus === "ACTIVE" ? "activé" : "en pause"}`)
            }
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD" }).format(amount)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {localSchedules.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                                {s.status === "ACTIVE" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{s.customer.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-xs font-semibold">
                                        {s.frequency === "MONTHLY" ? "Mensuel" : s.frequency === "WEEKLY" ? "Hebdo" : "Annuel"}
                                    </Badge>
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{formatCurrency(s.total)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 mr-2">{s.status === "ACTIVE" ? "Actif" : "En pause"}</span>
                            <Switch
                                checked={s.status === "ACTIVE"}
                                onCheckedChange={() => handleToggle(s.id, s.status)}
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <CalendarClock className="w-4 h-4 text-slate-400" />
                            <span>Prochain BL: <strong className="text-slate-700 dark:text-slate-300">{format(new Date(s.nextRunDate), "dd MMM yyyy", { locale: fr })}</strong></span>
                        </div>
                        <div>
                            <span>{s._count.generatedOrders} factures générées</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
