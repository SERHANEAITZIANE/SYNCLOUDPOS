import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import SkeletonLoader from "../components/SkeletonLoader";

type ChequeStatus = "en_attente" | "encaissé" | "rejeté" | "annulé";
type ChequeType = "reçu" | "émis";

interface Cheque {
    id: string;
    type: ChequeType;
    number: string;
    bank: string;
    amount: number;
    issuerOrBeneficiary: string;
    issueDate: string;
    maturityDate: string;
    daysUntilMaturity: number;
    status: ChequeStatus;
    phone?: string | null;
}

interface Summary {
    totalReceivable: number;
    totalPayable: number;
    urgentCount: number;
    rejectedCount: number;
}

const STATUS_CFG: Record<ChequeStatus, { color: string; label: string; icon: string }> = {
    en_attente: { color: "#f59e0b", label: "En attente", icon: "time-outline" },
    encaissé: { color: "#22c55e", label: "Encaissé", icon: "checkmark-circle" },
    rejeté: { color: "#ef4444", label: "Rejeté ⚠", icon: "close-circle" },
    annulé: { color: "#64748b", label: "Annulé", icon: "ban-outline" },
};

export default function ChequeManagerScreen() {
    const [cheques, setCheques] = useState<Cheque[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalReceivable: 0, totalPayable: 0, urgentCount: 0, rejectedCount: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<ChequeType | "tous">("tous");
    const [statusFilter, setStatusFilter] = useState<ChequeStatus | "tous">("tous");

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const fetchCheques = useCallback(async () => {
        try {
            const data = await apiFetch("/gerant/cheques");
            setCheques(data.cheques || []);
            setSummary(data.summary || { totalReceivable: 0, totalPayable: 0, urgentCount: 0, rejectedCount: 0 });
        } catch (e) {
            console.error("[Cheques]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchCheques(); }, [fetchCheques]);

    const handleMarkEncaisse = (id: string) => {
        Alert.alert("Confirmer l'encaissement", "Marquer ce chèque comme encaissé ?", [
            { text: "Annuler", style: "cancel" },
            {
                text: "Confirmer",
                onPress: async () => {
                    try {
                        await apiFetch("/gerant/cheques", {
                            method: "PATCH",
                            body: JSON.stringify({ id, status: "encaissé" }),
                        });
                        setCheques(prev => prev.map(c => c.id === id ? { ...c, status: "encaissé" } : c));
                    } catch (e) {
                        Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
                    }
                },
            },
        ]);
    };

    const urgencyColor = (days: number) => {
        if (days < 0) return "#64748b";
        if (days <= 3) return "#ef4444";
        if (days <= 7) return "#f59e0b";
        return "#22c55e";
    };

    const filtered = cheques
        .filter(c => filter === "tous" || c.type === filter)
        .filter(c => statusFilter === "tous" || c.status === statusFilter);

    if (loading) {
        return <SkeletonLoader type="list" rows={5} />;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCheques(); }} tintColor="#6366f1" />}
        >
            {/* Summary row */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderLeftColor: "#22c55e" }]}>
                    <Text style={styles.summaryLabel}>À encaisser</Text>
                    <Text style={[styles.summaryValue, { color: "#22c55e" }]}>{fmt(summary.totalReceivable)} DA</Text>
                    <Text style={styles.summarySub}>{cheques.filter(c => c.type === "reçu" && c.status === "en_attente").length} chèques reçus</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: "#ef4444" }]}>
                    <Text style={styles.summaryLabel}>À payer</Text>
                    <Text style={[styles.summaryValue, { color: "#ef4444" }]}>{fmt(summary.totalPayable)} DA</Text>
                    <Text style={styles.summarySub}>{cheques.filter(c => c.type === "émis" && c.status === "en_attente").length} chèques émis</Text>
                </View>
            </View>

            {/* Alert badges */}
            {(summary.urgentCount > 0 || summary.rejectedCount > 0) && (
                <View style={styles.alertsRow}>
                    {summary.urgentCount > 0 && (
                        <View style={styles.alertPill}>
                            <Ionicons name="alarm" size={14} color="#f59e0b" />
                            <Text style={styles.alertPillText}>{summary.urgentCount} chèques arrivent à échéance dans 7 jours</Text>
                        </View>
                    )}
                    {summary.rejectedCount > 0 && (
                        <View style={[styles.alertPill, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
                            <Ionicons name="close-circle" size={14} color="#ef4444" />
                            <Text style={[styles.alertPillText, { color: "#ef4444" }]}>{summary.rejectedCount} chèque(s) rejeté(s) — action requise</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Filters */}
            <View style={styles.filterRow}>
                {(["tous", "reçu", "émis"] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === "tous" ? "Tous" : f === "reçu" ? "📥 Reçus" : "📤 Émis"}
                        </Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.filterSep} />
                {(["tous", "en_attente", "encaissé", "rejeté"] as const).map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                        onPress={() => setStatusFilter(s)}
                    >
                        <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                            {s === "tous" ? "Tous statuts" : STATUS_CFG[s].label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Cheque List */}
            <Text style={styles.sectionTitle}>
                {filtered.length} CHÈQUE{filtered.length !== 1 ? "S" : ""}
            </Text>

            {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color="#334155" />
                    <Text style={styles.emptyText}>Aucun chèque trouvé</Text>
                    <Text style={styles.emptySubText}>Makan hta chek hna</Text>
                </View>
            ) : (
                filtered.map((cheque) => {
                    const cfg = STATUS_CFG[cheque.status];
                    return (
                        <View key={cheque.id} style={styles.chequeCard}>
                            <View style={[styles.typeStrip, { backgroundColor: cheque.type === "reçu" ? "#22c55e" : "#ef4444" }]} />
                            <View style={styles.chequeContent}>
                                <View style={styles.chequeTop}>
                                    <View style={styles.chequeMeta}>
                                        <View style={styles.chequeTypeBadge}>
                                            <Ionicons
                                                name={cheque.type === "reçu" ? "arrow-down" : "arrow-up"}
                                                size={10}
                                                color={cheque.type === "reçu" ? "#22c55e" : "#ef4444"}
                                            />
                                            <Text style={[styles.chequeTypeText, { color: cheque.type === "reçu" ? "#22c55e" : "#ef4444" }]}>
                                                {cheque.type === "reçu" ? "Reçu" : "Émis"}
                                            </Text>
                                        </View>
                                        <Text style={styles.chequeNumber}>{cheque.number}</Text>
                                        <Text style={styles.chequeBank}>{cheque.bank}</Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.chequeAmount}>{fmt(cheque.amount)} DA</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.chequeDivider} />

                                <View style={styles.chequeDetails}>
                                    <View style={styles.chequeDetailItem}>
                                        <Text style={styles.chequeDetailLabel}>
                                            {cheque.type === "reçu" ? "Émetteur" : "Bénéficiaire"}
                                        </Text>
                                        <Text style={styles.chequeDetailValue}>{cheque.issuerOrBeneficiary}</Text>
                                    </View>
                                    <View style={styles.chequeDetailItem}>
                                        <Text style={styles.chequeDetailLabel}>Émission</Text>
                                        <Text style={styles.chequeDetailValue}>{cheque.issueDate}</Text>
                                    </View>
                                    <View style={styles.chequeDetailItem}>
                                        <Text style={styles.chequeDetailLabel}>Échéance</Text>
                                        <Text style={[styles.chequeDetailValue, { color: urgencyColor(cheque.daysUntilMaturity) }]}>
                                            {cheque.maturityDate}
                                            {cheque.status === "en_attente" && (
                                                cheque.daysUntilMaturity > 0
                                                    ? ` (${cheque.daysUntilMaturity}j)`
                                                    : ` (${Math.abs(cheque.daysUntilMaturity)}j dépassé)`
                                            )}
                                        </Text>
                                    </View>
                                </View>

                                {cheque.status === "en_attente" && cheque.type === "reçu" && (
                                    <TouchableOpacity style={styles.encaisseBtn} onPress={() => handleMarkEncaisse(cheque.id)}>
                                        <Ionicons name="checkmark-done" size={14} color="#fff" />
                                        <Text style={styles.encaisseBtnText}>Marquer Encaissé</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0f1e", gap: 12 },
    loadingText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

    summaryRow: { flexDirection: "row", gap: 10, padding: 16 },
    summaryCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 14, borderLeftWidth: 4, gap: 4 },
    summaryLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    summaryValue: { fontSize: 18, fontWeight: "900" },
    summarySub: { color: "#475569", fontSize: 10, fontWeight: "600" },

    alertsRow: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    alertPill: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#f59e0b15", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: "#f59e0b30",
    },
    alertPillText: { color: "#f59e0b", fontSize: 11, fontWeight: "700", flex: 1 },

    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, marginBottom: 4 },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
    filterChipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
    filterText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
    filterTextActive: { color: "#fff" },
    filterSep: { width: "100%" },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 8, marginBottom: 10 },

    emptyState: { alignItems: "center", padding: 48, gap: 12 },
    emptyText: { color: "#64748b", fontSize: 16, fontWeight: "700" },
    emptySubText: { color: "#475569", fontSize: 12, textAlign: "center" },

    chequeCard: { flexDirection: "row", backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: "hidden" },
    typeStrip: { width: 4 },
    chequeContent: { flex: 1, padding: 14, gap: 10 },
    chequeTop: { flexDirection: "row", justifyContent: "space-between" },
    chequeMeta: { gap: 4 },
    chequeTypeBadge: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start" },
    chequeTypeText: { fontSize: 10, fontWeight: "800" },
    chequeNumber: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
    chequeBank: { color: "#64748b", fontSize: 10, fontWeight: "600" },
    chequeAmount: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: "800" },
    chequeDivider: { height: 1, backgroundColor: "#33415560" },
    chequeDetails: { flexDirection: "row", justifyContent: "space-between" },
    chequeDetailItem: { gap: 2 },
    chequeDetailLabel: { color: "#64748b", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    chequeDetailValue: { color: "#f8fafc", fontSize: 12, fontWeight: "700" },
    encaisseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#22c55e", borderRadius: 9, paddingVertical: 7 },
    encaisseBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
