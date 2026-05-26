import React, { useState } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Alert, TextInput, ActivityIndicator, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface Supplier {
    id: string;
    name: string;
    phone: string;
    balance: number; // negative = we owe them
    lastOrderDate: string;
    lastPaymentDate: string;
    totalPurchases: number;
}

interface Payment {
    id: string;
    supplierId: string;
    supplierName: string;
    amount: number;
    method: "especes" | "cheque" | "virement";
    date: string;
    reference: string;
}

const SUPPLIERS: Supplier[] = [
    { id: "1", name: "Grossiste El Mountazah", phone: "+213555111222", balance: -185000, lastOrderDate: "24/05/2026", lastPaymentDate: "15/05/2026", totalPurchases: 2450000 },
    { id: "2", name: "SPA Ramy Boissons", phone: "+213555222333", balance: -420000, lastOrderDate: "22/05/2026", lastPaymentDate: "10/05/2026", totalPurchases: 8900000 },
    { id: "3", name: "SARL Soummam Lait", phone: "+213555333444", balance: -95000, lastOrderDate: "18/05/2026", lastPaymentDate: "20/05/2026", totalPurchases: 3200000 },
    { id: "4", name: "Groupe CEVITAL", phone: "+213555444555", balance: -340000, lastOrderDate: "20/05/2026", lastPaymentDate: "05/05/2026", totalPurchases: 5600000 },
    { id: "5", name: "ENIEM Distribution", phone: "+213555555666", balance: -62000, lastOrderDate: "10/05/2026", lastPaymentDate: "25/04/2026", totalPurchases: 890000 },
];

const RECENT_PAYMENTS: Payment[] = [
    { id: "PAY-001", supplierId: "1", supplierName: "Grossiste El Mountazah", amount: 100000, method: "especes", date: "15/05/2026", reference: "ESP-15052026" },
    { id: "PAY-002", supplierId: "2", supplierName: "SPA Ramy Boissons", amount: 250000, method: "cheque", date: "10/05/2026", reference: "CHQ-00482" },
    { id: "PAY-003", supplierId: "3", supplierName: "SARL Soummam Lait", amount: 50000, method: "virement", date: "20/05/2026", reference: "VIR-20052026" },
];

