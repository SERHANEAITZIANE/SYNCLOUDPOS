import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { subDays } from "date-fns";
import DateRangeFilter, { DateRange } from "../components/DateRangeFilter";
import ClientTypeFilter, { ClientType } from "../components/ClientTypeFilter";
import SkeletonLoader from "../components/SkeletonLoader";

const { width } = Dimensions.get("window");

type SortKey = "margin_pct" | "margin_da" | "revenue";

interface ProfitItem {
    name: string;
    revenue: number;
    cost: number;
    marginDA: number;
    marginPct: number;
    qtySold: number;
}

interface CategoryProfit {
    name: string;
    revenue: number;
    cost: number;
    marginDA: number;
    marginPct: number;
}



export default function ProfitReportScreen() {
    const [tab, setTab] = useState<"products" | "categories">("products");
    const [sortKey, setSortKey] = useState<SortKey>("margin_da");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 29),
        to: new Date(),
        key: "30days",
    });
    const [clientType, setClientType] = useState<ClientType>("");

    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalCost, setTotalCost] = useState(0);
    const [totalMarginDA, setTotalMarginDA] = useState(0);
    const [totalMarginPct, setTotalMarginPct] = useState(0);
    const [productsList, setProductsList] = useState<ProfitItem[]>([]);
    const [categoriesList, setCategoriesList] = useState<CategoryProfit[]>([]);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const fetchProfitData = useCallback(async () => {
        try {
            const fromStr = dateRange.from.toISOString().split("T")[0];
            const toStr = dateRange.to.toISOString().split("T")[0];
            const path = `/gerant/profit?from=${fromStr}&to=${toStr}${clientType ? `&clientType=${clientType}` : ""}`;
            const data = await apiFetch(path);
            if (data) {
                setTotalRevenue(data.totalRevenue || 0);
                setTotalCost(data.totalCost || 0);
                setTotalMarginDA(data.totalMarginDA || 0);
                setTotalMarginPct(data.totalMarginPct || 0);
                setProductsList(data.products || []);
                setCategoriesList(data.categories || []);
            } else {
                useFallbackData();
            }
        } catch (e) {
            console.error("[ProfitReportScreen] Error fetching margins:", e);
            useFallbackData();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const useFallbackData = () => {
        setTotalRevenue(0);
        setTotalCost(0);
        setTotalMarginDA(0);
        setTotalMarginPct(0);
        setProductsList([]);
        setCategoriesList([]);
    };

    useEffect(() => {
        setLoading(true);
        fetchProfitData();
    }, [dateRange, clientType, fetchProfitData]);

    const sortedProducts = [...productsList].sort((a, b) => {
        if (sortKey === "margin_pct") return b.marginPct - a.marginPct;
        if (sortKey === "margin_da") return b.marginDA - a.marginDA;
        return b.revenue - a.revenue;
    });

    const sortedCategories = [...categoriesList].sort((a, b) => b.marginDA - a.marginDA);

    const getMarginColor = (pct: number) => {
        if (pct >= 25) return "#22c55e";
        if (pct >= 15) return "#f59e0b";
        return "#ef4444";
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: "#0a0f1e" }}>
                <View style={{ paddingTop: 16 }}>
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                    <ClientTypeFilter value={clientType} onChange={setClientType} />
                </View>
                <SkeletonLoader type="list" rows={6} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfitData(); }} tintColor="#22c55e" />
            }
        >
            <View style={{ paddingTop: 16 }}>
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <ClientTypeFilter value={clientType} onChange={setClientType} />
            </View>
            {/* Summary KPIs */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Ionicons name="pie-chart" size={20} color="#22c55e" />
                    <Text style={styles.summaryTitle}>Résumé Marges — Mois en cours</Text>
                </View>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Revenus</Text>
                        <Text style={styles.summaryValue}>{fmt(totalRevenue)} DA</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Coûts</Text>
                        <Text style={[styles.summaryValue, { color: "#ef4444" }]}>{fmt(totalCost)} DA</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Marge Brute</Text>
                        <Text style={[styles.summaryValue, { color: "#22c55e" }]}>{fmt(totalMarginDA)} DA</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Taux de Marge</Text>
                        <Text style={[styles.summaryValue, { color: getMarginColor(totalMarginPct) }]}>
                            {totalMarginPct.toFixed(1)}%
                        </Text>
                    </View>
                </View>

                {/* Margin gauge */}
                <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeFill, { width: `${Math.min(totalMarginPct, 100)}%`, backgroundColor: getMarginColor(totalMarginPct) }]} />
                </View>
                <View style={styles.gaugeLabels}>
                    <Text style={[styles.gaugeLabel, { color: "#ef4444" }]}>0%</Text>
                    <Text style={[styles.gaugeLabel, { color: "#f59e0b" }]}>15%</Text>
                    <Text style={[styles.gaugeLabel, { color: "#22c55e" }]}>25%+</Text>
                </View>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === "products" && styles.tabBtnActive]}
                    onPress={() => setTab("products")}
                >
                    <Ionicons name="cube-outline" size={16} color={tab === "products" ? "#fff" : "#94a3b8"} />
                    <Text style={[styles.tabText, tab === "products" && styles.tabTextActive]}>Par Produit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === "categories" && styles.tabBtnActive]}
                    onPress={() => setTab("categories")}
                >
                    <Ionicons name="layers-outline" size={16} color={tab === "categories" ? "#fff" : "#94a3b8"} />
                    <Text style={[styles.tabText, tab === "categories" && styles.tabTextActive]}>Par Catégorie</Text>
                </TouchableOpacity>
            </View>

            {/* Sort Options (products only) */}
            {tab === "products" && (
                <View style={styles.sortBar}>
                    <Text style={styles.sortLabel}>Trier par :</Text>
                    {([
                        { key: "margin_da" as SortKey, label: "Marge DA" },
                        { key: "margin_pct" as SortKey, label: "Marge %" },
                        { key: "revenue" as SortKey, label: "Revenus" },
                    ]).map(s => (
                        <TouchableOpacity
                            key={s.key}
                            style={[styles.sortChip, sortKey === s.key && styles.sortChipActive]}
                            onPress={() => setSortKey(s.key)}
                        >
                            <Text style={[styles.sortChipText, sortKey === s.key && styles.sortChipTextActive]}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Product List */}
            {tab === "products" && (
                <View style={styles.listCard}>
                    {sortedProducts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={48} color="#475569" />
                            <Text style={styles.emptyText}>Aucune donnée de vente pour les produits</Text>
                        </View>
                    ) : (
                        sortedProducts.map((prod, i) => (
                            <View key={i} style={[styles.prodRow, i < sortedProducts.length - 1 && styles.prodRowBorder]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
                                    <View style={styles.prodMeta}>
                                        <Text style={styles.prodMetaText}>CA: {fmt(prod.revenue)} DA</Text>
                                        <Text style={styles.prodMetaDot}>·</Text>
                                        <Text style={styles.prodMetaText}>{fmt(prod.qtySold)} vendus</Text>
                                    </View>
                                    {/* Margin bar */}
                                    <View style={styles.marginBarTrack}>
                                        <View style={[
                                            styles.marginBarFill,
                                            {
                                                width: `${prod.marginPct}%`,
                                                backgroundColor: getMarginColor(prod.marginPct),
                                            }
                                        ]} />
                                    </View>
                                </View>
                                <View style={styles.prodRight}>
                                    <Text style={[styles.prodMarginDA, { color: getMarginColor(prod.marginPct) }]}>
                                        +{fmt(prod.marginDA)} DA
                                    </Text>
                                    <View style={[styles.prodPctBadge, { backgroundColor: `${getMarginColor(prod.marginPct)}20` }]}>
                                        <Text style={[styles.prodPctText, { color: getMarginColor(prod.marginPct) }]}>
                                            {prod.marginPct.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Category List */}
            {tab === "categories" && (
                <View style={styles.listCard}>
                    {sortedCategories.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="folder-open-outline" size={48} color="#475569" />
                            <Text style={styles.emptyText}>Aucune donnée de vente pour les catégories</Text>
                        </View>
                    ) : (
                        sortedCategories.map((cat, i) => (
                            <View key={i} style={[styles.prodRow, i < sortedCategories.length - 1 && styles.prodRowBorder]}>
                                <View style={[styles.catIcon, {
                                    backgroundColor: `${getMarginColor(cat.marginPct)}15`,
                                }]}>
                                    <Ionicons
                                        name="folder-open-outline"
                                        size={18}
                                        color={getMarginColor(cat.marginPct)}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.prodName}>{cat.name}</Text>
                                    <View style={styles.prodMeta}>
                                        <Text style={styles.prodMetaText}>CA: {fmt(cat.revenue)} DA</Text>
                                        <Text style={styles.prodMetaDot}>·</Text>
                                        <Text style={styles.prodMetaText}>Coût: {fmt(cat.cost)} DA</Text>
                                    </View>
                                    <View style={styles.marginBarTrack}>
                                        <View style={[
                                            styles.marginBarFill,
                                            {
                                                width: `${cat.marginPct}%`,
                                                backgroundColor: getMarginColor(cat.marginPct),
                                            }
                                        ]} />
                                    </View>
                                </View>
                                <View style={styles.prodRight}>
                                    <Text style={[styles.prodMarginDA, { color: getMarginColor(cat.marginPct) }]}>
                                        +{fmt(cat.marginDA)} DA
                                    </Text>
                                    <View style={[styles.prodPctBadge, { backgroundColor: `${getMarginColor(cat.marginPct)}20` }]}>
                                        <Text style={[styles.prodPctText, { color: getMarginColor(cat.marginPct) }]}>
                                            {cat.marginPct.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#22c55e" }]} />
                    <Text style={styles.legendText}>Excellente (≥25%)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
                    <Text style={styles.legendText}>Moyenne (15-25%)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                    <Text style={styles.legendText}>Faible (&lt;15%)</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },

    // Summary card
    summaryCard: {
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20,
        padding: 20, gap: 14,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    summaryTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    summaryItem: {
        width: "47%", backgroundColor: "#0a0f1e", borderRadius: 12,
        padding: 12, borderWidth: 1, borderColor: "#334155",
    },
    summaryLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    summaryValue: { color: "#f8fafc", fontSize: 16, fontWeight: "900", marginTop: 4 },

    // Gauge
    gaugeTrack: {
        height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden",
    },
    gaugeFill: { height: "100%", borderRadius: 4 },
    gaugeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    gaugeLabel: { fontSize: 10, fontWeight: "700" },

    // Tabs
    tabBar: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8,
    },
    tabBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 10, borderRadius: 10,
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    tabBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    tabText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
    tabTextActive: { color: "#fff" },

    // Sort
    sortBar: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, marginBottom: 12,
    },
    sortLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    sortChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    sortChipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
    sortChipText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
    sortChipTextActive: { color: "#fff" },

    // List card
    listCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, gap: 0,
    },
    prodRow: {
        flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
    },
    prodRowBorder: { borderBottomWidth: 1, borderBottomColor: "#33415540" },
    prodName: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
    prodMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    prodMetaText: { color: "#64748b", fontSize: 10, fontWeight: "600" },
    prodMetaDot: { color: "#475569", fontSize: 10 },
    prodRight: { alignItems: "flex-end", gap: 4 },
    prodMarginDA: { fontSize: 13, fontWeight: "800" },
    prodPctBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    prodPctText: { fontSize: 11, fontWeight: "800" },

    marginBarTrack: {
        height: 4, backgroundColor: "#334155", borderRadius: 2,
        marginTop: 6, overflow: "hidden",
    },
    marginBarFill: { height: "100%", borderRadius: 2 },

    // Category icon
    catIcon: {
        width: 36, height: 36, borderRadius: 10,
        justifyContent: "center", alignItems: "center",
    },

    // Legend
    legend: {
        flexDirection: "row", justifyContent: "center", gap: 16,
        marginTop: 20, paddingHorizontal: 16,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: "#64748b", fontSize: 10, fontWeight: "600" },

    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        color: "#64748b",
        fontSize: 13,
        fontWeight: "600",
        textAlign: "center",
    },
});
