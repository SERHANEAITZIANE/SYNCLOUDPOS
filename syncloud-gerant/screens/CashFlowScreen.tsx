import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Dimensions, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import SkeletonLoader from "../components/SkeletonLoader";

const { width } = Dimensions.get("window");

type Horizon = "7j" | "14j" | "30j";

interface FlowItem {
    label: string;
    date: string;
    amount: number;
    type: "in" | "out";
    category: string;
    probability: "certain" | "probable" | "estimé";
}

const FLOW_DATA: Record<Horizon, FlowItem[]> = {
    "7j": [
        { label: "Encaissement Supérette Horizon", date: "26/05", amount: 32000, type: "in", category: "Créance client", probability: "probable" },
        { label: "Paiement SPA Ramy Boissons", date: "27/05", amount: -150000, type: "out", category: "Fournisseur", probability: "certain" },
        { label: "Ventes journalières estimées", date: "27/05", amount: 180000, type: "in", category: "Ventes", probability: "estimé" },
        { label: "Salaires équipe", date: "28/05", amount: -85000, type: "out", category: "Charges fixes", probability: "certain" },
        { label: "Ventes journalières estimées", date: "28/05", amount: 175000, type: "in", category: "Ventes", probability: "estimé" },
        { label: "Loyer dépôt central", date: "30/05", amount: -45000, type: "out", category: "Charges fixes", probability: "certain" },
        { label: "Encaissement Café du Centre", date: "30/05", amount: 12000, type: "in", category: "Créance client", probability: "probable" },
        { label: "Ventes journalières estimées", date: "31/05", amount: 165000, type: "in", category: "Ventes", probability: "estimé" },
        { label: "Carburant + entretien", date: "31/05", amount: -8000, type: "out", category: "Opérationnel", probability: "estimé" },
    ],
    "14j": [
        { label: "Encaissements clients prévus", date: "S1", amount: 85000, type: "in", category: "Créance client", probability: "probable" },
        { label: "Paiements fournisseurs", date: "S1", amount: -320000, type: "out", category: "Fournisseur", probability: "certain" },
        { label: "Ventes S1 estimées", date: "S1", amount: 950000, type: "in", category: "Ventes", probability: "estimé" },
        { label: "Charges fixes S1", date: "S1", amount: -130000, type: "out", category: "Charges fixes", probability: "certain" },
        { label: "Ventes S2 estimées", date: "S2", amount: 880000, type: "in", category: "Ventes", probability: "estimé" },
        { label: "Paiements fournisseurs S2", date: "S2", amount: -280000, type: "out", category: "Fournisseur", probability: "probable" },
        { label: "Charges fixes S2", date: "S2", amount: -85000, type: "out", category: "Charges fixes", probability: "certain" },
    ],
    "30j": [
        { label: "CA mensuel estimé", date: "Juin", amount: 5200000, type: "in", category: "Ventes", probability: "estimé" },
        { label: "Achats fournisseurs", date: "Juin", amount: -3600000, type: "out", category: "Fournisseur", probability: "probable" },
        { label: "Loyer + charges", date: "Juin", amount: -120000, type: "out", category: "Charges fixes", probability: "certain" },
        { label: "Salaires", date: "Juin", amount: -255000, type: "out", category: "Charges fixes", probability: "certain" },
        { label: "Encaissements créances", date: "Juin", amount: 320000, type: "in", category: "Créance client", probability: "probable" },
        { label: "Divers & imprévus", date: "Juin", amount: -80000, type: "out", category: "Opérationnel", probability: "estimé" },
    ],
};

const PROB_COLORS: Record<string, string> = {
    certain: "#22c55e",
    probable: "#f59e0b",
    estimé: "#94a3b8",
};

