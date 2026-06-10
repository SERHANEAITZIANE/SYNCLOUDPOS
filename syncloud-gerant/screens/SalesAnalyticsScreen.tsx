import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { subDays } from "date-fns";
import DateRangeFilter, { DateRange } from "../components/DateRangeFilter";
import ClientTypeFilter, { ClientType } from "../components/ClientTypeFilter";
import SkeletonLoader from "../components/SkeletonLoader";

type Period = "today" | "week" | "month";

interface AnalyticsData {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    comparisonPct: number;
    prevRevenue: number;
    trend: { label: string; value: number }[];
    topProducts: { name: string; revenue: number; qty: number }[];
    topClients: { name: string; revenue: number; orders: number }[];
}

export default function SalesAnalyticsScreen() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 29),
        to: new Date(),
        key: "30days",
    });
    const [clientType, setClientType] = useState<ClientType>("");

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const fetchAnalytics = useCallback(async () => {
        try {
            const fromStr = dateRange.from.toISOString().split("T")[0];
            const toStr = dateRange.to.toISOString().split("T")[0];
            const path = `/gerant/analytics?from=${fromStr}&to=${toStr}${clientType ? `&clientType=${clientType}` : ""}`;
            const result: AnalyticsData = await apiFetch(path);
            setData(result);
        } catch (e) {
            console.error("[SalesAnalytics]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateRange, clientType]);

    useEffect(() => {
        setLoading(true);
        fetchAnalytics();
    }, [dateRange, clientType, fetchAnalytics]);

    const isSingleDay = dateRange.from.toDateString() === dateRange.to.toDateString() ||
                        (dateRange.to.getTime() - dateRange.from.getTime() <= 1000 * 60 * 60 * 24);
    const maxTrend = data ? Math.max(...data.trend.map(d => d.value), 1) : 1;
    const maxProduct = data ? Math.max(...data.topProducts.map(p => p.revenue), 1) : 1;
    const maxClient = data ? Math.max(...data.topClients.map(c => c.revenue), 1) : 1;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} tintColor="#22c55e" />
            }
        >
            <View style={{ paddingTop: 16 }}>
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <ClientTypeFilter value={clientType} onChange={setClientType} />
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1 }}>
                    <SkeletonLoader type="list" rows={5} />
                </View>
            ) : data ? (
                <>
                    {/* KPI Cards */}
                    <View style={styles.kpiRow}>
                        <View style={[styles.kpiCard, { borderLeftColor: "#3b82f6" }]}>
                            <Text style={styles.kpiLabel}>Chiffre d'Affaires</Text>
                            <Text style={styles.kpiValue}>{fmt(data.totalRevenue)} DA</Text>
                            <View style={styles.kpiCompare}>
                                <Ionicons
                                    name={data.comparisonPct >= 0 ? "arrow-up" : "arrow-down"}
                                    size={12}
                                    color={data.comparisonPct >= 0 ? "#22c55e" : "#ef4444"}
                                />
                                <Text style={[styles.kpiCompareText, { color: data.comparisonPct >= 0 ? "#22c55e" : "#ef4444" }]}>
                                    {Math.abs(data.comparisonPct)}% vs. précédent
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.kpiCard, { borderLeftColor: "#22c55e" }]}>
                            <Text style={styles.kpiLabel}>Commandes</Text>
                            <Text style={styles.kpiValue}>{data.totalOrders}</Text>
                            <Text style={styles.kpiSub}>Moy. {fmt(data.avgOrderValue)} DA</Text>
                        </View>
                    </View>

                    {/* Trend Chart */}
                    <Text style={styles.sectionTitle}>
                        {isSingleDay ? "VENTES PAR HEURE" : "VENTES PAR PÉRIODE"}
                    </Text>
                    <View style={styles.chartCard}>
                        {data.trend.length === 0 ? (
                            <Text style={{ color: "#64748b", alignSelf: "center" }}>Aucune vente sur cette période</Text>
                        ) : (
                            data.trend.map((item, i) => {
                                const barHeight = maxTrend > 0 ? (item.value / maxTrend) * 120 : 0;
                                const isLast = i === data.trend.length - 1;
                                return (
                                    <View key={i} style={styles.barCol}>
                                        <Text style={styles.barValue}>
                                            {item.value >= 1000000
                                                ? `${(item.value / 1000000).toFixed(1)}M`
                                                : `${Math.round(item.value / 1000)}K`}
                                        </Text>
                                        <View style={styles.barTrack}>
                                            <View style={[styles.bar, { height: Math.max(barHeight, 4), backgroundColor: isLast ? "#22c55e" : "#3b82f6" }]} />
                                        </View>
                                        <Text style={styles.barLabel}>{item.label}</Text>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* Top Products */}
                    <Text style={styles.sectionTitle}>TOP PRODUITS ({data.topProducts.length})</Text>
                    <View style={styles.listCard}>
                        {data.topProducts.length === 0
                            ? <Text style={styles.emptyText}>Aucune donnée produit</Text>
                            : data.topProducts.map((prod, i) => (
                                <View key={i} style={[styles.listRow, i < data.topProducts.length - 1 && styles.divider]}>
                                    <View style={styles.listRank}>
                                        <Text style={[styles.listRankText, i === 0 && { color: "#f59e0b" }, i === 1 && { color: "#94a3b8" }, i === 2 && { color: "#cd7f32" }]}>
                                            #{i + 1}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.listName} numberOfLines={1}>{prod.name}</Text>
                                        <View style={styles.listBarTrack}>
                                            <View style={[styles.listBar, { width: `${(prod.revenue / maxProduct) * 100}%` }]} />
                                        </View>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.listValue}>{fmt(prod.revenue)} DA</Text>
                                        <Text style={styles.listQty}>{fmt(prod.qty)} u.</Text>
                                    </View>
                                </View>
                            ))
                        }
                    </View>

                    {/* Top Clients */}
                    <Text style={styles.sectionTitle}>TOP CLIENTS ({data.topClients.length})</Text>
                    <View style={styles.listCard}>
                        {data.topClients.length === 0
                            ? <Text style={styles.emptyText}>Aucun client sur cette période</Text>
                            : data.topClients.map((client, i) => (
                                <View key={i} style={[styles.listRow, i < data.topClients.length - 1 && styles.divider]}>
                                    <View style={[styles.clientAvatar, { backgroundColor: ["#3b82f620", "#22c55e20", "#f59e0b20", "#a855f720"][i] || "#33415520" }]}>
                                        <Ionicons name="storefront-outline" size={16} color={["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"][i] || "#64748b"} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.listName} numberOfLines={1}>{client.name}</Text>
                                        <View style={styles.listBarTrack}>
                                            <View style={[styles.listBar, { width: `${(client.revenue / maxClient) * 100}%`, backgroundColor: "#22c55e" }]} />
                                        </View>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.listValue}>{fmt(client.revenue)} DA</Text>
                                        <Text style={styles.listQty}>{client.orders} cmd.</Text>
                                    </View>
                                </View>
                            ))
                        }
                    </View>
                </>
            ) : (
                <View style={styles.loadingWrap}>
                    <Text style={{ color: "#64748b" }}>Impossible de charger les données</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    loadingWrap: { paddingVertical: 80, alignItems: "center" },
    emptyText: { color: "#64748b", fontSize: 13, textAlign: "center", paddingVertical: 8 },
    divider: { borderBottomWidth: 1, borderBottomColor: "#33415540" },

    periodBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#1e293b", alignItems: "center", borderWidth: 1, borderColor: "#334155" },
    periodBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    periodText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
    periodTextActive: { color: "#fff" },

    kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 8 },
    kpiCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 16, borderLeftWidth: 4 },
    kpiLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    kpiValue: { color: "#f8fafc", fontSize: 20, fontWeight: "900", marginTop: 6 },
    kpiCompare: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    kpiCompareText: { fontSize: 11, fontWeight: "700" },
    kpiSub: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 6 },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 24, marginBottom: 10 },

    chartCard: {
        flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end",
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, paddingTop: 12, height: 200,
    },
    barCol: { alignItems: "center", flex: 1 },
    barValue: { color: "#94a3b8", fontSize: 8, fontWeight: "700", marginBottom: 4 },
    barTrack: { flex: 1, width: 20, justifyContent: "flex-end", borderRadius: 6, overflow: "hidden" },
    bar: { width: "100%", borderRadius: 6, minHeight: 4 },
    barLabel: { color: "#64748b", fontSize: 9, fontWeight: "600", marginTop: 6 },

    listCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 0 },
    listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
    listRank: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#0a0f1e", justifyContent: "center", alignItems: "center" },
    listRankText: { color: "#64748b", fontSize: 12, fontWeight: "800" },
    listName: { color: "#f8fafc", fontSize: 13, fontWeight: "600" },
    listBarTrack: { height: 4, backgroundColor: "#334155", borderRadius: 2, marginTop: 6, overflow: "hidden" },
    listBar: { height: "100%", backgroundColor: "#3b82f6", borderRadius: 2 },
    listValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
    listQty: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },
    clientAvatar: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
});
