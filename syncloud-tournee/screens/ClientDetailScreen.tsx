import React, { useEffect, useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { useLangStore } from "../lib/i18n";

export default function ClientDetailScreen({ route, navigation }: any) {
    const { clientId } = route.params;
    const { t } = useLangStore();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"bls" | "payments" | "returns">("bls");

    const openWhatsApp = (phone: string) => {
        const cleaned = phone.replace(/\s+/g, "").replace(/^0/, "213");
        Linking.openURL(`https://wa.me/${cleaned}`);
    };

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch(`/clients/${clientId}`);
                setClient(data);
            } catch (e: any) {
                Alert.alert("Erreur", e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [clientId]);

    if (loading || !client) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const balance = Number(client.balance);
    const balColor = balance <= 0 ? "#22c55e" : balance < 50000 ? "#f59e0b" : "#ef4444";

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Client Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatarLarge}>
                    <Text style={styles.avatarText}>{client.name.charAt(0)}</Text>
                </View>
                <Text style={styles.clientName}>{client.name}</Text>
                {client.address && <Text style={styles.clientAddress}>📍 {client.address}</Text>}
                {client.phone && <Text style={styles.clientPhone}>📞 {client.phone}</Text>}

                {/* Balance */}
                <View style={[styles.balanceCard, { borderColor: balColor }]}>
                    <Text style={styles.balanceLabel}>SOLDE</Text>
                    <Text style={[styles.balanceAmount, { color: balColor }]}>
                        {balance.toLocaleString("fr-FR")} DA
                    </Text>
                </View>

                {/* Fiscal info */}
                {(client.nif || client.rc || client.nis) && (
                    <View style={styles.fiscalGrid}>
                        {client.nif && <View style={styles.fiscalItem}><Text style={styles.fiscalLabel}>NIF</Text><Text style={styles.fiscalValue}>{client.nif}</Text></View>}
                        {client.rc && <View style={styles.fiscalItem}><Text style={styles.fiscalLabel}>RC</Text><Text style={styles.fiscalValue}>{client.rc}</Text></View>}
                        {client.nis && <View style={styles.fiscalItem}><Text style={styles.fiscalLabel}>NIS</Text><Text style={styles.fiscalValue}>{client.nis}</Text></View>}
                        {client.rib && <View style={styles.fiscalItem}><Text style={styles.fiscalLabel}>RIB</Text><Text style={styles.fiscalValue}>{client.rib}</Text></View>}
                    </View>
                )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: "#1e40af" }]}
                    onPress={() => navigation.navigate("CreateBL", { customerId: clientId, customerName: client.name })}
                >
                    <Ionicons name="document-text" size={24} color="#fff" />
                    <Text style={styles.actionCardText}>{t("newBLAction")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: "#059669" }]}
                    onPress={() => navigation.navigate("Payment", { customerId: clientId, customerName: client.name, balance })}
                >
                    <Ionicons name="cash" size={24} color="#fff" />
                    <Text style={styles.actionCardText}>{t("collectAction")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: "#d97706" }]}
                    onPress={() => navigation.navigate("Return", { customerId: clientId, customerName: client.name })}
                >
                    <Ionicons name="return-down-back" size={24} color="#fff" />
                    <Text style={styles.actionCardText}>{t("returnAction")}</Text>
                </TouchableOpacity>
            </View>

            {/* WhatsApp + Call */}
            {client.phone && (
                <View style={styles.contactRow}>
                    <TouchableOpacity
                        style={[styles.contactBtn, { backgroundColor: "#25d366" }]}
                        onPress={() => openWhatsApp(client.phone)}
                    >
                        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                        <Text style={styles.contactBtnText}>{t("whatsapp")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.contactBtn, { backgroundColor: "#3b82f6" }]}
                        onPress={() => Linking.openURL(`tel:${client.phone}`)}
                    >
                        <Ionicons name="call" size={22} color="#fff" />
                        <Text style={styles.contactBtnText}>{t("call")}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabBar}>
                {[
                    { key: "bls", label: "BLs", icon: "document-text-outline" },
                    { key: "payments", label: "Paiements", icon: "wallet-outline" },
                    { key: "returns", label: "Retours", icon: "swap-horizontal-outline" },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key as any)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={16}
                            color={activeTab === tab.key ? "#3b82f6" : "#64748b"}
                        />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab content */}
            {activeTab === "bls" && (
                <View style={styles.historyList}>
                    {(client.salesOrders || []).map((order: any) => (
                        <View key={order.id} style={styles.historyItem}>
                            <View style={styles.historyLeft}>
                                <Text style={styles.historyRef}>{order.receiptNumber}</Text>
                                <Text style={styles.historyDate}>
                                    {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                                </Text>
                            </View>
                            <View style={styles.historyRight}>
                                <Text style={styles.historyAmount}>
                                    {Number(order.total).toLocaleString("fr-FR")} DA
                                </Text>
                                <View style={[
                                    styles.historyStatus,
                                    { backgroundColor: order.paymentStatus === "PAID" ? "#22c55e20" : "#f59e0b20" }
                                ]}>
                                    <Text style={[
                                        styles.historyStatusText,
                                        { color: order.paymentStatus === "PAID" ? "#22c55e" : "#f59e0b" }
                                    ]}>
                                        {order.paymentStatus === "PAID" ? "Payé" : "En cours"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                    {(!client.salesOrders || client.salesOrders.length === 0) && (
                        <Text style={styles.emptyText}>Aucun BL</Text>
                    )}
                </View>
            )}

            {activeTab === "returns" && (
                <View style={styles.historyList}>
                    {(client.productReturns || []).map((ret: any) => (
                        <View key={ret.id} style={styles.historyItem}>
                            <View style={styles.historyLeft}>
                                <Text style={styles.historyRef}>{ret.product?.name}</Text>
                                <Text style={styles.historyDate}>
                                    Qté: {ret.quantity} — {ret.reason}
                                </Text>
                            </View>
                            <Text style={[styles.historyAmount, { color: "#f59e0b" }]}>
                                {Number(ret.totalAmount).toLocaleString("fr-FR")} DA
                            </Text>
                        </View>
                    ))}
                    {(!client.productReturns || client.productReturns.length === 0) && (
                        <Text style={styles.emptyText}>Aucun retour</Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },

    profileCard: {
        alignItems: "center", padding: 24,
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20,
    },
    avatarLarge: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: "#334155", justifyContent: "center", alignItems: "center", marginBottom: 12,
    },
    avatarText: { color: "#94a3b8", fontSize: 28, fontWeight: "800" },
    clientName: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
    clientAddress: { color: "#94a3b8", fontSize: 14, marginTop: 4 },
    clientPhone: { color: "#94a3b8", fontSize: 14, marginTop: 2 },

    balanceCard: {
        marginTop: 16, padding: 16, borderRadius: 14,
        backgroundColor: "#0f172a", borderWidth: 1, width: "100%", alignItems: "center",
    },
    balanceLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
    balanceAmount: { fontSize: 32, fontWeight: "900", marginTop: 4 },

    fiscalGrid: {
        flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16, width: "100%",
    },
    fiscalItem: { backgroundColor: "#0f172a", borderRadius: 10, padding: 10, minWidth: "45%" },
    fiscalLabel: { color: "#64748b", fontSize: 10, fontWeight: "700" },
    fiscalValue: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginTop: 2 },

    actionsRow: {
        flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 16,
    },
    actionCard: {
        flex: 1, padding: 14, borderRadius: 14, alignItems: "center", gap: 6,
    },
    actionCardText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    contactRow: {
        flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 16,
    },
    contactBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, padding: 14, borderRadius: 14,
    },
    contactBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    tabBar: {
        flexDirection: "row", marginHorizontal: 16,
        backgroundColor: "#1e293b", borderRadius: 14, padding: 4,
    },
    tab: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, paddingVertical: 10, borderRadius: 10,
    },
    tabActive: { backgroundColor: "#334155" },
    tabText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
    tabTextActive: { color: "#3b82f6" },

    historyList: { padding: 16, gap: 8 },
    historyItem: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "#1e293b", padding: 14, borderRadius: 12,
    },
    historyLeft: {},
    historyRight: { alignItems: "flex-end" },
    historyRef: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
    historyDate: { color: "#64748b", fontSize: 12, marginTop: 2 },
    historyAmount: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    historyStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    historyStatusText: { fontSize: 11, fontWeight: "700" },

    emptyText: { color: "#64748b", textAlign: "center", paddingVertical: 20, fontSize: 14 },
});
