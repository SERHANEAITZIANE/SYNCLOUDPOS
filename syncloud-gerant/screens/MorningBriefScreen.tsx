import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

interface BriefData {
    greeting: string;
    data: {
        todayRevenue: number;
        yesterdayRevenue: number;
        growthPct: number;
        todayOrders: number;
        totalDebt: number;
        debtorCount: number;
        topDebtors: { name: string; balance: number; phone: string | null }[];
        lowStockCount: number;
        lowStockItems: { name: string; stock: number; minStock: number }[];
        totalExpenses: number;
        generatedAt: string;
    };
}

export default function MorningBriefScreen({ navigation }: any) {
    const [brief, setBrief] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR");

    const fetchBrief = useCallback(async () => {
        try {
            const result: BriefData = await apiFetch("/gerant/morning-brief");
            setBrief(result);
        } catch (e) {
            console.error("[MorningBrief]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchBrief(); }, [fetchBrief]);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "🌅 Bonjour" : hour < 18 ? "☀️ Bon après-midi" : "🌙 Bonsoir";
    const dayLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

    if (loading) {
        return (
            <View style={styles.center}>
                <View style={styles.loadingCard}>
                    <ActivityIndicator size="large" color="#f59e0b" />
                    <Text style={styles.loadingTitle}>Gemini analyse votre journée...</Text>
                    <Text style={styles.loadingSubtitle}>Consultation des données en temps réel</Text>
                </View>
            </View>
        );
    }

    const d = brief?.data;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBrief(); }} tintColor="#f59e0b" />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.aiPill}>
                        <Ionicons name="sparkles" size={14} color="#f59e0b" />
                        <Text style={styles.aiPillText}>Gemini AI — Briefing du jour</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setRefreshing(true); fetchBrief(); }}>
                        <Ionicons name="refresh-circle" size={28} color="#334155" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.greetingText}>{greeting}</Text>
                <Text style={styles.dateText}>{dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</Text>
            </View>

            {/* AI Briefing */}
            {brief?.greeting && (
                <View style={styles.aiCard}>
                    <View style={styles.aiCardHeader}>
                        <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={16} color="#fff" />
                        </View>
                        <Text style={styles.aiCardTitle}>Votre conseiller IA</Text>
                    </View>
                    <Text style={styles.aiText}>{brief.greeting}</Text>
                </View>
            )}

            {/* Quick KPI Row */}
            {d && (
                <>
                    <Text style={styles.sectionTitle}>CHIFFRES DU JOUR</Text>
                    <View style={styles.kpiGrid}>
                        <View style={[styles.kpiCard, { borderLeftColor: "#3b82f6" }]}>
                            <Text style={styles.kpiLabel}>CA Aujourd'hui</Text>
                            <Text style={[styles.kpiValue, { color: "#3b82f6" }]}>{fmt(d.todayRevenue)}</Text>
                            <Text style={styles.kpiSub}>DA • {d.todayOrders} cmd.</Text>
                        </View>
                        <View style={[styles.kpiCard, { borderLeftColor: d.growthPct >= 0 ? "#22c55e" : "#ef4444" }]}>
                            <Text style={styles.kpiLabel}>vs. Hier</Text>
                            <View style={styles.kpiGrowthRow}>
                                <Ionicons
                                    name={d.growthPct >= 0 ? "trending-up" : "trending-down"}
                                    size={16}
                                    color={d.growthPct >= 0 ? "#22c55e" : "#ef4444"}
                                />
                                <Text style={[styles.kpiValue, { color: d.growthPct >= 0 ? "#22c55e" : "#ef4444" }]}>
                                    {d.growthPct > 0 ? "+" : ""}{d.growthPct}%
                                </Text>
                            </View>
                            <Text style={styles.kpiSub}>Hier: {fmt(d.yesterdayRevenue)} DA</Text>
                        </View>
                    </View>

                    <View style={styles.kpiGrid}>
                        <View style={[styles.kpiCard, { borderLeftColor: "#f59e0b" }]}>
                            <Text style={styles.kpiLabel}>Créances</Text>
                            <Text style={[styles.kpiValue, { color: "#f59e0b" }]}>{fmt(d.totalDebt)}</Text>
                            <Text style={styles.kpiSub}>DA • {d.debtorCount} débiteurs</Text>
                        </View>
                        <View style={[styles.kpiCard, { borderLeftColor: "#ef4444" }]}>
                            <Text style={styles.kpiLabel}>Stock Critique</Text>
                            <Text style={[styles.kpiValue, { color: "#ef4444" }]}>{d.lowStockCount}</Text>
                            <Text style={styles.kpiSub}>références à réapprovisionner</Text>
                        </View>
                    </View>

                    {/* Top Debtors */}
                    {d.topDebtors.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>TOP DÉBITEURS À RELANCER</Text>
                            <View style={styles.listCard}>
                                {d.topDebtors.map((debtor, i) => (
                                    <View key={i} style={[styles.debtorRow, i < d.topDebtors.length - 1 && styles.divider]}>
                                        <View style={[styles.debtorRank, { backgroundColor: i === 0 ? "#ef444420" : "#33415550" }]}>
                                            <Text style={[styles.debtorRankText, { color: i === 0 ? "#ef4444" : "#64748b" }]}>
                                                #{i + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.debtorName}>{debtor.name}</Text>
                                            <Text style={styles.debtorAmount}>{fmt(debtor.balance)} DA</Text>
                                        </View>
                                        <View style={styles.debtorActions}>
                                            {debtor.phone && (
                                                <TouchableOpacity
                                                    style={styles.waBtn}
                                                    onPress={() => {
                                                        const msg = encodeURIComponent(
                                                            `Bonjour ${debtor.name}, nous vous rappelons votre solde de ${fmt(debtor.balance)} DA. Merci. — SynCloudPOS`
                                                        );
                                                        Linking.openURL(`whatsapp://send?phone=${debtor.phone}&text=${msg}`);
                                                    }}
                                                >
                                                    <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Low Stock Items */}
                    {d.lowStockItems.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>PRODUITS CRITIQUES</Text>
                            <View style={styles.listCard}>
                                {d.lowStockItems.map((item, i) => (
                                    <View key={i} style={[styles.stockRow, i < d.lowStockItems.length - 1 && styles.divider]}>
                                        <Ionicons
                                            name={item.stock === 0 ? "close-circle" : "alert-circle"}
                                            size={18}
                                            color={item.stock === 0 ? "#ef4444" : "#f59e0b"}
                                        />
                                        <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[styles.stockQty, { color: item.stock === 0 ? "#ef4444" : "#f59e0b" }]}>
                                            {item.stock === 0 ? "RUPTURE" : `${item.stock} u.`}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Navigation shortcuts */}
                    <Text style={styles.sectionTitle}>ACCÈS RAPIDES</Text>
                    <View style={styles.shortcutGrid}>
                        {[
                            { icon: "people", label: "Créances", color: "#f59e0b", screen: "ClientDebts" },
                            { icon: "cube", label: "Stock", color: "#3b82f6", screen: "InventoryHealth" },
                            { icon: "analytics", label: "Ventes", color: "#22c55e", screen: "SalesAnalytics" },
                            { icon: "sparkles", label: "Conseiller IA", color: "#a855f7", screen: "AI" },
                        ].map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.shortcutBtn}
                                onPress={() => navigation?.navigate?.(item.screen)}
                            >
                                <View style={[styles.shortcutIcon, { backgroundColor: `${item.color}20` }]}>
                                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                                </View>
                                <Text style={styles.shortcutLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            {/* Last updated */}
            {d?.generatedAt && (
                <Text style={styles.lastUpdated}>
                    Généré à {new Date(d.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
    loadingCard: { backgroundColor: "#1e293b", borderRadius: 24, padding: 32, alignItems: "center", gap: 16, margin: 32 },
    loadingTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800", textAlign: "center" },
    loadingSubtitle: { color: "#64748b", fontSize: 13, textAlign: "center" },

    header: { padding: 20, paddingTop: 24, gap: 8 },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    aiPill: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#f59e0b20", paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1, borderColor: "#f59e0b30",
    },
    aiPillText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
    greetingText: { color: "#f8fafc", fontSize: 28, fontWeight: "900" },
    dateText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

    aiCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 20, padding: 18,
        borderWidth: 1, borderColor: "#f59e0b30", gap: 12,
    },
    aiCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    aiAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f59e0b", justifyContent: "center", alignItems: "center" },
    aiCardTitle: { color: "#f59e0b", fontSize: 13, fontWeight: "800" },
    aiText: { color: "#e2e8f0", fontSize: 14, lineHeight: 22 },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },

    kpiGrid: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
    kpiCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 14, borderLeftWidth: 4, gap: 4 },
    kpiLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    kpiValue: { color: "#f8fafc", fontSize: 20, fontWeight: "900" },
    kpiGrowthRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    kpiSub: { color: "#475569", fontSize: 10, fontWeight: "600" },

    listCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16 },
    divider: { borderBottomWidth: 1, borderBottomColor: "#33415540" },

    debtorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
    debtorRank: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    debtorRankText: { fontSize: 11, fontWeight: "800" },
    debtorName: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
    debtorAmount: { color: "#f59e0b", fontSize: 12, fontWeight: "800", marginTop: 2 },
    debtorActions: { flexDirection: "row", gap: 8 },
    waBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#22c55e20", justifyContent: "center", alignItems: "center" },

    stockRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
    stockName: { flex: 1, color: "#f8fafc", fontSize: 13, fontWeight: "600" },
    stockQty: { fontSize: 12, fontWeight: "800" },

    shortcutGrid: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
    shortcutBtn: { flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 14, alignItems: "center", gap: 8 },
    shortcutIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    shortcutLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", textAlign: "center" },

    lastUpdated: { color: "#334155", fontSize: 11, textAlign: "center", marginTop: 24, fontStyle: "italic" },
});