export default function CashFlowScreen() {
    const [horizon, setHorizon] = useState<Horizon>("7j");
    const [currentBalance, setCurrentBalance] = useState<number>(420000);
    const [dbFlows, setDbFlows] = useState<FlowItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCashflowData = useCallback(async () => {
        try {
            const data = await apiFetch("/gerant/cashflow");
            if (data) {
                if (typeof data.currentBalance === "number") {
                    setCurrentBalance(data.currentBalance);
                }
                if (Array.isArray(data.flows)) {
                    setDbFlows(data.flows);
                }
            }
        } catch (e) {
            console.error("[CashFlowScreen] Fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadCashflowData();
    }, [loadCashflowData]);

    const getFlowsForHorizon = (): FlowItem[] => {
        if (dbFlows.length === 0) {
            return FLOW_DATA[horizon];
        }

        const limitDays = horizon === "7j" ? 7 : horizon === "14j" ? 14 : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - limitDays);

        const filtered = dbFlows.filter(f => {
            const fDate = new Date(f.date);
            return fDate >= cutoffDate;
        });

        if (filtered.length === 0) {
            return FLOW_DATA[horizon];
        }

        return filtered.map(f => {
            const dateObj = new Date(f.date);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            return {
                ...f,
                date: `${day}/${month}`
            };
        });
    };

    const flows = getFlowsForHorizon();

    const totalIn = flows.filter(f => f.type === "in").reduce((s, f) => s + f.amount, 0);
    const totalOut = flows.filter(f => f.type === "out").reduce((s, f) => s + Math.abs(f.amount), 0);
    const netFlow = totalIn - totalOut;
    const projectedBalance = currentBalance + netFlow;

    const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR");

    const barData = horizon === "7j"
        ? [
            { day: "Auj.", net: flows.filter(f => f.type === "in").reduce((sum, f) => sum + f.amount, 0) - flows.filter(f => f.type === "out").reduce((sum, f) => sum + Math.abs(f.amount), 0) || 185000 },
            { day: "J+1", net: 180000 - 150000 },
            { day: "J+2", net: 175000 - 85000 },
            { day: "J+3", net: 0 - 0 },
            { day: "J+4", net: 165000 - 45000 - 8000 },
            { day: "J+5", net: 150000 - 0 },
            { day: "J+6", net: 120000 - 40000 },
        ]
        : [];

    const maxBar = barData.length > 0 ? Math.max(...barData.map(b => Math.abs(b.net))) : 1;

    if (loading) {
        return <SkeletonLoader type="list" rows={5} />;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        loadCashflowData();
                    }}
                    tintColor="#06b6d4"
                />
            }
        >
            {/* Horizon Selector */}
            <View style={styles.horizonBar}>
                {(["7j", "14j", "30j"] as Horizon[]).map(h => (
                    <TouchableOpacity
                        key={h}
                        style={[styles.horizonBtn, horizon === h && styles.horizonBtnActive]}
                        onPress={() => setHorizon(h)}
                    >
                        <Text style={[styles.horizonText, horizon === h && styles.horizonTextActive]}>
                            {h === "7j" ? "7 Jours" : h === "14j" ? "14 Jours" : "30 Jours"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Position actuelle */}
            <View style={styles.positionCard}>
                <Text style={styles.positionLabel}>Trésorerie Actuelle</Text>
                <Text style={styles.positionValue}>{fmt(currentBalance)} DA</Text>
                <View style={styles.positionArrow}>
                    <Ionicons name="arrow-forward" size={18} color="#64748b" />
                </View>
                <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.positionLabel}>Projection ({horizon})</Text>
                    <Text style={[styles.positionValue, { color: projectedBalance >= 0 ? "#22c55e" : "#ef4444" }]}>
                        {projectedBalance < 0 ? "-" : ""}{fmt(projectedBalance)} DA
                    </Text>
                </View>
            </View>

            {/* Flow summary cards */}
            <View style={styles.flowSummaryRow}>
                <View style={styles.flowCard}>
                    <Ionicons name="arrow-down-circle" size={20} color="#22c55e" />
                    <Text style={styles.flowLabel}>Entrées prévues</Text>
                    <Text style={[styles.flowValue, { color: "#22c55e" }]}>+{fmt(totalIn)} DA</Text>
                </View>
                <View style={styles.flowCard}>
                    <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
                    <Text style={styles.flowLabel}>Sorties prévues</Text>
                    <Text style={[styles.flowValue, { color: "#ef4444" }]}>-{fmt(totalOut)} DA</Text>
                </View>
                <View style={[styles.flowCard, { borderColor: netFlow >= 0 ? "#22c55e30" : "#ef444430" }]}>
                    <Ionicons name="swap-vertical" size={20} color={netFlow >= 0 ? "#22c55e" : "#ef4444"} />
                    <Text style={styles.flowLabel}>Flux Net</Text>
                    <Text style={[styles.flowValue, { color: netFlow >= 0 ? "#22c55e" : "#ef4444" }]}>
                        {netFlow >= 0 ? "+" : "-"}{fmt(netFlow)} DA
                    </Text>
                </View>
            </View>

            {/* Bar chart (7-day view) */}
            {horizon === "7j" && barData.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>PROJECTION JOURNALIÈRE</Text>
                    <View style={styles.chartCard}>
                        {barData.map((b, i) => {
                            const h = maxBar > 0 ? (Math.abs(b.net) / maxBar) * 100 : 10;
                            const isPositive = b.net >= 0;
                            return (
                                <View key={i} style={styles.barCol}>
                                    <Text style={styles.barValLabel}>
                                        {b.net >= 1000000 ? `${(b.net / 1000000).toFixed(1)}M`
                                            : b.net >= 1000 ? `${Math.round(b.net / 1000)}K`
                                                : String(b.net)}
                                    </Text>
                                    <View style={styles.barTrack}>
                                        <View style={[
                                            styles.bar,
                                            {
                                                height: `${Math.max(h, 5)}%`,
                                                backgroundColor: isPositive ? "#22c55e" : "#ef4444",
                                            }
                                        ]} />
                                    </View>
                                    <Text style={styles.barDayLabel}>{b.day}</Text>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}

            {/* Alert if negative projected */}
            {projectedBalance < 0 && (
                <View style={styles.dangerAlert}>
                    <Ionicons name="warning" size={20} color="#ef4444" />
                    <Text style={styles.dangerText}>
                        ⚠️ Attention : La trésorerie risque d'être négative dans {horizon}. Planifiez des encaissements ou reportez des paiements fournisseurs.
                    </Text>
                </View>
            )}

            {/* Probability legend */}
            <View style={styles.probLegend}>
                {(["certain", "probable", "estimé"] as const).map(p => (
                    <View key={p} style={styles.probItem}>
                        <View style={[styles.probDot, { backgroundColor: PROB_COLORS[p] }]} />
                        <Text style={styles.probText}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                    </View>
                ))}
            </View>

            {/* Flow Items */}
            <Text style={styles.sectionTitle}>DÉTAIL DES FLUX</Text>
            {flows.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="swap-vertical" size={48} color="#334155" />
                    <Text style={styles.emptyText}>Aucun flux trouvé</Text>
                    <Text style={styles.emptySubText}>Makan hta transaction f la caisse hna</Text>
                </View>
            ) : (
                <View style={styles.flowList}>
                    {flows.map((item, i) => (
                        <View key={i} style={[styles.flowItem, i < flows.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#33415540" }]}>
                            <View style={[styles.flowItemIcon, {
                                backgroundColor: item.type === "in" ? "#22c55e15" : "#ef444415",
                            }]}>
                                <Ionicons
                                    name={item.type === "in" ? "arrow-down" : "arrow-up"}
                                    size={16}
                                    color={item.type === "in" ? "#22c55e" : "#ef4444"}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.flowItemLabel}>{item.label}</Text>
                                <View style={styles.flowItemMeta}>
                                    <Text style={styles.flowItemDate}>{item.date}</Text>
                                    <View style={[styles.probBadge, { backgroundColor: `${PROB_COLORS[item.probability]}20` }]}>
                                        <View style={[styles.probBadgeDot, { backgroundColor: PROB_COLORS[item.probability] }]} />
                                        <Text style={[styles.probBadgeText, { color: PROB_COLORS[item.probability] }]}>
                                            {item.probability}
                                        </Text>
                                    </View>
                                    <Text style={styles.flowItemCat}>{item.category}</Text>
                                </View>
                            </View>
                            <Text style={[styles.flowItemAmount, { color: item.type === "in" ? "#22c55e" : "#ef4444" }]}>
                                {item.type === "in" ? "+" : "-"}{fmt(item.amount)} DA
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },

    horizonBar: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16,
        paddingTop: 16, paddingBottom: 8,
    },
    horizonBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    horizonBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    horizonText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },
    horizonTextActive: { color: "#fff" },

    positionCard: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, marginTop: 8,
    },
    positionLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    positionValue: { color: "#f8fafc", fontSize: 18, fontWeight: "900", marginTop: 4 },
    positionArrow: { padding: 4 },

    flowSummaryRow: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12,
    },
    flowCard: {
        flex: 1, backgroundColor: "#1e293b", borderRadius: 14, padding: 12,
        gap: 4, borderWidth: 1, borderColor: "#334155", alignItems: "center",
    },
    flowLabel: { color: "#64748b", fontSize: 9, fontWeight: "700", textAlign: "center" },
    flowValue: { fontSize: 12, fontWeight: "900", textAlign: "center" },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
    },

    chartCard: {
        flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end",
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, height: 160,
    },
    barCol: { flex: 1, alignItems: "center" },
    barValLabel: { color: "#94a3b8", fontSize: 8, fontWeight: "700", marginBottom: 4 },
    barTrack: {
        flex: 1, width: 20, justifyContent: "flex-end",
        borderRadius: 6, overflow: "hidden",
    },
    bar: { width: "100%", borderRadius: 6 },
    barDayLabel: { color: "#64748b", fontSize: 9, fontWeight: "700", marginTop: 6 },

    dangerAlert: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "#ef444415", marginHorizontal: 16, marginTop: 12,
        borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#ef444440",
    },
    dangerText: { flex: 1, color: "#f87171", fontSize: 12, fontWeight: "600", lineHeight: 18 },

    probLegend: {
        flexDirection: "row", justifyContent: "center", gap: 16,
        paddingHorizontal: 16, marginTop: 16,
    },
    probItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    probDot: { width: 8, height: 8, borderRadius: 4 },
    probText: { color: "#64748b", fontSize: 10, fontWeight: "600" },

    flowList: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16 },
    flowItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
    flowItemIcon: {
        width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center",
    },
    flowItemLabel: { color: "#f8fafc", fontSize: 12, fontWeight: "700" },
    flowItemMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
    flowItemDate: { color: "#64748b", fontSize: 10, fontWeight: "600" },
    flowItemCat: { color: "#475569", fontSize: 9, fontWeight: "600" },
    probBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
    probBadgeDot: { width: 5, height: 5, borderRadius: 3 },
    probBadgeText: { fontSize: 9, fontWeight: "700" },
    flowItemAmount: { fontSize: 13, fontWeight: "800" },
    emptyState: { alignItems: "center", padding: 48, gap: 12 },
    emptyText: { color: "#64748b", fontSize: 16, fontWeight: "700" },
    emptySubText: { color: "#475569", fontSize: 12, textAlign: "center" },
});
