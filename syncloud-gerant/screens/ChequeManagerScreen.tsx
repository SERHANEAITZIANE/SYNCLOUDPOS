import React, { useState } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Alert, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

type ChequeType = "reçu" | "émis";
type ChequeStatus = "en_attente" | "encaissé" | "rejeté" | "annulé";

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
}

const CHEQUES: Cheque[] = [
    { id: "1", type: "reçu", number: "CHQ-00482", bank: "BNA Annaba", amount: 250000, issuerOrBeneficiary: "Supérette Horizon", issueDate: "10/05/2026", maturityDate: "10/06/2026", daysUntilMaturity: 15, status: "en_attente" },
    { id: "2", type: "reçu", number: "CHQ-00391", bank: "CPA Annaba", amount: 185000, issuerOrBeneficiary: "Alimentation El Hanaa", issueDate: "15/05/2026", maturityDate: "15/06/2026", daysUntilMaturity: 20, status: "en_attente" },
    { id: "3", type: "reçu", number: "CHQ-00274", bank: "BADR El Hadjar", amount: 120000, issuerOrBeneficiary: "Café du Centre", issueDate: "01/05/2026", maturityDate: "01/06/2026", daysUntilMaturity: 6, status: "en_attente" },
    { id: "4", type: "émis", number: "CHQ-E1045", bank: "BNA Annaba (Notre)", amount: 420000, issuerOrBeneficiary: "SPA Ramy Boissons", issueDate: "05/05/2026", maturityDate: "05/06/2026", daysUntilMaturity: 10, status: "en_attente" },
    { id: "5", type: "reçu", number: "CHQ-00180", bank: "CPA Sidi Amar", amount: 75000, issuerOrBeneficiary: "Mini Market Étoile", issueDate: "20/04/2026", maturityDate: "20/05/2026", daysUntilMaturity: -5, status: "encaissé" },
    { id: "6", type: "émis", number: "CHQ-E0988", bank: "BNA Annaba (Notre)", amount: 180000, issuerOrBeneficiary: "Groupe CEVITAL", issueDate: "10/04/2026", maturityDate: "10/05/2026", daysUntilMaturity: -15, status: "encaissé" },
    { id: "7", type: "reçu", number: "CHQ-00095", bank: "BADR Annaba", amount: 92000, issuerOrBeneficiary: "Magasin Yasmine", issueDate: "15/03/2026", maturityDate: "15/04/2026", daysUntilMaturity: -40, status: "rejeté" },
];

const STATUS_CFG: Record<ChequeStatus, { color: string; label: string; icon: string }> = {
    en_attente: { color: "#f59e0b", label: "En attente", icon: "time-outline" },
    encaissé: { color: "#22c55e", label: "Encaissé", icon: "checkmark-circle" },
    rejeté: { color: "#ef4444", label: "Rejeté ⚠", icon: "close-circle" },
    annulé: { color: "#64748b", label: "Annulé", icon: "ban-outline" },
};

