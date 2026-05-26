import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

const { width } = Dimensions.get("window");
const BAR_MAX_WIDTH = width - 120;

type Period = "today" | "week" | "month";

interface SalesData {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    comparisonPct: number;
    dailyTrend: { label: string; value: number }[];
    topProducts: { name: string; revenue: number; qty: number }[];
    topClients: { name: string; revenue: number }[];
    categoryBreakdown: { name: string; revenue: number; pct: number }[];
}

const MOCK_DATA: Record<Period, SalesData> = {
    today: {
        totalRevenue: 185000,
        totalOrders: 24,
        avgOrderValue: 7708,
        comparisonPct: 12.5,
        dailyTrend: [
            { label: "8h", value: 15000 }, { label: "9h", value: 28000 },
            { label: "10h", value: 42000 }, { label: "11h", value: 35000 },
            { label: "12h", value: 18000 }, { label: "14h", value: 22000 },
            { label: "15h", value: 25000 },
        ],
        topProducts: [
            { name: "Coca-Cola Canette 33cl", revenue: 32400, qty: 540 },
            { name: "Eau Lalla Khedidja 1.5L", revenue: 24000, qty: 800 },
            { name: "Jus Ramy Orange 1L", revenue: 18900, qty: 210 },
            { name: "Café Prestige 250g", revenue: 15600, qty: 120 },
            { name: "Lait Soummam 1L", revenue: 12800, qty: 320 },
        ],
        topClients: [
            { name: "Supérette Horizon", revenue: 42000 },
            { name: "Alimentation El Hanaa", revenue: 28000 },
            { name: "Café du Centre", revenue: 22000 },
            { name: "Mini Market Étoile", revenue: 18500 },
        ],
        categoryBreakdown: [
            { name: "Boissons", revenue: 75300, pct: 41 },
            { name: "Produits Laitiers", revenue: 38000, pct: 21 },
            { name: "Épicerie Sèche", revenue: 32200, pct: 17 },
            { name: "Biscuits & Snacks", revenue: 22000, pct: 12 },
            { name: "Hygiène", revenue: 17500, pct: 9 },
        ],
    },
    week: {
        totalRevenue: 1240000,
        totalOrders: 168,
        avgOrderValue: 7381,
        comparisonPct: 8.3,
        dailyTrend: [
            { label: "Lun", value: 195000 }, { label: "Mar", value: 220000 },
            { label: "Mer", value: 175000 }, { label: "Jeu", value: 210000 },
            { label: "Ven", value: 145000 }, { label: "Sam", value: 110000 },
            { label: "Dim", value: 185000 },
        ],
        topProducts: [
            { name: "Coca-Cola Canette 33cl", revenue: 198000, qty: 3300 },
            { name: "Eau Lalla Khedidja 1.5L", revenue: 156000, qty: 5200 },
            { name: "Jus Ramy Orange 1L", revenue: 124500, qty: 1383 },
            { name: "Café Prestige 250g", revenue: 102000, qty: 785 },
            { name: "Lait Soummam 1L", revenue: 89600, qty: 2240 },
        ],
        topClients: [
            { name: "Supérette Horizon", revenue: 245000 },
            { name: "Alimentation El Hanaa", revenue: 186000 },
            { name: "Café du Centre", revenue: 142000 },
            { name: "Mini Market Étoile", revenue: 118000 },
        ],
        categoryBreakdown: [
            { name: "Boissons", revenue: 478000, pct: 39 },
            { name: "Produits Laitiers", revenue: 272000, pct: 22 },
            { name: "Épicerie Sèche", revenue: 223000, pct: 18 },
            { name: "Biscuits & Snacks", revenue: 143000, pct: 12 },
            { name: "Hygiène", revenue: 124000, pct: 9 },
        ],
    },
    month: {
        totalRevenue: 5320000,
        totalOrders: 712,
        avgOrderValue: 7472,
        comparisonPct: -2.1,
        dailyTrend: [
            { label: "S1", value: 1180000 }, { label: "S2", value: 1420000 },
            { label: "S3", value: 1350000 }, { label: "S4", value: 1370000 },
        ],
        topProducts: [
            { name: "Coca-Cola Canette 33cl", revenue: 842000, qty: 14033 },
            { name: "Eau Lalla Khedidja 1.5L", revenue: 680000, qty: 22667 },
            { name: "Jus Ramy Orange 1L", revenue: 532000, qty: 5911 },
            { name: "Café Prestige 250g", revenue: 445000, qty: 3423 },
            { name: "Lait Soummam 1L", revenue: 384000, qty: 9600 },
        ],
        topClients: [
            { name: "Supérette Horizon", revenue: 980000 },
            { name: "Alimentation El Hanaa", revenue: 742000 },
            { name: "Café du Centre", revenue: 568000 },
            { name: "Mini Market Étoile", revenue: 482000 },
        ],
        categoryBreakdown: [
            { name: "Boissons", revenue: 2074000, pct: 39 },
            { name: "Produits Laitiers", revenue: 1170000, pct: 22 },
            { name: "Épicerie Sèche", revenue: 958000, pct: 18 },
            { name: "Biscuits & Snacks", revenue: 585000, pct: 11 },
            { name: "Hygiène", revenue: 533000, pct: 10 },
        ],
    },
};

