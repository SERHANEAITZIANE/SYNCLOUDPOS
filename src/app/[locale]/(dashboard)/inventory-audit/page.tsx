import { getStockCountSessions } from "@/actions/inventory-audit"
import { NewSessionButton } from "@/app/[locale]/(dashboard)/inventory-audit/components/new-session-button"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, CheckCircle, XCircle, Clock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Audit d'Inventaire | SynCloudPOS",
    description: "Inventaire physique et ajustement de stock"
}

const statusConfig = {
    OPEN: { label: "En cours", icon: Clock, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    APPROVED: { label: "Approuvé", icon: CheckCircle, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
    CANCELLED: { label: "Annulé", icon: XCircle, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
}

export default async function InventoryAuditPage() {
    const sessions = await getStockCountSessions()

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-4 md:pt-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit d&apos;Inventaire</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Comptez votre stock physique et appliquez les ajustements.</p>
                </div>
                <NewSessionButton />
            </div>

            {/* Sessions list */}
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
                        <ClipboardList className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Aucune session d&apos;inventaire</h3>
                    <p className="text-slate-500 text-center max-w-sm text-sm">Créez votre première session pour commencer le comptage physique de votre stock.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(s => {
                        const cfg = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.OPEN
                        const Icon = cfg.icon
                        return (
                            <Link key={s.id} href={`/inventory-audit/${s.id}`}>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                                                <p className="text-sm text-slate-500 mt-0.5">
                                                    {format(new Date(s.createdAt), "dd MMM yyyy • HH:mm", { locale: fr })} · {s._count.items} produits
                                                </p>
                                            </div>
                                        </div>
                                        <Badge className={`border-0 font-semibold gap-1.5 ${cfg.color}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                            {cfg.label}
                                        </Badge>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
