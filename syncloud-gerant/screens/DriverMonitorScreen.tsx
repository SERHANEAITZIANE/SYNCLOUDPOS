import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Dimensions, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import SkeletonLoader from "../components/SkeletonLoader";

const { width } = Dimensions.get("window");

interface Driver {
    id: string;
    name: string;
    phone: string | null;
    zone: string;
    blCount: number;
    revenue: number;
    returns: number;
    collections: number;
    commission: number;
    clientsVisited: number;
    clientsPlanned: number;
    status: "active" | "done" | "delayed";
    lastPing: string;
}

interface Summary {
    totalRevenue: number;
    totalBLs: number;
    totalCommissions: number;
    totalCollections: number;
}

const MILESTONES = [
    { label: "Bronze", target: 150000, color: "#cd7f32" },
    { label: "Argent", target: 250000, color: "#94a3b8" },
    { label: "Or", target: 400000, color: "#f59e0b" },
];

export default function DriverMonitorScreen() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalRevenue: 0, totalBLs: 0, totalCommissions: 0, totalCollections: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [sortKey, setSortKey] = useState<"revenue" | "blCount" | "commission">("revenue");

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const fetchDrivers = useCallback(async () => {
        try {
            const data = await apiFetch("/gerant/driver-monitor");
            setDrivers(data.drivers || []);
            setSummary(data.summary || { totalRevenue: 0, totalBLs: 0, totalCommissions: 0, totalCollections: 0 });
        } catch (e) {
            console.error("[DriverMonitor]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const sorted = [...drivers].sort((a, b) => b[sortKey] - a[sortKey]);

    const statusColor = (s: Driver["status"]) =>
        s === "active" ? "#22c55e" : s === "done" ? "#3b82f6" : "#f59e0b";
    const statusLabel = (s: Driver["status"]) =>
        s === "active" ? "En tournée" : s === "done" ? "Terminé" : "En retard";
    const statusIcon = (s: Driver["status"]) =>
        s === "active" ? "car" : s === "done" ? "checkmark-circle" : "alert-circle";

    if (loading) {
        return <SkeletonLoader type="list" rows={5} />;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDrivers(); }} tintColor="#ec4899" />}
        >
            {/* Fleet KPIs */}
            <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: "#3b82f6" }]}>
                    <Ionicons name="car-sport" size={20} color="#3b82f6" />
                    <Text style={styles.kpiValue}>{drivers.length}</Text>
                    <Text style={styles.kpiLabel}>Livreurs</Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: "#22c55e" }]}>
                    <Ionicons name="trending-up" size={20} color="#22c55e" />
                    <Text style={styles.kpiValue}>{fmt(summary.totalRevenue)}</Text>
                    <Text style={styles.kpiLabel}>CA Total (DA)</Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: "#a855f7" }]}>
                    <Ionicons name="document-text" size={20} color="#a855f7" />
                    <Text style={styles.kpiValue}>{summary.totalBLs}</Text>
                    <Text style={styles.kpiLabel}>BLs Générés</Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: "#f59e0b" }]}>
                    <Ionicons name="cash" size={20} color="#f59e0b" />
                    <Text style={styles.kpiValue}>{fmt(summary.totalCommissions)}</Text>
                    <Text style={styles.kpiLabel}>Commissions (DA)</Text>
                </View>
            </View>

            {/* Collections Summary */}
            <View style={styles.collectCard}>
                <Ionicons name="wallet-outline" size={18} color="#22c55e" />
                <Text style={styles.collectLabel}>Espèces collectées aujourd'hui :</Text>
                <Text style={styles.collectValue}>{fmt(summary.totalCollections)} DA</Text>
            </View>

            {drivers.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="car-outline" size={56} color="#334155" />
                    <Text style={styles.emptyText}>Aucun livreur actif aujourd'hui</Text>
                    <Text style={styles.emptySubText}>Makan hta chauffeur hna</Text>
                </View>
            ) : (
                <>
                    {/* Sort selector */}
                    <View style={styles.sortRow}>
                        <Text style={styles.sortLabel}>Classement :</Text>
                        {([
                            { k: "revenue" as const, l: "CA" },
                            { k: "blCount" as const, l: "BLs" },
                            { k: "commission" as const, l: "Commission" },
                        ]).map(s => (
                            <TouchableOpacity
                                key={s.k}
                                style={[styles.sortChip, sortKey === s.k && styles.sortChipActive]}
                                onPress={() => setSortKey(s.k)}
                            >
                                <Text style={[styles.sortChipText, sortKey === s.k && { color: "#fff" }]}>{s.l}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>CLASSEMENT LIVREURS</Text>
                    {sorted.map((driver, rank) => {
                        const netSales = driver.revenue - driver.returns;
                        const visitPct = driver.clientsPlanned > 0
                            ? Math.round((driver.clientsVisited / driver.clientsPlanned) * 100) : 0;
                        const isExpanded = selectedDriver?.id === driver.id;
                        const milestoneTarget = MILESTONES[MILESTONES.length - 1].target;
                        const milestoneProgress = Math.min(driver.revenue / milestoneTarget, 1);
                        const currentMilestone = MILESTONES.find(m => driver.revenue < m.target);

                        return (
                            <TouchableOpacity
                                key={driver.id}
                                style={styles.driverCard}
                                onPress={() => setSelectedDriver(isExpanded ? null : driver)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.driverHeader}>
                                    <View style={[styles.rankBadge, {
                                        backgroundColor: rank === 0 ? "#f59e0b20" : rank === 1 ? "#94a3b820" : "#33415530"
                                    }]}>
                                        <Text style={[styles.rankText, {
                                            color: rank === 0 ? "#f59e0b" : rank === 1 ? "#94a3b8" : "#64748b"
                                        }]}>#{rank + 1}</Text>
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <View style={styles.driverNameRow}>
                                            <Text style={styles.driverName}>{driver.name}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(driver.status)}20` }]}>
                                                <Ionicons name={statusIcon(driver.status) as any} size={10} color={statusColor(driver.status)} />
                                                <Text style={[styles.statusText, { color: statusColor(driver.status) }]}>
                                                    {statusLabel(driver.status)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.driverZone}>{driver.zone}</Text>
                                    </View>

                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.driverRevenue}>{fmt(driver.revenue)} DA</Text>
                                        <Text style={styles.driverLastPing}>{driver.lastPing}</Text>
                                    </View>
                                </View>

                                <View style={styles.driverQuickStats}>
                                    <View style={styles.quickStat}>
                                        <Text style={styles.quickStatVal}>{driver.blCount}</Text>
                                        <Text style={styles.quickStatLabel}>BLs</Text>
                                    </View>
                                    <View style={styles.quickStat}>
                                        <Text style={[styles.quickStatVal, { color: "#f59e0b" }]}>
                                            {driver.clientsVisited}/{driver.clientsPlanned}
                                        </Text>
                                        <Text style={styles.quickStatLabel}>Clients</Text>
                                    </View>
                                    <View style={styles.quickStat}>
                                        <Text style={[styles.quickStatVal, { color: "#22c55e" }]}>
                                            +{fmt(driver.commission)} DA
                                        </Text>
                                        <Text style={styles.quickStatLabel}>Commission</Text>
                                    </View>
                                </View>

                                <View style={styles.visitBarTrack}>
                                    <View style={[styles.visitBarFill, {
                                        width: `${visitPct}%`,
                                        backgroundColor: visitPct >= 90 ? "#22c55e" : visitPct >= 60 ? "#f59e0b" : "#ef4444",
                                    }]} />
                                </View>

                                {isExpanded && (
                                    <View style={styles.expandedSection}>
                                        <View style={styles.expandedDivider} />
                                        <View style={styles.milestoneRow}>
                                            {MILESTONES.map((m, mi) => (
                                                <View key={mi} style={styles.milestoneItem}>
                                                    <Text style={[styles.milestoneLabel, { color: driver.revenue >= m.target ? m.color : "#475569" }]}>
                                                        {driver.revenue >= m.target ? "✓" : "○"} {m.label}
                                                    </Text>
                                                    <Text style={styles.milestoneTarget}>{fmt(m.target)} DA</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={styles.milestoneBarTrack}>
                                            <View style={[styles.milestoneBarFill, {
                                                width: `${milestoneProgress * 100}%`,
                                                backgroundColor: currentMilestone?.color || "#f59e0b",
                                            }]} />
                                        </View>
                                        <View style={styles.expandedDetails}>
                                            <View style={styles.expandedRow}>
                                                <Text style={styles.expandedLabel}>Ventes brutes</Text>
                                                <Text style={styles.expandedValue}>{fmt(driver.revenue)} DA</Text>
                                            </View>
                                            <View style={styles.expandedRow}>
                                                <Text style={styles.expandedLabel}>Retours produits</Text>
                                                <Text style={[styles.expandedValue, { color: "#ef4444" }]}>-{fmt(driver.returns)} DA</Text>
                                            </View>
                                            <View style={styles.expandedRow}>
                                                <Text style={styles.expandedLabel}>Ventes nettes</Text>
                                                <Text style={[styles.expandedValue, { color: "#22c55e" }]}>{fmt(netSales)} DA</Text>
                                            </View>
                                            <View style={styles.expandedRow}>
                                                <Text style={styles.expandedLabel}>Espèces collectées</Text>
                                                <Text style={styles.expandedValue}>{fmt(driver.collections)} DA</Text>
                                            </View>
                                            <View style={[styles.expandedRow, { borderBottomWidth: 0 }]}>
                                                <Text style={[styles.expandedLabel, { color: "#22c55e" }]}>Commission (3%)</Text>
                                                <Text style={[styles.expandedValue, { color: "#22c55e", fontWeight: "900" }]}>
                                                    {fmt(driver.commission)} DA
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0f1e", gap: 12 },
    loadingText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
    emptyState: { alignItems: "center", padding: 48, gap: 12 },
    emptyText: { color: "#64748b", fontSize: 16, fontWeight: "700" },
    emptySubText: { color: "#475569", fontSize: 12, textAlign: "center", lineHeight: 18 },

    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingTop: 16 },
    kpiCard: { width: "47%", backgroundColor: "#1e293b", borderRadius: 14, padding: 14, borderLeftWidth: 3, gap: 6 },
    kpiValue: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
    kpiLabel: { color: "#64748b", fontSize: 10, fontWeight: "600" },

    collectCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#22c55e15", marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#22c55e30" },
    collectLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600", flex: 1 },
    collectValue: { color: "#22c55e", fontSize: 15, fontWeight: "900" },

    sortRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginTop: 16 },
    sortLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
    sortChipActive: { backgroundColor: "#ec4899", borderColor: "#ec4899" },
    sortChipText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },

    driverCard: { backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
    driverHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    rankBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    rankText: { fontSize: 13, fontWeight: "900" },
    driverNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    driverName: { color: "#f8fafc", fontSize: 15, fontWeight: "800" },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: "700" },
    driverZone: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 2 },
    driverRevenue: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
    driverLastPing: { color: "#475569", fontSize: 9, fontWeight: "600", marginTop: 2 },

    driverQuickStats: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#0a0f1e", borderRadius: 12, paddingVertical: 10 },
    quickStat: { alignItems: "center" },
    quickStatVal: { color: "#f8fafc", fontSize: 14, fontWeight: "900" },
    quickStatLabel: { color: "#64748b", fontSize: 9, fontWeight: "600", marginTop: 2 },

    visitBarTrack: { height: 5, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden" },
    visitBarFill: { height: "100%", borderRadius: 3 },

    expandedSection: { gap: 12 },
    expandedDivider: { height: 1, backgroundColor: "#334155" },
    milestoneRow: { flexDirection: "row", justifyContent: "space-around" },
    milestoneItem: { alignItems: "center" },
    milestoneLabel: { fontSize: 11, fontWeight: "800" },
    milestoneTarget: { color: "#64748b", fontSize: 9, fontWeight: "600", marginTop: 2 },
    milestoneBarTrack: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden" },
    milestoneBarFill: { height: "100%", borderRadius: 3 },

    expandedDetails: { backgroundColor: "#0a0f1e", borderRadius: 12, padding: 12, gap: 0 },
    expandedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#33415540" },
    expandedLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
    expandedValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
});
