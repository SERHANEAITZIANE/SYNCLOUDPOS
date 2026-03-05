"use client"

import { useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, TenantColumn } from "./columns"
import { Users, Package, CheckCircle2, XCircle, ShieldOff, TrendingUp, Search, Filter } from "lucide-react"
import { UsageCharts } from "./usage-charts"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
            color: "text-blue-500",
            bgColor: "bg-blue-500/10"
        },
        {
            label: "Actifs",
            value: active,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10"
        },
        {
            label: "Expirés",
            value: expired,
            icon: XCircle,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10"
        },
        {
            label: "Bloqués",
            value: blocked,
            icon: ShieldOff,
            color: "text-red-500",
            bgColor: "bg-red-500/10"
        },
        {
            label: "CA Global (DA)",
            value: totalRevenue.toLocaleString("fr-DZ", { maximumFractionDigits: 0 }),
            icon: TrendingUp,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10"
        },
    ]

    return (
        <div className="flex flex-col gap-6 w-full pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Espace Superadmin</h1>
                    <p className="text-muted-foreground mt-1">
                        Surveillance en temps réel, gestion des abonnements et analytique.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm">
                    <Package className="w-4 h-4" />
                    {data.length} Espaces
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {stats.map(({ label, value, icon: Icon, color, bgColor }) => (
                    <Card key={label}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                            <div className={`p-2 rounded-md ${bgColor}`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Interactive Charts */}
            < UsageCharts data={filteredData} />

            {/* Advanced Filtering & Data Table */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-xl">Annuaire des Espaces</CardTitle>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Recherche nom, email, tél..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="active">Actifs</SelectItem>
                                <SelectItem value="expired">Expirés</SelectItem>
                                <SelectItem value="blocked">Bloqués</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        searchKey="name"
                        columns={columns}
                        data={filteredData}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
