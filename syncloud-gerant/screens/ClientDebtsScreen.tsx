import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import ClientTypeFilter, { ClientType } from "../components/ClientTypeFilter";
import SkeletonLoader from "../components/SkeletonLoader";

type AgingBucket = "0-30" | "30-60" | "60-90" | "90+";

interface ClientDebt {
    id: string;
    name: string;
    phone: string;
    balance: number;
    agingBucket: AgingBucket;
    lastSaleDate: string | null;
    daysOverdue: number;
}

interface DebtsData {
    debtors: ClientDebt[];
    aging: { bucket0_30: number; bucket30_60: number; bucket60_90: number; bucket90plus: number };
    totals: { clientsOweUs: number; clientDebtorCount: number };
}

const AGING_COLORS: Record<AgingBucket, string> = {
    "0-30": "#22c55e",
    "30-60": "#f59e0b",
    "60-90": "#f97316",
    "90+": "#ef4444",
};

export default function ClientDebtsScreen({ navigation }: any) {
    const [data, setData] = useState<DebtsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<AgingBucket | "all">("all");
    const [clientType, setClientType] = useState<ClientType>("");

    // Quick payment modal
    const [payModal, setPayModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [paying, setPaying] = useState(false);

    const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR");

    const fetchDebts = useCallback(async () => {
        try {
            const path = `/gerant/debts?clientType=${clientType}`;
            const result: DebtsData = await apiFetch(path);
            setData(result);
        } catch (e: any) {
            console.error("[ClientDebts]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [clientType]);

    useEffect(() => {
        setLoading(true);
        fetchDebts();
    }, [clientType, fetchDebts]);

    const handleWhatsApp = (client: ClientDebt) => {
        const msg = encodeURIComponent(
            `Bonjour ${client.name}, nous vous rappelons aimablement que votre solde de ${fmt(client.balance)} DA est en attente depuis ${client.daysOverdue} jours. Merci de régulariser. — SynCloudPOS`
        );
        Linking.openURL(`whatsapp://send?phone=${client.phone}&text=${msg}`).catch(() =>
            Alert.alert("Erreur", "WhatsApp non installé")
        );
    };

    const handleCall = (client: ClientDebt) => Linking.openURL(`tel:${client.phone}`);

    const openPayModal = (client: ClientDebt) => {
        setSelectedClient(client);
        setPayAmount(String(Math.round(client.balance)));
        setPayModal(true);
    };

    const handlePay = async () => {
        if (!selectedClient || !payAmount || isNaN(Number(payAmount))) return;
        setPaying(true);
        try {
            const res = await apiFetch(`/gerant/client/${selectedClient.id}/payment`, {
                method: "POST",
                body: JSON.stringify({ amount: Number(payAmount), note: "Encaissement mobile gérant" }),
            });
            Alert.alert("✅ Succès", res.message || "Paiement enregistré");
            setPayModal(false);
            setPayAmount("");
            fetchDebts();
        } catch (e: any) {
            Alert.alert("Erreur", e.message || "Erreur lors de l'enregistrement");
        } finally {
            setPaying(false);
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: "#0a0f1e" }}>
                <View style={{ paddingTop: 16 }}>
                    <ClientTypeFilter value={clientType} onChange={setClientType} />
                </View>
                <SkeletonLoader type="list" rows={6} />
            </View>
        );
    }

    const debtors = data?.debtors || [];
    const aging = data?.aging;
    const totals = data?.totals;
    const filtered = filter === "all" ? debtors : debtors.filter(d => d.agingBucket === filter);

    const agingSummary = {
        "0-30": aging?.bucket0_30 || 0,
        "30-60": aging?.bucket30_60 || 0,
        "60-90": aging?.bucket60_90 || 0,
        "90+": aging?.bucket90plus || 0,
    };
    const maxBucket = Math.max(...Object.values(agingSummary));

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDebts(); }} tintColor="#f59e0b" />
                }
            >
                <View style={{ paddingTop: 16 }}>
                    <ClientTypeFilter value={clientType} onChange={setClientType} />
                </View>
                {/* Total */}
                <View style={styles.totalCard}>
                    <View style={styles.totalHeader}>
                        <Ionicons name="warning" size={22} color="#f59e0b" />
                        <Text style={styles.totalTitle}>Créances Clients Totales</Text>
                    </View>
                    <Text style={styles.totalValue}>{fmt(totals?.clientsOweUs || 0)} DA</Text>
                    <Text style={styles.totalSub}>{totals?.clientDebtorCount || 0} clients débiteurs</Text>
                </View>

                {/* Aging bars */}
                <Text style={styles.sectionTitle}>RAPPORT D'ÂGE DES CRÉANCES</Text>
                <View style={styles.agingCard}>
                    {(["0-30", "30-60", "60-90", "90+"] as AgingBucket[]).map(bucket => {
                        const amount = agingSummary[bucket];
                        const count = debtors.filter(d => d.agingBucket === bucket).length;
                        const barWidth = maxBucket > 0 ? (amount / maxBucket) * 100 : 0;
                        return (
                            <TouchableOpacity
                                key={bucket}
                                style={[styles.agingRow, filter === bucket && styles.agingRowActive]}
                                onPress={() => setFilter(filter === bucket ? "all" : bucket)}
                            >
                                <View style={styles.agingLeft}>
                                    <View style={[styles.agingDot, { backgroundColor: AGING_COLORS[bucket] }]} />
                                    <Text style={styles.agingLabel}>{bucket} jours</Text>
                                    <View style={styles.agingCountBadge}>
                                        <Text style={styles.agingCountText}>{count}</Text>
                                    </View>
                                </View>
                                <View style={styles.agingBarTrack}>
                                    <View style={[styles.agingBarFill, { width: `${barWidth}%`, backgroundColor: AGING_COLORS[bucket] }]} />
                                </View>
                                <Text style={[styles.agingAmount, { color: AGING_COLORS[bucket] }]}>
                                    {fmt(amount)} DA
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {filter !== "all" && (
                    <TouchableOpacity style={styles.filterBadge} onPress={() => setFilter("all")}>
                        <Ionicons name="funnel" size={14} color="#3b82f6" />
                        <Text style={styles.filterText}>Filtre: {filter} jours</Text>
                        <Ionicons name="close-circle" size={16} color="#64748b" />
                    </TouchableOpacity>
                )}

                <Text style={styles.sectionTitle}>
                    {filter === "all" ? "TOUS LES DÉBITEURS" : `DÉBITEURS ${filter} JOURS`} ({filtered.length})
                </Text>

                {filtered.length === 0 && (
                    <View style={styles.emptyCard}>
                        <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
                        <Text style={styles.emptyText}>Aucune créance dans cette tranche</Text>
                    </View>
                )}

                {filtered.map(client => (
                    <View key={client.id} style={styles.clientCard}>
                        <View style={styles.clientHeader}>
                            <View style={[styles.clientStatusDot, { backgroundColor: AGING_COLORS[client.agingBucket] }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.clientName}>{client.name}</Text>
                                <Text style={styles.clientPhone}>{client.phone || "—"}</Text>
                            </View>
                            <View style={styles.clientAmountWrap}>
                                <Text style={[styles.clientAmount, { color: AGING_COLORS[client.agingBucket] }]}>
                                    {fmt(client.balance)} DA
                                </Text>
                                <View style={[styles.agingTag, { backgroundColor: `${AGING_COLORS[client.agingBucket]}20` }]}>
                                    <Text style={[styles.agingTagText, { color: AGING_COLORS[client.agingBucket] }]}>
                                        {client.daysOverdue}j
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {client.lastSaleDate && (
                            <View style={styles.clientMeta}>
                                <Text style={styles.clientMetaText}>
                                    Dernière vente: {new Date(client.lastSaleDate).toLocaleDateString("fr-FR")}
                                </Text>
                            </View>
                        )}

                        <View style={styles.clientActions}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleWhatsApp(client)}>
                                <Ionicons name="logo-whatsapp" size={16} color="#22c55e" />
                                <Text style={[styles.actionText, { color: "#22c55e" }]}>Relancer</Text>
                            </TouchableOpacity>
                            {client.phone && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleCall(client)}>
                                    <Ionicons name="call-outline" size={16} color="#3b82f6" />
                                    <Text style={[styles.actionText, { color: "#3b82f6" }]}>Appeler</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnPay]}
                                onPress={() => openPayModal(client)}
                            >
                                <Ionicons name="cash-outline" size={16} color="#fff" />
                                <Text style={[styles.actionText, { color: "#fff" }]}>Encaisser</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Quick Payment Modal */}
            <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="cash" size={24} color="#22c55e" />
                            <Text style={styles.modalTitle}>Encaisser Paiement</Text>
                            <TouchableOpacity onPress={() => setPayModal(false)}>
                                <Ionicons name="close-circle" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {selectedClient && (
                            <>
                                <View style={styles.modalClient}>
                                    <Text style={styles.modalClientName}>{selectedClient.name}</Text>
                                    <Text style={styles.modalClientDebt}>
                                        Solde: {fmt(selectedClient.balance)} DA
                                    </Text>
                                </View>

                                <Text style={styles.modalLabel}>Montant encaissé (DA)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={payAmount}
                                    onChangeText={setPayAmount}
                                    keyboardType="numeric"
                                    placeholder="Entrez le montant"
                                    placeholderTextColor="#475569"
                                    autoFocus
                                />

                                <TouchableOpacity
                                    style={[styles.modalPayBtn, paying && { opacity: 0.6 }]}
                                    onPress={handlePay}
                                    disabled={paying}
                                >
                                    {paying
                                        ? <ActivityIndicator color="#fff" />
                                        : <>
                                            <Ionicons name="checkmark-done" size={20} color="#fff" />
                                            <Text style={styles.modalPayBtnText}>Confirmer l'encaissement</Text>
                                          </>
                                    }
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0f1e" },

    totalCard: {
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20, padding: 20, alignItems: "center",
        borderWidth: 1, borderColor: "#f59e0b30",
    },
    totalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    totalTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    totalValue: { color: "#f59e0b", fontSize: 32, fontWeight: "900" },
    totalSub: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 4 },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },

    agingCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 12 },
    agingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 8 },
    agingRowActive: { backgroundColor: "#33415540" },
    agingLeft: { flexDirection: "row", alignItems: "center", gap: 6, width: 100 },
    agingDot: { width: 8, height: 8, borderRadius: 4 },
    agingLabel: { color: "#f8fafc", fontSize: 12, fontWeight: "600" },
    agingCountBadge: { backgroundColor: "#0a0f1e", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
    agingCountText: { color: "#94a3b8", fontSize: 9, fontWeight: "700" },
    agingBarTrack: { flex: 1, height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden" },
    agingBarFill: { height: "100%", borderRadius: 4 },
    agingAmount: { fontSize: 12, fontWeight: "800", width: 80, textAlign: "right" },

    filterBadge: {
        flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginLeft: 16, marginTop: 8,
        backgroundColor: "#3b82f615", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#3b82f630",
    },
    filterText: { color: "#3b82f6", fontSize: 11, fontWeight: "700" },

    emptyCard: { alignItems: "center", padding: 32, gap: 12 },
    emptyText: { color: "#64748b", fontSize: 14 },

    clientCard: { backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, gap: 12 },
    clientHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    clientStatusDot: { width: 10, height: 10, borderRadius: 5 },
    clientName: { color: "#f8fafc", fontSize: 15, fontWeight: "800" },
    clientPhone: { color: "#64748b", fontSize: 11, marginTop: 2 },
    clientAmountWrap: { alignItems: "flex-end" },
    clientAmount: { fontSize: 16, fontWeight: "900" },
    agingTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    agingTagText: { fontSize: 10, fontWeight: "800" },
    clientMeta: { backgroundColor: "#0a0f1e", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    clientMetaText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },

    clientActions: { flexDirection: "row", gap: 8 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: "#0a0f1e", borderWidth: 1, borderColor: "#334155",
    },
    actionBtnPay: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    actionText: { fontSize: 11, fontWeight: "700" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    modalCard: {
        backgroundColor: "#1e293b", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, gap: 16,
    },
    modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    modalTitle: { flex: 1, color: "#f8fafc", fontSize: 18, fontWeight: "900" },
    modalClient: { backgroundColor: "#0a0f1e", borderRadius: 14, padding: 16, gap: 4 },
    modalClientName: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    modalClientDebt: { color: "#f59e0b", fontSize: 14, fontWeight: "700" },
    modalLabel: { color: "#64748b", fontSize: 12, fontWeight: "700" },
    modalInput: {
        backgroundColor: "#0a0f1e", borderWidth: 1, borderColor: "#334155",
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        color: "#f8fafc", fontSize: 22, fontWeight: "900",
    },
    modalPayBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: "#22c55e", borderRadius: 14, paddingVertical: 16,
    },
    modalPayBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
