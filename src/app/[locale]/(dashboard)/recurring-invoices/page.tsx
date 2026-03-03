import { getRecurringInvoices } from "@/actions/recurring-invoices"
import { NewRecurringDialog } from "./components/new-recurring-dialog"
import { RecurringListClient } from "./components/recurring-list-client"
import { CalendarClock, Repeat } from "lucide-react"
import { formatter } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Abonnements & BL Récurrents | SynCloudPOS",
    description: "Gérez vos générateurs de bons de livraison automatiques"
}

export default async function RecurringInvoicesPage() {
    const schedules = await getRecurringInvoices()

    const activeCount = schedules.filter(s => s.status === "ACTIVE").length

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-4 md:pt-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Factures Récurrentes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Automatisez la création de vos Bons de Livraison (BL) périodiques.</p>
                </div>
                <NewRecurringDialog />
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border px-6 py-5 bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900">
                    <p className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        <Repeat className="w-4 h-4" />
                        Total Abonnements
                    </p>
                    <p className="text-4xl font-extrabold mt-2 text-indigo-700 dark:text-indigo-300 tabular-nums">{schedules.length}</p>
                </div>

                <div className="rounded-2xl border px-6 py-5 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900">
                    <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <CalendarClock className="w-4 h-4" />
                        Abonnements Actifs
                    </p>
                    <p className="text-4xl font-extrabold mt-2 text-emerald-700 dark:text-emerald-300 tabular-nums">{activeCount}</p>
                </div>
            </div>

            {/* Main List */}
            {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
                        <Repeat className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Aucun abonnement configuré</h3>
                    <p className="text-slate-500 text-center max-w-sm text-sm">Créez votre première facture récurrente pour automatiser la facturation loto, abonnement internet, etc.</p>
                </div>
            ) : (
                <RecurringListClient schedules={schedules} />
            )}
        </div>
    )
}
