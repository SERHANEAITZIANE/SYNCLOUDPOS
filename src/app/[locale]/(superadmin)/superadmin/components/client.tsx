"use client"

import { useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, TenantColumn } from "./columns"
import { Users, Package, CheckCircle2, XCircle, ShieldOff, TrendingUp, Search, Filter } from "lucide-react"
import { UsageCharts } from "./usage-charts"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SuperAdminClientProps {
    data: TenantColumn[]
}

export const SuperAdminClient: React.FC<SuperAdminClientProps> = ({ data }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")

    const now = new Date()

    // Filter logic
    const filteredData = data.filter(tenant => {
        // 1. Text Search Filter (Name, Phone, Email)
        const query = searchQuery.toLowerCase()
        const matchesSearch =
            tenant.name.toLowerCase().includes(query) ||
            (tenant.phone && tenant.phone.toLowerCase().includes(query)) ||
            (tenant.ownerDetails?.email && tenant.ownerDetails.email.toLowerCase().includes(query)) ||
            (tenant.ownerDetails?.name && tenant.ownerDetails.name.toLowerCase().includes(query))

        if (!matchesSearch) return false

        // 2. Status Filter
        const isActive = !tenant.isBlocked && tenant.subscriptionEndsAt && new Date(tenant.subscriptionEndsAt) > now
        const isExpired = !tenant.isBlocked && (!tenant.subscriptionEndsAt || new Date(tenant.subscriptionEndsAt) <= now)
        const isBlocked = tenant.isBlocked

        if (statusFilter === "active" && !isActive) return false
        if (statusFilter === "expired" && !isExpired) return false
        if (statusFilter === "blocked" && !isBlocked) return false

        return true
    })

    // Stats calculations (always show overall stats, not filtered stats)
    const active = data.filter(t => !t.isBlocked && t.subscriptionEndsAt && new Date(t.subscriptionEndsAt) > now).length
    const expired = data.filter(t => !t.isBlocked && (!t.subscriptionEndsAt || new Date(t.subscriptionEndsAt) <= now)).length
    const blocked = data.filter(t => t.isBlocked).length
    const totalRevenue = data.reduce((acc, t) => acc + (t.usageStats?.totalRevenue || 0), 0)

    const stats = [
        {
            label: "Espaces Totaux",
            value: data.length,
            icon: Users,
            color: "#60a5fa", // blue
            gradient: "from-blue-500/10 to-blue-500/20",
            border: "border-blue-500/20",
            shadow: "shadow-blue-500/10"
        },
        {
            label: "Actifs",
            value: active,
            icon: CheckCircle2,
            color: "#34d399", // emerald
            gradient: "from-emerald-500/10 to-emerald-500/20",
            border: "border-emerald-500/20",
            shadow: "shadow-emerald-500/10"
        },
        {
            label: "Expirés",
            value: expired,
            icon: XCircle,
            color: "#fb923c", // orange
            gradient: "from-orange-500/10 to-orange-500/20",
            border: "border-orange-500/20",
            shadow: "shadow-orange-500/10"
        },
        {
            label: "Bloqués",
            value: blocked,
            icon: ShieldOff,
            color: "#f87171", // red
            gradient: "from-red-500/10 to-red-500/20",
            border: "border-red-500/20",
            shadow: "shadow-red-500/10"
        },
        {
            label: "CA Global (DA)",
            value: totalRevenue.toLocaleString("fr-DZ", { maximumFractionDigits: 0 }),
            icon: TrendingUp,
            color: "#a78bfa", // violet
            gradient: "from-violet-500/10 to-violet-500/20",
            border: "border-violet-500/20",
            shadow: "shadow-violet-500/10"
        },
    ]

    return (
        <div className="space-y-8 pb-10">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Superadmin Dashboard
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Surveillance en temps réel, gestion des licences et utilisation des ressources.
                    </p>
                </div>
                <div className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium whitespace-nowrap">
                    <Package className="w-4 h-4" />
                    {data.length} Espaces Cloud
                </div>
            </div>

            {/* Glowing Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {stats.map(({ label, value, icon: Icon, color, gradient, border, shadow }) => (
                    <div
                        key={label}
                        className={`relative overflow-hidden rounded-2xl p-5 border bg-gradient-to-br ${gradient} ${border} shadow-lg ${shadow} backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]`}
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-sm font-medium text-slate-300">{label}</span>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                                <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold mt-4 relative z-10" style={{ color }}>{value}</p>
                    </div>
                ))}
            </div >

            {/* Interactive Charts */}
            < UsageCharts data={filteredData} />

            {/* Advanced Filtering & Data Table */}
            < div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl" >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-indigo-400" />
                        Annuaire des Espaces
                    </h2>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Recherche nom, email, tél..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-900/50 border-slate-700/50 focus:border-indigo-500/50 text-slate-200"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-slate-900/50 border-slate-700/50 text-slate-200">
                                <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800">
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="active">Actifs</SelectItem>
                                <SelectItem value="expired">Expirés</SelectItem>
                                <SelectItem value="blocked">Bloqués</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DataTable
                    searchKey="name"
                    columns={columns}
                    data={filteredData}
                />
            </div >
        </div >
    )
}

