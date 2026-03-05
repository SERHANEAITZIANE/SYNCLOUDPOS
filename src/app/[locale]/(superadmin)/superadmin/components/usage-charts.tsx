"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
    ComposedChart,
    Line,
    Area
} from "recharts"
import { TenantColumn } from "./columns"

interface UsageChartsProps {
    data: TenantColumn[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl">
                <p className="font-semibold text-slate-100 mb-2 pb-2 border-b border-slate-700/50">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-slate-300">{entry.name}:</span>
                        </div>
                        <span className="font-mono font-medium text-slate-100">
                            {entry.name === "Revenus (DA)"
                                ? entry.value.toLocaleString('fr-DZ')
                                : entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const UsageCharts: React.FC<UsageChartsProps> = ({ data }) => {
    // Sort data by revenue for the primary chart (top 10)
    const sortedByRevenue = [...data]
        .sort((a, b) => (b.usageStats?.totalRevenue || 0) - (a.usageStats?.totalRevenue || 0))
        .slice(0, 10)
        .map(t => ({
            name: t.name,
            'Revenus (DA)': t.usageStats?.totalRevenue || 0,
        }));

    // Sort data by overall resource usage (orders + products + users)
    const sortedByUsage = [...data]
        .sort((a, b) => {
            const usageA = (a.usageStats?.orders || 0) + (a.usageStats?.products || 0) + (a.usageStats?.users || 0);
            const usageB = (b.usageStats?.orders || 0) + (b.usageStats?.products || 0) + (b.usageStats?.users || 0);
            return usageB - usageA;
        })
        .slice(0, 10)
        .map(t => ({
            name: t.name,
            'Commandes': t.usageStats?.orders || 0,
            'Produits': t.usageStats?.products || 0,
            'Utilisateurs': t.usageStats?.users || 0,
        }));

    const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];

    if (data.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Revenue Chart */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    Top 10 Espaces par Revenus
                </h3>
                <p className="text-sm text-slate-400 mb-6">Chiffre d'affaires total généré (DZD)</p>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedByRevenue}
                            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar
                                dataKey="Revenus (DA)"
                                fill="url(#colorRevenue)"
                                radius={[6, 6, 0, 0]}
                                barSize={32}
                            >
                                {sortedByRevenue.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Resource Usage Chart */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Consommation des Ressources (Top 10)
                </h3>
                <p className="text-sm text-slate-400 mb-6">Commandes vs Produits vs Utilisateurs</p>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={sortedByUsage}
                            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            <Area type="monotone" dataKey="Commandes" fill="url(#colorOrders)" stroke="#10b981" strokeWidth={2} />
                            <Bar dataKey="Produits" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="Utilisateurs" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#1e293b' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
