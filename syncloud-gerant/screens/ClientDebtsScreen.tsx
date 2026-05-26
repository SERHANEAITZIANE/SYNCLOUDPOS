import React, { useState } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Alert, Linking, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AgingBucket = "0-30" | "30-60" | "60-90" | "90+";

interface ClientDebt {
    id: string;
    name: string;
    phone: string;
    totalDebt: number;
    aging: AgingBucket;
    lastPaymentDate: string;
    daysOverdue: number;
    status: "normal" | "warned" | "critical";
}

const MOCK_DEBTS: ClientDebt[] = [
    { id: "1", name: "Supérette Horizon", phone: "+213555123456", totalDebt: 32000, aging: "90+", lastPaymentDate: "12/02/2026", daysOverdue: 103, status: "critical" },
    { id: "2", name: "Alimentation El Hanaa", phone: "+213555234567", totalDebt: 15000, aging: "60-90", lastPaymentDate: "08/03/2026", daysOverdue: 78, status: "critical" },
    { id: "3", name: "Café du Centre", phone: "+213555345678", totalDebt: 12000, aging: "30-60", lastPaymentDate: "28/03/2026", daysOverdue: 58, status: "warned" },
    { id: "4", name: "Epicerie La Source", phone: "+213555456789", totalDebt: 6000, aging: "30-60", lastPaymentDate: "15/04/2026", daysOverdue: 40, status: "warned" },
    { id: "5", name: "Mini Market Étoile", phone: "+213555567890", totalDebt: 8500, aging: "0-30", lastPaymentDate: "05/05/2026", daysOverdue: 20, status: "normal" },
    { id: "6", name: "Dépôt El Baraka", phone: "+213555678901", totalDebt: 4200, aging: "0-30", lastPaymentDate: "12/05/2026", daysOverdue: 13, status: "normal" },
    { id: "7", name: "Magasin Yasmine", phone: "+213555789012", totalDebt: 18700, aging: "90+", lastPaymentDate: "25/01/2026", daysOverdue: 120, status: "critical" },
    { id: "8", name: "Café El Mawrid", phone: "+213555890123", totalDebt: 3200, aging: "0-30", lastPaymentDate: "18/05/2026", daysOverdue: 7, status: "normal" },
];

const AGING_COLORS: Record<AgingBucket, string> = {
    "0-30": "#22c55e",
    "30-60": "#f59e0b",
    "60-90": "#f97316",
    "90+": "#ef4444",
};

