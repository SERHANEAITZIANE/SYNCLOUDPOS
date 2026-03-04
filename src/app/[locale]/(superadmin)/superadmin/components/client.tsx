"use client"

import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { columns, TenantColumn } from "./columns"
import { Users, Package, CheckCircle2, XCircle, ShieldOff, TrendingUp } from "lucide-react"

interface SuperAdminClientProps {
    data: TenantColumn[]
}

export const SuperAdminClient: React.FC<SuperAdminClientProps> = ({ data }) => {
    const now = new Date()
    const active = data.filter(t => !t.isBlocked && t.subscriptionEndsAt && new Date(t.subscriptionEndsAt) > now).length
    const expired = data.filter(t => !t.isBlocked && (!t.subscriptionEndsAt || new Date(t.subscriptionEndsAt) <= now)).length
    const blocked = data.filter(t => t.isBlocked).length
    const totalRevenue = data.reduce((acc, t) => acc + (t.usageStats?.totalRevenue || 0), 0)

    const stats = [
        {
            label: "Total Espaces",
            value: data.length,
            icon: Users,
            color: "#60a5fa",
            bg: "rgba(96,165,250,0.1)",
            border: "rgba(96,165,250,0.2)",
        },
        {
            label: "Actifs",
            value: active,
            icon: CheckCircle2,
            color: "#34d399",
            bg: "rgba(52,211,153,0.1)",
            border: "rgba(52,211,153,0.2)",
        },
        {
            label: "Expirés",
            value: expired,
            icon: XCircle,
            color: "#fb923c",
            bg: "rgba(251,146,60,0.1)",
            border: "rgba(251,146,60,0.2)",
        },
        {
            label: "Bloqués",
            value: blocked,
            icon: ShieldOff,
            color: "#f87171",
            bg: "rgba(248,113,113,0.1)",
            border: "rgba(248,113,113,0.2)",
        },
        {
            label: "CA Total (DA)",
            value: totalRevenue.toLocaleString("fr-DZ", { maximumFractionDigits: 0 }),
            icon: TrendingUp,
            color: "#a78bfa",
            bg: "rgba(167,139,250,0.1)",
            border: "rgba(167,139,250,0.2)",
        },
    ]

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Superadmin</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gérez tous les espaces abonnés et prolongez les accès.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                    <Package className="w-3 h-3" />
                    {data.length} espaces
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className="rounded-xl p-4 flex flex-col gap-2 transition-all"
                        style={{ background: bg, border: `1px solid ${border}` }}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                    </div>
                ))}
            </div>

            <Separator className="mb-4" />
            <DataTable searchKey="name" columns={columns} data={data} />
        </>
    )
}