export default function SupplierLedgerScreen() {
    const [suppliers, setSuppliers] = useState(SUPPLIERS);
    const [payments, setPayments] = useState(RECENT_PAYMENTS);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"especes" | "cheque" | "virement">("especes");
    const [paymentRef, setPaymentRef] = useState("");
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"suppliers" | "payments">("suppliers");

    const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR");
    const totalOwed = suppliers.reduce((s, sup) => s + Math.abs(sup.balance), 0);

    const handlePay = () => {
        if (!selectedSupplier) return;
        if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
            Alert.alert("Erreur", "Montant invalide.");
            return;
        }
        setSaving(true);
        setTimeout(() => {
            const amount = Number(paymentAmount);
            const newPayment: Payment = {
                id: `PAY-${Math.floor(Math.random() * 9000 + 1000)}`,
                supplierId: selectedSupplier.id,
                supplierName: selectedSupplier.name,
                amount,
                method: paymentMethod,
                date: new Date().toLocaleDateString("fr-FR"),
                reference: paymentRef || `REF-${Date.now()}`,
            };
            setPayments(prev => [newPayment, ...prev]);
            setSuppliers(prev => prev.map(s =>
                s.id === selectedSupplier.id
                    ? { ...s, balance: s.balance + amount, lastPaymentDate: new Date().toLocaleDateString("fr-FR") }
                    : s
            ));
            setSaving(false);
            setSelectedSupplier(null);
            setPaymentAmount("");
            setPaymentRef("");
            Alert.alert("✓ Paiement Enregistré", `${fmt(amount)} DA versés à ${selectedSupplier.name}`);
        }, 1200);
    };

    const methodIcon = (m: string) =>
        m === "especes" ? "wallet-outline" : m === "cheque" ? "document-text-outline" : "swap-horizontal-outline";
    const methodColor = (m: string) =>
        m === "especes" ? "#22c55e" : m === "cheque" ? "#f59e0b" : "#3b82f6";

    return (
        <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Summary */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.summaryLabel}>Total Dettes Fournisseurs</Text>
                        <Text style={styles.summaryValue}>{fmt(totalOwed)} DA</Text>
                        <Text style={styles.summarySub}>{suppliers.length} fournisseurs actifs</Text>
                    </View>
                    <View style={styles.summaryIconWrap}>
                        <Ionicons name="business" size={32} color="#3b82f6" />
                    </View>
                </View>

                {/* Tab switcher */}
                <View style={styles.tabBar}>
                    {(["suppliers", "payments"] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
                            onPress={() => setActiveTab(t)}
                        >
                            <Ionicons
                                name={t === "suppliers" ? "storefront-outline" : "receipt-outline"}
                                size={16}
                                color={activeTab === t ? "#fff" : "#94a3b8"}
                            />
                            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                                {t === "suppliers" ? "Fournisseurs" : "Historique Paiements"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Supplier List */}
                {activeTab === "suppliers" && (
                    <>
                        <Text style={styles.sectionTitle}>SOLDES FOURNISSEURS</Text>
                        {suppliers.map(sup => (
                            <TouchableOpacity
                                key={sup.id}
                                style={[styles.supplierCard, selectedSupplier?.id === sup.id && styles.supplierCardSelected]}
                                onPress={() => setSelectedSupplier(selectedSupplier?.id === sup.id ? null : sup)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.supplierHeader}>
                                    <View style={styles.supplierAvatar}>
                                        <Ionicons name="business-outline" size={20} color="#3b82f6" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.supplierName}>{sup.name}</Text>
                                        <Text style={styles.supplierMeta}>
                                            Dernier achat: {sup.lastOrderDate} · Payé: {sup.lastPaymentDate}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={styles.supplierBalance}>-{fmt(sup.balance)} DA</Text>
                                        <Ionicons
                                            name={selectedSupplier?.id === sup.id ? "chevron-up" : "chevron-down"}
                                            size={16}
                                            color="#475569"
                                            style={{ marginTop: 4 }}
                                        />
                                    </View>
                                </View>

                                {/* Payment panel (expanded) */}
                                {selectedSupplier?.id === sup.id && (
                                    <View style={styles.payPanel}>
                                        <View style={styles.payPanelDivider} />

                                        <Text style={styles.payLabel}>Méthode de paiement</Text>
                                        <View style={styles.methodRow}>
                                            {(["especes", "cheque", "virement"] as const).map(m => (
                                                <TouchableOpacity
                                                    key={m}
                                                    style={[styles.methodBtn, paymentMethod === m && { backgroundColor: `${methodColor(m)}25`, borderColor: methodColor(m) }]}
                                                    onPress={() => setPaymentMethod(m)}
                                                >
                                                    <Ionicons name={methodIcon(m) as any} size={16} color={paymentMethod === m ? methodColor(m) : "#64748b"} />
                                                    <Text style={[styles.methodText, paymentMethod === m && { color: methodColor(m) }]}>
                                                        {m === "especes" ? "Espèces" : m === "cheque" ? "Chèque" : "Virement"}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <View style={styles.payInputRow}>
                                            <View style={[styles.payInputGroup, { flex: 1.5 }]}>
                                                <Text style={styles.payLabel}>Montant (DA)</Text>
                                                <TextInput
                                                    style={styles.payInput}
                                                    keyboardType="numeric"
                                                    value={paymentAmount}
                                                    onChangeText={setPaymentAmount}
                                                    placeholder={`Max: ${fmt(sup.balance)} DA`}
                                                    placeholderTextColor="#475569"
                                                />
                                            </View>
                                            <View style={[styles.payInputGroup, { flex: 1 }]}>
                                                <Text style={styles.payLabel}>Référence</Text>
                                                <TextInput
                                                    style={styles.payInput}
                                                    value={paymentRef}
                                                    onChangeText={setPaymentRef}
                                                    placeholder="N° CHQ..."
                                                    placeholderTextColor="#475569"
                                                />
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.payBtn, saving && { opacity: 0.6 }]}
                                            onPress={handlePay}
                                            disabled={saving}
                                        >
                                            {saving
                                                ? <ActivityIndicator color="#fff" />
                                                : <>
                                                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                                                    <Text style={styles.payBtnText}>Enregistrer le Paiement</Text>
                                                </>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {/* Payments History */}
                {activeTab === "payments" && (
                    <>
                        <Text style={styles.sectionTitle}>HISTORIQUE DES PAIEMENTS</Text>
                        <View style={styles.payHistCard}>
                            {payments.map((p, i) => (
                                <View key={p.id} style={[styles.payHistRow, i < payments.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#33415540" }]}>
                                    <View style={[styles.payHistIcon, { backgroundColor: `${methodColor(p.method)}20` }]}>
                                        <Ionicons name={methodIcon(p.method) as any} size={18} color={methodColor(p.method)} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.payHistName}>{p.supplierName}</Text>
                                        <Text style={styles.payHistRef}>{p.reference} · {p.date}</Text>
                                    </View>
                                    <Text style={styles.payHistAmount}>-{fmt(p.amount)} DA</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: "#3b82f620",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    summaryLeft: { gap: 4 },
    summaryLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
    summaryValue: { color: "#f8fafc", fontSize: 26, fontWeight: "900" },
    summarySub: { color: "#3b82f6", fontSize: 12, fontWeight: "600" },
    summaryIconWrap: {
        width: 56, height: 56, borderRadius: 16, backgroundColor: "#3b82f615",
        justifyContent: "center", alignItems: "center",
    },

    tabBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
    tabBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 10, borderRadius: 10,
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    tabBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
    tabText: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
    tabTextActive: { color: "#fff" },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 16, marginBottom: 10,
    },

    supplierCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 10,
        borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#334155",
    },
    supplierCardSelected: { borderColor: "#3b82f6", backgroundColor: "#1e293b" },
    supplierHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    supplierAvatar: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: "#3b82f615",
        justifyContent: "center", alignItems: "center",
    },
    supplierName: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
    supplierMeta: { color: "#64748b", fontSize: 10, marginTop: 3, fontWeight: "600" },
    supplierBalance: { color: "#ef4444", fontSize: 15, fontWeight: "900" },

    payPanel: { marginTop: 12, gap: 12 },
    payPanelDivider: { height: 1, backgroundColor: "#334155" },
    payLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
    methodRow: { flexDirection: "row", gap: 8 },
    methodBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, paddingVertical: 8, borderRadius: 10,
        backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155",
    },
    methodText: { color: "#64748b", fontSize: 11, fontWeight: "700" },
    payInputRow: { flexDirection: "row", gap: 10 },
    payInputGroup: { gap: 6 },
    payInput: {
        backgroundColor: "#0f172a", borderRadius: 10, height: 44, color: "#f8fafc",
        paddingHorizontal: 12, borderWidth: 1, borderColor: "#334155", fontSize: 13,
    },
    payBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, height: 46, backgroundColor: "#22c55e", borderRadius: 12,
    },
    payBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    payHistCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 12 },
    payHistRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
    payHistIcon: {
        width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center",
    },
    payHistName: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
    payHistRef: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },
    payHistAmount: { color: "#ef4444", fontSize: 14, fontWeight: "800" },
});