export default function ClientDebtsScreen() {
    const [filter, setFilter] = useState<AgingBucket | "all">("all");
    const [debts, setDebts] = useState(MOCK_DEBTS);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const filtered = filter === "all" ? debts : debts.filter(d => d.aging === filter);

    // Aging summary
    const agingSummary = {
        "0-30": debts.filter(d => d.aging === "0-30").reduce((s, d) => s + d.totalDebt, 0),
        "30-60": debts.filter(d => d.aging === "30-60").reduce((s, d) => s + d.totalDebt, 0),
        "60-90": debts.filter(d => d.aging === "60-90").reduce((s, d) => s + d.totalDebt, 0),
        "90+": debts.filter(d => d.aging === "90+").reduce((s, d) => s + d.totalDebt, 0),
    };
    const totalDebt = debts.reduce((s, d) => s + d.totalDebt, 0);
    const maxBucket = Math.max(...Object.values(agingSummary));

    const handleWhatsAppReminder = (client: ClientDebt) => {
        const message = encodeURIComponent(
            `Bonjour, nous vous rappelons aimablement que votre solde impayé de ${fmt(client.totalDebt)} DA est en attente depuis ${client.daysOverdue} jours. Merci de régulariser votre situation. — SynCloudPOS`
        );
        const url = `whatsapp://send?phone=${client.phone}&text=${message}`;
        Linking.openURL(url).catch(() => {
            Alert.alert("Erreur", "WhatsApp n'est pas installé sur cet appareil.");
        });
    };

    const handleCall = (client: ClientDebt) => {
        Linking.openURL(`tel:${client.phone}`);
    };

    const handleMarkPaid = (clientId: string) => {
        Alert.alert(
            "Confirmer l'encaissement",
            "Marquer cette créance comme totalement payée ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Oui, Encaissé",
                    style: "destructive",
                    onPress: () => {
                        setDebts(prev => prev.filter(d => d.id !== clientId));
                        Alert.alert("✓ Succès", "Créance encaissée avec succès !");
                    }
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Total Debt Summary */}
            <View style={styles.totalCard}>
                <View style={styles.totalHeader}>
                    <Ionicons name="warning" size={22} color="#f59e0b" />
                    <Text style={styles.totalTitle}>Créances Clients Totales</Text>
                </View>
                <Text style={styles.totalValue}>{fmt(totalDebt)} DA</Text>
                <Text style={styles.totalSub}>{debts.length} clients débiteurs</Text>
            </View>

            {/* Aging Breakdown Bars */}
            <Text style={styles.sectionTitle}>RAPPORT D'ÂGE DES CRÉANCES</Text>
            <View style={styles.agingCard}>
                {(["0-30", "30-60", "60-90", "90+"] as AgingBucket[]).map(bucket => {
                    const amount = agingSummary[bucket];
                    const barWidth = maxBucket > 0 ? (amount / maxBucket) * 100 : 0;
                    const count = debts.filter(d => d.aging === bucket).length;
                    return (
                        <TouchableOpacity
                            key={bucket}
                            style={[styles.agingRow, filter === bucket && styles.agingRowActive]}
                            onPress={() => setFilter(filter === bucket ? "all" : bucket)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.agingLeft}>
                                <View style={[styles.agingDot, { backgroundColor: AGING_COLORS[bucket] }]} />
                                <Text style={styles.agingLabel}>{bucket} jours</Text>
                                <View style={styles.agingCountBadge}>
                                    <Text style={styles.agingCountText}>{count}</Text>
                                </View>
                            </View>
                            <View style={styles.agingBarTrack}>
                                <View style={[styles.agingBarFill, {
                                    width: `${barWidth}%`,
                                    backgroundColor: AGING_COLORS[bucket],
                                }]} />
                            </View>
                            <Text style={[styles.agingAmount, { color: AGING_COLORS[bucket] }]}>
                                {fmt(amount)} DA
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Filter indicator */}
            {filter !== "all" && (
                <TouchableOpacity style={styles.filterBadge} onPress={() => setFilter("all")}>
                    <Ionicons name="funnel" size={14} color="#3b82f6" />
                    <Text style={styles.filterText}>Filtre : {filter} jours</Text>
                    <Ionicons name="close-circle" size={16} color="#64748b" />
                </TouchableOpacity>
            )}

            {/* Client Debt Cards */}
            <Text style={styles.sectionTitle}>
                {filter === "all" ? "TOUS LES DÉBITEURS" : `DÉBITEURS ${filter} JOURS`} ({filtered.length})
            </Text>

            {filtered.map(client => (
                <View key={client.id} style={styles.clientCard}>
                    {/* Header */}
                    <View style={styles.clientHeader}>
                        <View style={[styles.clientStatusDot, {
                            backgroundColor: client.status === "critical" ? "#ef4444"
                                : client.status === "warned" ? "#f59e0b" : "#22c55e"
                        }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.clientName}>{client.name}</Text>
                            <Text style={styles.clientPhone}>{client.phone}</Text>
                        </View>
                        <View style={styles.clientAmountWrap}>
                            <Text style={[styles.clientAmount, { color: AGING_COLORS[client.aging] }]}>
                                {fmt(client.totalDebt)} DA
                            </Text>
                            <View style={[styles.agingTag, { backgroundColor: `${AGING_COLORS[client.aging]}20` }]}>
                                <Text style={[styles.agingTagText, { color: AGING_COLORS[client.aging] }]}>
                                    {client.daysOverdue}j
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Meta */}
                    <View style={styles.clientMeta}>
                        <Text style={styles.clientMetaText}>
                            Dernier paiement : {client.lastPaymentDate}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.clientActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleWhatsAppReminder(client)}
                        >
                            <Ionicons name="logo-whatsapp" size={16} color="#22c55e" />
                            <Text style={[styles.actionText, { color: "#22c55e" }]}>Relancer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleCall(client)}
                        >
                            <Ionicons name="call-outline" size={16} color="#3b82f6" />
                            <Text style={[styles.actionText, { color: "#3b82f6" }]}>Appeler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPay]}
                            onPress={() => handleMarkPaid(client.id)}
                        >
                            <Ionicons name="checkmark-done" size={16} color="#fff" />
                            <Text style={[styles.actionText, { color: "#fff" }]}>Encaisser</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },

    // Total summary
    totalCard: {
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20,
        padding: 20, alignItems: "center",
        borderWidth: 1, borderColor: "#f59e0b30",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    totalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    totalTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    totalValue: { color: "#f59e0b", fontSize: 32, fontWeight: "900" },
    totalSub: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 4 },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
    },

    // Aging breakdown
    agingCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16,
        padding: 16, gap: 12,
    },
    agingRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingVertical: 4, paddingHorizontal: 4, borderRadius: 8,
    },
    agingRowActive: { backgroundColor: "#33415540" },
    agingLeft: { flexDirection: "row", alignItems: "center", gap: 6, width: 100 },
    agingDot: { width: 8, height: 8, borderRadius: 4 },
    agingLabel: { color: "#f8fafc", fontSize: 12, fontWeight: "600" },
    agingCountBadge: {
        backgroundColor: "#0f172a", paddingHorizontal: 5, paddingVertical: 1,
        borderRadius: 4,
    },
    agingCountText: { color: "#94a3b8", fontSize: 9, fontWeight: "700" },
    agingBarTrack: {
        flex: 1, height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden",
    },
    agingBarFill: { height: "100%", borderRadius: 4 },
    agingAmount: { fontSize: 12, fontWeight: "800", width: 80, textAlign: "right" },

    // Filter badge
    filterBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        alignSelf: "flex-start", marginLeft: 16, marginTop: 8,
        backgroundColor: "#3b82f615", paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1, borderColor: "#3b82f630",
    },
    filterText: { color: "#3b82f6", fontSize: 11, fontWeight: "700" },

    // Client cards
    clientCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 10,
        borderRadius: 16, padding: 16, gap: 12,
    },
    clientHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    clientStatusDot: { width: 10, height: 10, borderRadius: 5 },
    clientName: { color: "#f8fafc", fontSize: 15, fontWeight: "800" },
    clientPhone: { color: "#64748b", fontSize: 11, marginTop: 2 },
    clientAmountWrap: { alignItems: "flex-end" },
    clientAmount: { fontSize: 16, fontWeight: "900" },
    agingTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    agingTagText: { fontSize: 10, fontWeight: "800" },
    clientMeta: {
        backgroundColor: "#0f172a", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    },
    clientMetaText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },

    // Action buttons
    clientActions: { flexDirection: "row", gap: 8 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, paddingVertical: 8, borderRadius: 10,
        backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155",
    },
    actionBtnPay: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    actionText: { fontSize: 11, fontWeight: "700" },
});
