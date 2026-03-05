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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface UsageChartsProps {
    data: TenantColumn[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-medium mb-2 pb-2 border-b">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}:</span>
                        </div>
                        <span className="font-mono font-medium">
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

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];

    if (data.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
            {/* Top Revenue Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Top 10 Espaces par Revenus</CardTitle>
                    <CardDescription>Chiffre d'affaires total généré (DZD)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={sortedByRevenue}
                                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted opacity-50" />
                                <XAxis
                                    dataKey="name"
                                    className="text-xs fill-muted-foreground"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis
                                    className="text-xs fill-muted-foreground"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Bar
                                    dataKey="Revenus (DA)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={32}
                                >
                                    {sortedByRevenue.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Resource Usage Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consommation des Ressources</CardTitle>
                    <CardDescription>Commandes vs Produits vs Utilisateurs (Top 10)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={sortedByUsage}
                                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted opacity-50" />
                                <XAxis
                                    dataKey="name"
                                    className="text-xs fill-muted-foreground"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis
                                    className="text-xs fill-muted-foreground"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="Commandes" fill="#10b98120" stroke="#10b981" strokeWidth={2} />
                                <Bar dataKey="Produits" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="Utilisateurs" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#background', strokeWidth: 2, stroke: '#f59e0b' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