export default function SalesAnalyticsScreen() {
    const [period, setPeriod] = useState<Period>("today");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SalesData>(MOCK_DATA.today);

    const switchPeriod = (p: Period) => {
        setLoading(true);
        setPeriod(p);
        setTimeout(() => {
            setData(MOCK_DATA[p]);
            setLoading(false);
        }, 400);
    };

    const maxTrend = Math.max(...data.dailyTrend.map(d => d.value));
    const maxProductRev = Math.max(...data.topProducts.map(p => p.revenue));
    const maxClientRev = Math.max(...data.topClients.map(c => c.revenue));

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Period Selector */}
            <View style={styles.periodBar}>
                {(["today", "week", "month"] as Period[]).map(p => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                        onPress={() => switchPeriod(p)}
                    >
                        <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                            {p === "today" ? "Aujourd'hui" : p === "week" ? "Semaine" : "Mois"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#22c55e" />
                </View>
            ) : (
                <>
                    {/* KPI Summary Cards */}
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
                                <Text style={[
                                    styles.kpiCompareText,
                                    { color: data.comparisonPct >= 0 ? "#22c55e" : "#ef4444" }
                                ]}>
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

                    {/* Revenue Trend Chart */}
                    <Text style={styles.sectionTitle}>TENDANCE DES VENTES</Text>
                    <View style={styles.chartCard}>
                        {data.dailyTrend.map((item, i) => {
                            const barHeight = maxTrend > 0 ? (item.value / maxTrend) * 120 : 0;
                            return (
                                <View key={i} style={styles.barCol}>
                                    <Text style={styles.barValue}>
                                        {item.value >= 1000000
                                            ? `${(item.value / 1000000).toFixed(1)}M`
                                            : `${Math.round(item.value / 1000)}K`}
                                    </Text>
                                    <View style={styles.barTrack}>
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    height: Math.max(barHeight, 6),
                                                    backgroundColor: i === data.dailyTrend.length - 1
                                                        ? "#22c55e"
                                                        : "#3b82f6",
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>{item.label}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Top Products */}
                    <Text style={styles.sectionTitle}>TOP 5 PRODUITS</Text>
                    <View style={styles.listCard}>
                        {data.topProducts.map((prod, i) => (
                            <View key={i} style={styles.listRow}>
                                <View style={styles.listRank}>
                                    <Text style={[
                                        styles.listRankText,
                                        i === 0 && { color: "#f59e0b" },
                                        i === 1 && { color: "#94a3b8" },
                                        i === 2 && { color: "#cd7f32" },
                                    ]}>#{i + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listName} numberOfLines={1}>{prod.name}</Text>
                                    <View style={styles.listBarTrack}>
                                        <View style={[
                                            styles.listBar,
                                            { width: `${(prod.revenue / maxProductRev) * 100}%` }
                                        ]} />
                                    </View>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={styles.listValue}>{fmt(prod.revenue)} DA</Text>
                                    <Text style={styles.listQty}>{fmt(prod.qty)} unités</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Top Clients */}
                    <Text style={styles.sectionTitle}>TOP CLIENTS</Text>
                    <View style={styles.listCard}>
                        {data.topClients.map((client, i) => (
                            <View key={i} style={styles.listRow}>
                                <View style={[styles.clientAvatar, {
                                    backgroundColor: ["#3b82f620", "#22c55e20", "#f59e0b20", "#a855f720"][i] || "#33415520"
                                }]}>
                                    <Ionicons
                                        name="storefront-outline"
                                        size={16}
                                        color={["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"][i] || "#64748b"}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listName} numberOfLines={1}>{client.name}</Text>
                                    <View style={styles.listBarTrack}>
                                        <View style={[
                                            styles.listBar,
                                            {
                                                width: `${(client.revenue / maxClientRev) * 100}%`,
                                                backgroundColor: "#22c55e",
                                            }
                                        ]} />
                                    </View>
                                </View>
                                <Text style={styles.listValue}>{fmt(client.revenue)} DA</Text>
                            </View>
                        ))}
                    </View>

                    {/* Category Breakdown */}
                    <Text style={styles.sectionTitle}>RÉPARTITION PAR CATÉGORIE</Text>
                    <View style={styles.listCard}>
                        {data.categoryBreakdown.map((cat, i) => (
                            <View key={i} style={styles.catRow}>
                                <View style={[styles.catDot, {
                                    backgroundColor: ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"][i]
                                }]} />
                                <Text style={styles.catName}>{cat.name}</Text>
                                <View style={{ flex: 1 }} />
                                <Text style={styles.catPct}>{cat.pct}%</Text>
                                <Text style={styles.catValue}>{fmt(cat.revenue)} DA</Text>
                            </View>
                        ))}

                        {/* Simple visual bar breakdown */}
                        <View style={styles.catBarRow}>
                            {data.categoryBreakdown.map((cat, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.catBarSegment,
                                        {
                                            flex: cat.pct,
                                            backgroundColor: ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"][i],
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    loadingWrap: { paddingVertical: 80, alignItems: "center" },

    // Period selector
    periodBar: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16,
        paddingTop: 16, paddingBottom: 8,
    },
    periodBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        backgroundColor: "#1e293b", alignItems: "center",
        borderWidth: 1, borderColor: "#334155",
    },
    periodBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    periodText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
    periodTextActive: { color: "#fff" },

    // KPIs
    kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 8 },
    kpiCard: {
        flex: 1, backgroundColor: "#1e293b", borderRadius: 16,
        padding: 16, borderLeftWidth: 4,
    },
    kpiLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    kpiValue: { color: "#f8fafc", fontSize: 20, fontWeight: "900", marginTop: 6 },
    kpiCompare: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    kpiCompareText: { fontSize: 11, fontWeight: "700" },
    kpiSub: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 6 },

    // Section
    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 24, marginBottom: 10,
    },

    // Bar chart
    chartCard: {
        flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end",
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, paddingTop: 12, height: 200,
    },
    barCol: { alignItems: "center", flex: 1 },
    barValue: { color: "#94a3b8", fontSize: 9, fontWeight: "700", marginBottom: 4 },
    barTrack: {
        flex: 1, width: 24, justifyContent: "flex-end",
        borderRadius: 6, overflow: "hidden",
    },
    bar: { width: "100%", borderRadius: 6, minHeight: 6 },
    barLabel: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 6 },

    // List card
    listCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, gap: 14,
    },
    listRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
    },
    listRank: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center",
    },
    listRankText: { color: "#64748b", fontSize: 12, fontWeight: "800" },
    listName: { color: "#f8fafc", fontSize: 13, fontWeight: "600" },
    listBarTrack: {
        height: 4, backgroundColor: "#334155", borderRadius: 2,
        marginTop: 6, overflow: "hidden",
    },
    listBar: { height: "100%", backgroundColor: "#3b82f6", borderRadius: 2 },
    listValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
    listQty: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },

    // Client avatar
    clientAvatar: {
        width: 32, height: 32, borderRadius: 10,
        justifyContent: "center", alignItems: "center",
    },

    // Category breakdown
    catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    catDot: { width: 10, height: 10, borderRadius: 3 },
    catName: { color: "#f8fafc", fontSize: 13, fontWeight: "600" },
    catPct: { color: "#94a3b8", fontSize: 12, fontWeight: "700", width: 35, textAlign: "right" },
    catValue: { color: "#64748b", fontSize: 11, fontWeight: "600", width: 90, textAlign: "right" },
    catBarRow: {
        flexDirection: "row", height: 8, borderRadius: 4,
        overflow: "hidden", marginTop: 8,
    },
    catBarSegment: { height: "100%" },
});
