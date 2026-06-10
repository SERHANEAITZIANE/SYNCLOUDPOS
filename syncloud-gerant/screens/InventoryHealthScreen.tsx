import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import SkeletonLoader from "../components/SkeletonLoader";

type InventoryTab = "overview" | "reorder" | "dead";

interface StockItem { name: string; stock: number; minStock: number; }
interface SlowMover { name: string; stock: number; lastMovementDays: number; }
interface FastMover { name: string; stock: number; avgDailySales: number; }

interface StockData {
    totalStockValue: number;
    zeroStockCount: number;
    lowStockCount: number;
    overStockCount: number;
    zeroStock: StockItem[];
    lowStock: StockItem[];
    slowMovers: SlowMover[];
    fastMovers: FastMover[];
    overStock: StockItem[];
}

const HEALTH_COLORS = { rupture: "#ef4444", low: "#f59e0b", ok: "#22c55e" };
const CAT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#10b981"];

export default function InventoryHealthScreen() {
    const [tab, setTab] = useState<InventoryTab>("overview");
    const [data, setData] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const fetchStock = useCallback(async () => {
        try {
            const result: StockData = await apiFetch("/gerant/stock-health");
            setData(result);
        } catch (e) {
            console.error("[InventoryHealth]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchStock(); }, [fetchStock]);

    if (loading) {
        return <SkeletonLoader type="list" rows={5} />;
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Ionicons name="cube-outline" size={48} color="#22c55e" />
                <Text style={styles.emptyText}>Aucune donnée de stock</Text>
                <Text style={styles.emptySubText}>Makan hta data ta3 stock hna</Text>
            </View>
        );
    }

    const reorderList = [...data.zeroStock, ...data.lowStock];
    const deadList = data.slowMovers;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStock(); }} tintColor="#22c55e" />
            }
        >
            {/* KPI row */}
            <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { borderLeftColor: "#3b82f6" }]}>
                    <Text style={styles.kpiLabel}>Valeur Stock</Text>
                    <Text style={styles.kpiValue}>{fmt(data.totalStockValue)}</Text>
                    <Text style={styles.kpiSub}>DA (coût estimé)</Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: "#a855f7" }]}>
                    <Text style={styles.kpiLabel}>Stock Lent</Text>
                    <Text style={[styles.kpiValue, { color: "#a855f7" }]}>{data.slowMovers.length}</Text>
                    <Text style={styles.kpiSub}>refs sans mouvement</Text>
                </View>
            </View>

            {/* Alert row */}
            <View style={styles.alertRow}>
                <View style={[styles.alertCard, { borderColor: "#ef444440" }]}>
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                    <Text style={styles.alertNum}>{data.zeroStockCount}</Text>
                    <Text style={styles.alertLabel}>Ruptures</Text>
                </View>
                <View style={[styles.alertCard, { borderColor: "#f59e0b40" }]}>
                    <Ionicons name="alert-circle" size={22} color="#f59e0b" />
                    <Text style={styles.alertNum}>{data.lowStockCount}</Text>
                    <Text style={styles.alertLabel}>Stock Bas</Text>
                </View>
                <View style={[styles.alertCard, { borderColor: "#3b82f640" }]}>
                    <Ionicons name="trending-up" size={22} color="#3b82f6" />
                    <Text style={styles.alertNum}>{data.fastMovers.length}</Text>
                    <Text style={styles.alertLabel}>Rapides</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {([
                    { k: "overview" as const, label: "Vue d'ensemble" },
                    { k: "reorder" as const, label: `Réappro (${reorderList.length})` },
                    { k: "dead" as const, label: `Lents (${deadList.length})` },
                ]).map(t => (
                    <TouchableOpacity
                        key={t.k}
                        style={[styles.tabBtn, tab === t.k && styles.tabBtnActive]}
                        onPress={() => setTab(t.k)}
                    >
                        <Text style={[styles.tabText, tab === t.k && styles.tabTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Overview Tab */}
            {tab === "overview" && (
                <>
                    <Text style={styles.sectionTitle}>PRODUITS EN RUPTURE</Text>
                    <View style={styles.productList}>
                        {data.zeroStock.length === 0 ? (
                            <View style={styles.listEmptyState}>
                                <Ionicons name="checkmark-circle-outline" size={30} color="#22c55e" />
                                <Text style={styles.listEmptyText}>Aucune rupture de stock</Text>
                                <Text style={styles.listEmptySubText}>Makan hta rupture hna</Text>
                            </View>
                        ) : data.zeroStock.map((p, i) => (
                            <View key={i} style={[styles.productRow, i < data.zeroStock.length - 1 && styles.divider]}>
                                <View style={[styles.healthDot, { backgroundColor: "#ef4444" }]} />
                                <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                <Text style={[styles.productStock, { color: "#ef4444" }]}>RUPTURE</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>STOCK BAS ({data.lowStockCount})</Text>
                    <View style={styles.productList}>
                        {data.lowStock.length === 0 ? (
                            <View style={styles.listEmptyState}>
                                <Ionicons name="checkmark-circle-outline" size={30} color="#22c55e" />
                                <Text style={styles.listEmptyText}>Stock suffisant</Text>
                                <Text style={styles.listEmptySubText}>Kolchi stock labas bih lyoum</Text>
                            </View>
                        ) : data.lowStock.map((p, i) => (
                            <View key={i} style={[styles.productRow, i < data.lowStock.length - 1 && styles.divider]}>
                                <View style={[styles.healthDot, { backgroundColor: "#f59e0b" }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                    <Text style={styles.productSub}>Seuil: {p.minStock} unités</Text>
                                </View>
                                <Text style={[styles.productStock, { color: "#f59e0b" }]}>{p.stock} u.</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>PRODUITS RAPIDES 🚀 ({data.fastMovers.length})</Text>
                    <View style={styles.productList}>
                        {data.fastMovers.length === 0 ? (
                            <View style={styles.listEmptyState}>
                                <Ionicons name="trending-up" size={30} color="#3b82f6" />
                                <Text style={styles.listEmptyText}>Aucun mouvement rapide</Text>
                                <Text style={styles.listEmptySubText}>Makan hta produit sria3 hna</Text>
                            </View>
                        ) : (
                            data.fastMovers.slice(0, 8).map((p, i) => (
                                <View key={i} style={[styles.productRow, i < 7 && styles.divider]}>
                                    <View style={[styles.healthDot, { backgroundColor: "#22c55e" }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                        <Text style={styles.productSub}>~{Math.round(p.avgDailySales)} ventes/j</Text>
                                    </View>
                                    <Text style={[styles.productStock, { color: "#22c55e" }]}>{p.stock} u.</Text>
                                </View>
                            ))
                        )}
                    </View>
                </>
            )}

            {/* Reorder Tab */}
            {tab === "reorder" && (
                <>
                    <View style={styles.reorderHint}>
                        <Ionicons name="information-circle-outline" size={16} color="#22c55e" />
                        <Text style={styles.reorderHintText}>
                            Ces produits sont en dessous du seuil minimal ou en rupture.
                        </Text>
                    </View>
                    <View style={styles.productList}>
                        {reorderList.length === 0 ? (
                            <View style={styles.listEmptyState}>
                                <Ionicons name="checkmark-circle-outline" size={30} color="#22c55e" />
                                <Text style={styles.listEmptyText}>Aucune commande nécessaire</Text>
                                <Text style={styles.listEmptySubText}>Stock kamel labas bih</Text>
                            </View>
                        ) : (
                            reorderList.map((p, i) => {
                                const isZero = p.stock === 0;
                                const color = isZero ? "#ef4444" : "#f59e0b";
                                const suggested = Math.max(p.minStock * 2, 10);
                                return (
                                    <View key={i} style={[styles.reorderRow, i < reorderList.length - 1 && styles.divider]}>
                                        <View style={[styles.reorderBadge, { backgroundColor: `${color}20` }]}>
                                            <Ionicons name={isZero ? "close-circle" : "alert-circle"} size={18} color={color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                            <Text style={[styles.reorderSuggested]}>Commander: ~{suggested} u.</Text>
                                        </View>
                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text style={[styles.productStock, { color }]}>
                                                {isZero ? "RUPTURE" : `${p.stock}/${p.minStock}`}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </>
            )}

            {/* Dead Stock Tab */}
            {tab === "dead" && (
                <>
                    <View style={[styles.reorderHint, { borderColor: "#94a3b840", backgroundColor: "#94a3b810" }]}>
                        <Ionicons name="archive-outline" size={16} color="#94a3b8" />
                        <Text style={[styles.reorderHintText, { color: "#94a3b8" }]}>
                            Stock sans mouvement depuis 30+ jours. Envisagez promotions ou déstockage.
                        </Text>
                    </View>
                    <View style={styles.productList}>
                        {deadList.length === 0 ? (
                            <View style={styles.listEmptyState}>
                                <Ionicons name="checkmark-circle-outline" size={30} color="#94a3b8" />
                                <Text style={styles.listEmptyText}>Mouvements normaux</Text>
                                <Text style={styles.listEmptySubText}>Ga3 les produits rahom yemchiw mlih</Text>
                            </View>
                        ) : (
                            deadList.map((p, i) => (
                                <View key={i} style={[styles.productRow, i < deadList.length - 1 && styles.divider]}>
                                    <View style={[styles.healthDot, { backgroundColor: "#94a3b8" }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                        <Text style={[styles.productSub, { color: "#ef4444" }]}>
                                            {p.lastMovementDays}j sans mouvement
                                        </Text>
                                    </View>
                                    <Text style={styles.productStock}>{p.stock} u.</Text>
                                </View>
                            ))
                        )}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0f1e" },
    emptyText: { color: "#22c55e", fontSize: 13, fontWeight: "600", textAlign: "center", paddingVertical: 12 },

    kpiRow: { flexDirection: "row", gap: 10, padding: 16 },
    kpiCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 14, borderLeftWidth: 4, gap: 4 },
    kpiLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    kpiValue: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
    kpiSub: { color: "#475569", fontSize: 10, fontWeight: "600" },

    alertRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
    alertCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1 },
    alertNum: { color: "#f8fafc", fontSize: 22, fontWeight: "900" },
    alertLabel: { color: "#64748b", fontSize: 10, fontWeight: "600" },

    tabBar: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 4 },
    tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
    tabBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    tabText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
    tabTextActive: { color: "#fff" },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },

    productList: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16 },
    productRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
    divider: { borderBottomWidth: 1, borderBottomColor: "#33415540" },
    healthDot: { width: 10, height: 10, borderRadius: 5 },
    productName: { color: "#f8fafc", fontSize: 13, fontWeight: "700", flex: 1 },
    productSub: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },
    productStock: { color: "#f8fafc", fontSize: 12, fontWeight: "800" },

    reorderHint: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "#22c55e15", marginHorizontal: 16, marginBottom: 8,
        borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#22c55e30",
    },
    reorderHintText: { flex: 1, color: "#22c55e", fontSize: 12, fontWeight: "600", lineHeight: 17 },
    reorderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
    reorderBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    reorderSuggested: { color: "#22c55e", fontSize: 10, fontWeight: "700", marginTop: 2 },
    emptySubText: { color: "#475569", fontSize: 12, textAlign: "center", paddingHorizontal: 16 },
    listEmptyState: { alignItems: "center", paddingVertical: 16, gap: 6 },
    listEmptyText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
    listEmptySubText: { color: "#475569", fontSize: 11, textAlign: "center" },
});