export default function ChequeManagerScreen() {
    const [cheques, setCheques] = useState(CHEQUES);
    const [filter, setFilter] = useState<ChequeType | "tous">("tous");
    const [statusFilter, setStatusFilter] = useState<ChequeStatus | "tous">("tous");

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const filtered = cheques
        .filter(c => filter === "tous" || c.type === filter)
        .filter(c => statusFilter === "tous" || c.status === statusFilter);

    const totalReceivable = cheques.filter(c => c.type === "reçu" && c.status === "en_attente").reduce((s, c) => s + c.amount, 0);
    const totalPayable = cheques.filter(c => c.type === "émis" && c.status === "en_attente").reduce((s, c) => s + c.amount, 0);
    const urgentCount = cheques.filter(c => c.status === "en_attente" && c.daysUntilMaturity <= 7).length;
    const rejectedCount = cheques.filter(c => c.status === "rejeté").length;

    const handleMarkEncaisse = (id: string) => {
        Alert.alert("Confirmer l'encaissement", "Marquer ce chèque comme encaissé ?", [
            { text: "Annuler", style: "cancel" },
            {
                text: "Confirmer",
                onPress: () => setCheques(prev => prev.map(c => c.id === id ? { ...c, status: "encaissé" as ChequeStatus } : c)),
            },
        ]);
    };

    const urgencyColor = (days: number) => {
        if (days < 0) return "#64748b";
        if (days <= 3) return "#ef4444";
        if (days <= 7) return "#f59e0b";
        return "#22c55e";
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Summary row */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderLeftColor: "#22c55e" }]}>
                    <Text style={styles.summaryLabel}>À encaisser</Text>
                    <Text style={[styles.summaryValue, { color: "#22c55e" }]}>{fmt(totalReceivable)} DA</Text>
                    <Text style={styles.summarySub}>{cheques.filter(c => c.type === "reçu" && c.status === "en_attente").length} chèques reçus</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: "#ef4444" }]}>
                    <Text style={styles.summaryLabel}>À payer</Text>
                    <Text style={[styles.summaryValue, { color: "#ef4444" }]}>{fmt(totalPayable)} DA</Text>
                    <Text style={styles.summarySub}>{cheques.filter(c => c.type === "émis" && c.status === "en_attente").length} chèques émis</Text>
                </View>
            </View>

            {/* Alert badges */}
            {(urgentCount > 0 || rejectedCount > 0) && (
                <View style={styles.alertsRow}>
                    {urgentCount > 0 && (
                        <View style={styles.alertPill}>
                            <Ionicons name="alarm" size={14} color="#f59e0b" />
                            <Text style={styles.alertPillText}>{urgentCount} chèques arrivent à échéance dans 7 jours</Text>
                        </View>
                    )}
                    {rejectedCount > 0 && (
                        <View style={[styles.alertPill, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
                            <Ionicons name="close-circle" size={14} color="#ef4444" />
                            <Text style={[styles.alertPillText, { color: "#ef4444" }]}>{rejectedCount} chèque(s) rejeté(s) — action requise</Text>
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
                {(["tous", "en_attente", "encaissé", "rejeté"] as const).map(s => {
                    const label = s === "tous" ? "Tous statuts" : STATUS_CFG[s].label;
                    return (
                        <TouchableOpacity
                            key={s}
                            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                            onPress={() => setStatusFilter(s)}
                        >
                            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Cheque List */}
            <Text style={styles.sectionTitle}>
                {filtered.length} CHÈQUE{filtered.length !== 1 ? "S" : ""}
            </Text>
            {filtered.map((cheque) => {
                const cfg = STATUS_CFG[cheque.status];
                return (
                    <View key={cheque.id} style={styles.chequeCard}>
                        {/* Type indicator */}
                        <View style={[styles.typeStrip, {
                            backgroundColor: cheque.type === "reçu" ? "#22c55e" : "#ef4444",
                        }]} />

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

                            {/* Action */}
                            {cheque.status === "en_attente" && cheque.type === "reçu" && (
                                <TouchableOpacity style={styles.encaisseBtn} onPress={() => handleMarkEncaisse(cheque.id)}>
                                    <Ionicons name="checkmark-done" size={14} color="#fff" />
                                    <Text style={styles.encaisseBtnText}>Marquer Encaissé</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },

    summaryRow: { flexDirection: "row", gap: 10, padding: 16 },
    summaryCard: {
        flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 14, borderLeftWidth: 4, gap: 4,
    },
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

    filterRow: {
        flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, marginBottom: 4,
    },
    filterChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    filterChipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
    filterText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
    filterTextActive: { color: "#fff" },
    filterSep: { width: "100%" },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 8, marginBottom: 10,
    },

    chequeCard: {
        flexDirection: "row", backgroundColor: "#1e293b",
        marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
        overflow: "hidden",
    },
    typeStrip: { width: 4 },
    chequeContent: { flex: 1, padding: 14, gap: 10 },
    chequeTop: { flexDirection: "row", justifyContent: "space-between" },
    chequeMeta: { gap: 4 },
    chequeTypeBadge: {
        flexDirection: "row", alignItems: "center", gap: 3,
        alignSelf: "flex-start",
    },
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
    encaisseBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 5, backgroundColor: "#22c55e", borderRadius: 9, paddingVertical: 7,
    },
    encaisseBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
