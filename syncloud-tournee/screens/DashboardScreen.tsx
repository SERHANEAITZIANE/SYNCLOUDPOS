import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet,
    ActivityIndicator, RefreshControl, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { useLangStore } from "../lib/i18n";
import { isOnline, getPendingCount, getLastSyncTime, fullSync } from "../lib/offline-sync";

interface DashboardData {
    date: string;
    tours: { total: number; active: number; completed: number };
    clients: {
        total: number; visited: number; delivered: number;
        absent: number; remaining: number; progressPercent: number;
    };
    financials: {
        totalSales: number; totalCollected: number;
        totalReturns: number; netAmount: number;
        byMethod?: { cash: number; check: number; transfer: number };
    };
    distance: { totalKm: number };
}

export default function DashboardScreen() {
    const { t } = useLangStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Sync status
    const [online, setOnline] = useState(true);
    const [pendingOps, setPendingOps] = useState(0);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    const fetchDashboard = useCallback(async () => {
        try {
            const result = await apiFetch("/dashboard");
            setData(result);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchSyncStatus = useCallback(async () => {
        const onl = await isOnline();
        setOnline(onl);
        const pending = await getPendingCount();
        setPendingOps(pending);
        const ls = await getLastSyncTime();
        setLastSync(ls);
    }, []);

    const handleForceSync = async () => {
        setSyncing(true);
        try {
            await fullSync();
            await fetchSyncStatus();
            await fetchDashboard();
        } catch { /* silent */ }
        setSyncing(false);
    };

    useEffect(() => {
        fetchDashboard();
        fetchSyncStatus();
    }, [fetchDashboard, fetchSyncStatus]);

    if (loading || !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const formatSyncTime = (iso: string | null) => {
        if (!iso) return t("never");
        const d = new Date(iso);
        return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => {
                    setRefreshing(true);
                    fetchDashboard();
                    fetchSyncStatus();
                }} tintColor="#3b82f6" />
            }
        >
            {/* Sync Status Bar */}
            <View style={[styles.syncBar, !online && styles.syncBarOffline]}>
                <View style={styles.syncLeft}>
                    <View style={[styles.syncDot, { backgroundColor: online ? "#22c55e" : "#ef4444" }]} />
                    <Text style={styles.syncStatusText}>
                        {online ? t("online") : t("offline")}
                    </Text>
                    {pendingOps > 0 && (
                        <View style={styles.syncPendingBadge}>
                            <Text style={styles.syncPendingText}>{pendingOps} {t("pendingOps")}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.syncRight}>
                    <Text style={styles.syncTimeText}>{formatSyncTime(lastSync)}</Text>
                    <TouchableOpacity onPress={handleForceSync} disabled={syncing}>
                        <Ionicons 
                            name={syncing ? "hourglass" : "sync"} 
                            size={18} 
                            color={syncing ? "#64748b" : "#3b82f6"} 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Date header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t("daySummary")}</Text>
                <Text style={styles.headerDate}>
                    {new Date(data.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </Text>
            </View>

            {/* Progress ring */}
            <View style={styles.progressCard}>
                <View style={styles.progressRing}>
                    <Text style={styles.progressPercent}>{data.clients.progressPercent}%</Text>
                    <Text style={styles.progressLabel}>{t("donePercent")}</Text>
                </View>
                <View style={styles.progressStats}>
                    <View style={styles.progressStat}>
                        <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                        <Text style={styles.progressStatValue}>{data.clients.delivered}</Text>
                        <Text style={styles.progressStatLabel}>{t("deliveredLbl")}</Text>
                    </View>
                    <View style={styles.progressStat}>
                        <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                        <Text style={styles.progressStatValue}>{data.clients.absent}</Text>
                        <Text style={styles.progressStatLabel}>{t("absentLbl")}</Text>
                    </View>
                    <View style={styles.progressStat}>
                        <View style={[styles.dot, { backgroundColor: "#64748b" }]} />
                        <Text style={styles.progressStatValue}>{data.clients.remaining}</Text>
                        <Text style={styles.progressStatLabel}>{t("remaining")}</Text>
                    </View>
                </View>
            </View>

            {/* 100% celebration */}
            {data.clients.progressPercent === 100 && (
                <View style={styles.celebrationCard}>
                    <Text style={styles.celebrationText}>{t("completedDay")}</Text>
                </View>
            )}

            {/* Financial KPIs */}
            <Text style={styles.sectionTitle}>{t("financial")}</Text>
            <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: "#3b82f6" }]}>
                    <Ionicons name="cart" size={22} color="#3b82f6" />
                    <Text style={styles.kpiValue}>
                        {data.financials.totalSales.toLocaleString("fr-FR")}
                    </Text>
                    <Text style={styles.kpiLabel}>{t("sales")}</Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: "#22c55e" }]}>
                    <Ionicons name="cash" size={22} color="#22c55e" />
                    <Text style={styles.kpiValue}>
                        {data.financials.totalCollected.toLocaleString("fr-FR")}
                    </Text>
                    <Text style={styles.kpiLabel}>{t("collected")}</Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: "#f59e0b" }]}>
                    <Ionicons name="return-down-back" size={22} color="#f59e0b" />
                    <Text style={styles.kpiValue}>
                        {data.financials.totalReturns.toLocaleString("fr-FR")}
                    </Text>
                    <Text style={styles.kpiLabel}>{t("returns")}</Text>
                </View>

                <View style={[styles.kpiCard, { borderLeftColor: "#8b5cf6" }]}>
                    <Ionicons name="trending-up" size={22} color="#8b5cf6" />
                    <Text style={styles.kpiValue}>
                        {data.financials.netAmount.toLocaleString("fr-FR")}
                    </Text>
                    <Text style={styles.kpiLabel}>{t("net")}</Text>
                </View>
            </View>

            {/* Tour stats */}
            <Text style={styles.sectionTitle}>{t("distTours")}</Text>
            <View style={styles.distRow}>
                <View style={styles.distCard}>
                    <Ionicons name="speedometer" size={28} color="#3b82f6" />
                    <Text style={styles.distValue}>{data.distance.totalKm}</Text>
                    <Text style={styles.distLabel}>{t("kmDriven")}</Text>
                </View>
                <View style={styles.distCard}>
                    <Ionicons name="map" size={28} color="#22c55e" />
                    <Text style={styles.distValue}>{data.tours.total}</Text>
                    <Text style={styles.distLabel}>{data.tours.total > 1 ? t("tours") : t("tour")}</Text>
                </View>
                <View style={styles.distCard}>
                    <Ionicons name="people" size={28} color="#f59e0b" />
                    <Text style={styles.distValue}>{data.clients.total}</Text>
                    <Text style={styles.distLabel}>{t("clients")}</Text>
                </View>
            </View>

            {/* End of day cash balance */}
            <Text style={styles.sectionTitle}>{t("cashHandover")}</Text>
            <View style={styles.caisseCard}>
                <View style={styles.caisseRow}>
                    <View style={styles.caisseLabelWrap}>
                        <Ionicons name="cash" size={20} color="#22c55e" />
                        <Text style={styles.caisseLabel}>{t("especes")}</Text>
                    </View>
                    <Text style={styles.caisseValue}>{data.financials.byMethod?.cash?.toLocaleString("fr-FR") || "0"} DA</Text>
                </View>
                <View style={styles.caisseRow}>
                    <View style={styles.caisseLabelWrap}>
                        <Ionicons name="card" size={20} color="#3b82f6" />
                        <Text style={styles.caisseLabel}>{t("cheques")}</Text>
                    </View>
                    <Text style={styles.caisseValue}>{data.financials.byMethod?.check?.toLocaleString("fr-FR") || "0"} DA</Text>
                </View>
                <View style={styles.caisseRow}>
                    <View style={styles.caisseLabelWrap}>
                        <Ionicons name="swap-horizontal" size={20} color="#8b5cf6" />
                        <Text style={styles.caisseLabel}>{t("virements")}</Text>
                    </View>
                    <Text style={[styles.caisseValue, { borderBottomWidth: 0 }]}>
                        {data.financials.byMethod?.transfer?.toLocaleString("fr-FR") || "0"} DA
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },

    // Sync bar
    syncBar: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "#1e293b", paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    syncBarOffline: { backgroundColor: "#7f1d1d" },
    syncLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    syncDot: { width: 8, height: 8, borderRadius: 4 },
    syncStatusText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    syncPendingBadge: { backgroundColor: "#f59e0b20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    syncPendingText: { color: "#f59e0b", fontSize: 10, fontWeight: "700" },
    syncRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    syncTimeText: { color: "#64748b", fontSize: 11 },

    header: { padding: 16 },
    headerTitle: { color: "#f8fafc", fontSize: 24, fontWeight: "900" },
    headerDate: { color: "#64748b", fontSize: 14, marginTop: 2, textTransform: "capitalize" },

    // Celebration
    celebrationCard: {
        backgroundColor: "#052e16", marginHorizontal: 16, marginBottom: 8,
        padding: 16, borderRadius: 14, alignItems: "center",
        borderWidth: 1, borderColor: "#166534",
    },
    celebrationText: { color: "#22c55e", fontSize: 18, fontWeight: "800" },

    // Progress
    progressCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", margin: 16, marginTop: 0,
        padding: 20, borderRadius: 20, gap: 24,
    },
    progressRing: {
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 6, borderColor: "#3b82f6",
        justifyContent: "center", alignItems: "center",
    },
    progressPercent: { color: "#f8fafc", fontSize: 28, fontWeight: "900" },
    progressLabel: { color: "#64748b", fontSize: 11 },
    progressStats: { flex: 1, gap: 8 },
    progressStat: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    progressStatValue: { color: "#f8fafc", fontSize: 18, fontWeight: "800", width: 30 },
    progressStatLabel: { color: "#94a3b8", fontSize: 13 },

    // Section
    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 8, marginBottom: 8,
    },

    // KPIs
    kpiGrid: {
        flexDirection: "row", flexWrap: "wrap", gap: 10,
        paddingHorizontal: 16,
    },
    kpiCard: {
        backgroundColor: "#1e293b", borderRadius: 14, padding: 16,
        width: "47%", borderLeftWidth: 3,
    },
    kpiValue: { color: "#f8fafc", fontSize: 20, fontWeight: "900", marginTop: 8 },
    kpiLabel: { color: "#64748b", fontSize: 12, marginTop: 4 },

    // Distance
    distRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
    distCard: {
        flex: 1, backgroundColor: "#1e293b", borderRadius: 14,
        padding: 16, alignItems: "center",
    },
    distValue: { color: "#f8fafc", fontSize: 24, fontWeight: "900", marginTop: 8 },
    distLabel: { color: "#64748b", fontSize: 12, marginTop: 2 },

    // End of day cash
    caisseCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 16,
        padding: 16, borderRadius: 14, gap: 12,
    },
    caisseRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    caisseLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    caisseLabel: { color: "#64748b", fontSize: 13, fontWeight: "600" },
    caisseValue: {
        color: "#f8fafc", fontSize: 16, fontWeight: "800",
        borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 12,
    },
});
