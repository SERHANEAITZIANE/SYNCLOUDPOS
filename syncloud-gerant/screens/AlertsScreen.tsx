import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet,
    ActivityIndicator, RefreshControl, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

interface Alert {
    type: string;
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    data?: any[];
}

interface AlertsData {
    alertCount: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    alerts: Alert[];
}

const SEVERITY_CONFIG = {
    critical: { color: "#ef4444", bg: "#ef444415", icon: "alert-circle" as const, label: "CRITIQUE" },
    warning: { color: "#f59e0b", bg: "#f59e0b15", icon: "warning" as const, label: "ATTENTION" },
    info: { color: "#3b82f6", bg: "#3b82f615", icon: "information-circle" as const, label: "INFO" },
};

const TYPE_ICONS: Record<string, any> = {
    STOCK_RUPTURE: "cube-outline",
    LOW_STOCK: "warning-outline",
    CRITICAL_DEBT: "people-outline",
    EXPIRING_PROMO: "pricetag-outline",
    PENDING_SUPPLIER_RETURN: "return-up-back-outline",
    LARGE_UNPAID: "receipt-outline",
};

export default function AlertsScreen() {
    const [data, setData] = useState<AlertsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const fetchAlerts = useCallback(async () => {
        try {
            const result = await apiFetch("/gerant/alerts");
            setData(result);
        } catch (e) {
            console.error("[Alerts]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loadingText}>Analyse en cours...</Text>
            </View>
        );
    }

    const noAlerts = !data || data.alertCount === 0;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => {
                    setRefreshing(true);
                    fetchAlerts();
                }} tintColor="#ef4444" />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Ionicons name="notifications" size={24} color="#ef4444" />
                    <Text style={styles.headerTitle}>Alertes Intelligentes</Text>
                </View>
                <Text style={styles.headerSubtitle}>Surveillance en temps réel de votre entreprise</Text>
            </View>

            {/* Summary badges */}
            {data && (
                <View style={styles.summaryRow}>
                    <View style={[styles.badge, { backgroundColor: "#ef444420", borderColor: "#ef4444" }]}>
                        <Text style={[styles.badgeNum, { color: "#ef4444" }]}>{data.criticalCount}</Text>
                        <Text style={[styles.badgeLabel, { color: "#ef4444" }]}>Critiques</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b" }]}>
                        <Text style={[styles.badgeNum, { color: "#f59e0b" }]}>{data.warningCount}</Text>
                        <Text style={[styles.badgeLabel, { color: "#f59e0b" }]}>Attention</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: "#3b82f620", borderColor: "#3b82f6" }]}>
                        <Text style={[styles.badgeNum, { color: "#3b82f6" }]}>{data.infoCount}</Text>
                        <Text style={[styles.badgeLabel, { color: "#3b82f6" }]}>Info</Text>
                    </View>
                </View>
            )}

            {/* No alerts state */}
            {noAlerts && (
                <View style={styles.noAlertsCard}>
                    <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
                    <Text style={styles.noAlertsTitle}>Tout va bien !</Text>
                    <Text style={styles.noAlertsSubtitle}>
                        Aucune alerte détectée. Votre entreprise est en bonne santé.
                    </Text>
                    <Text style={styles.noAlertsAr}>ما كاين حتى مشكل — كل شي بخير ✅</Text>
                </View>
            )}

            {/* Alert list */}
            {data?.alerts.map((alert, i) => {
                const cfg = SEVERITY_CONFIG[alert.severity];
                const icon = TYPE_ICONS[alert.type] || "alert-circle-outline";
                const expanded = expandedIndex === i;

                return (
                    <TouchableOpacity
                        key={i}
                        style={[styles.alertCard, { borderLeftColor: cfg.color, backgroundColor: cfg.bg }]}
                        onPress={() => setExpandedIndex(expanded ? null : i)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.alertHeader}>
                            <View style={styles.alertLeft}>
                                <View style={[styles.alertIconCircle, { backgroundColor: `${cfg.color}25` }]}>
                                    <Ionicons name={icon} size={20} color={cfg.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.alertTitleRow}>
                                        <View style={[styles.severityBadge, { backgroundColor: cfg.color }]}>
                                            <Text style={styles.severityText}>{cfg.label}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.alertTitle}>{alert.title}</Text>
                                    <Text style={styles.alertMessage} numberOfLines={expanded ? undefined : 2}>
                                        {alert.message}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons
                                name={expanded ? "chevron-up" : "chevron-down"}
                                size={16}
                                color="#64748b"
                            />
                        </View>

                        {/* Expanded detail */}
                        {expanded && alert.data && alert.data.length > 0 && (
                            <View style={styles.detailBox}>
                                {alert.data.slice(0, 5).map((item: any, j: number) => (
                                    <View key={j} style={styles.detailRow}>
                                        <Ionicons name="chevron-forward" size={12} color="#64748b" />
                                        <Text style={styles.detailText}>
                                            {item.name || item.supplier || item.customer || item.receipt || "—"}
                                            {item.debt ? `  →  ${item.debt.toLocaleString("fr-FR")} DA` : ""}
                                            {item.stock !== undefined ? `  →  ${item.stock} en stock` : ""}
                                            {item.remaining ? `  →  Reste: ${item.remaining.toLocaleString("fr-FR")} DA` : ""}
                                            {item.amount ? `  →  ${item.amount.toLocaleString("fr-FR")} DA` : ""}
                                        </Text>
                                    </View>
                                ))}
                                {alert.data.length > 5 && (
                                    <Text style={styles.moreText}>+ {alert.data.length - 5} autres...</Text>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0f1e", gap: 12 },
    loadingText: { color: "#64748b", fontSize: 14 },

    header: { padding: 16, paddingTop: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "900" },
    headerSubtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },

    summaryRow: {
        flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8,
    },
    badge: {
        flex: 1, borderRadius: 12, borderWidth: 1,
        paddingVertical: 10, alignItems: "center",
    },
    badgeNum: { fontSize: 24, fontWeight: "900" },
    badgeLabel: { fontSize: 10, fontWeight: "700", marginTop: 2 },

    noAlertsCard: {
        margin: 16, padding: 32, backgroundColor: "#1e293b",
        borderRadius: 20, alignItems: "center", gap: 12,
    },
    noAlertsTitle: { color: "#22c55e", fontSize: 22, fontWeight: "900" },
    noAlertsSubtitle: { color: "#94a3b8", fontSize: 14, textAlign: "center", lineHeight: 20 },
    noAlertsAr: { color: "#475569", fontSize: 13, fontStyle: "italic", textAlign: "center" },

    alertCard: {
        marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
        borderLeftWidth: 4, padding: 14,
    },
    alertHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    alertLeft: { flexDirection: "row", gap: 10, flex: 1 },
    alertIconCircle: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: "center", alignItems: "center",
    },
    alertTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    severityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    severityText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
    alertTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "800", marginTop: 2, marginBottom: 3 },
    alertMessage: { color: "#94a3b8", fontSize: 12, lineHeight: 17 },

    detailBox: {
        marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: "#334155", gap: 6,
    },
    detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
    detailText: { color: "#cbd5e1", fontSize: 12, flex: 1, lineHeight: 16 },
    moreText: { color: "#475569", fontSize: 11, fontStyle: "italic", marginTop: 4 },
});
