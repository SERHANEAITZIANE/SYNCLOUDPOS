import React, { useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { printBL, shareBL, BLData } from "../lib/printer";
import { useAuthStore } from "../lib/store";

export default function PaymentScreen({ route, navigation }: any) {
    const { customerId, customerName, balance = 0, tourStopId } = route.params || {};
    const { user } = useAuthStore();
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [loading, setLoading] = useState(false);

    const balanceNum = Number(balance);

    const quickAmounts = [
        Math.round(balanceNum * 0.25),
        Math.round(balanceNum * 0.5),
        Math.round(balanceNum),
    ].filter(a => a > 0);

    const handleSubmit = async () => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            Alert.alert("Erreur", "Montant invalide");
            return;
        }

        Alert.alert(
            "Confirmer le paiement",
            `${customerName}\nMontant: ${parsedAmount.toLocaleString("fr-FR")} DA\nMode: ${paymentMethod}`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Confirmer",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await apiFetch("/payments", {
                                method: "POST",
                                body: JSON.stringify({
                                    customerId,
                                    amount: parsedAmount,
                                    paymentMethod,
                                    tourStopId,
                                }),
                            });

                            const blData: BLData = {
                                receiptNumber: `REC-${Date.now()}`,
                                date: new Date().toISOString(),
                                customer: { name: customerName },
                                items: [{
                                    name: "Règlement Client",
                                    quantity: 1,
                                    unitPrice: parsedAmount,
                                    total: parsedAmount,
                                }],
                                subtotal: parsedAmount,
                                taxAmount: 0,
                                stampTax: 0,
                                total: parsedAmount,
                                paymentMethod: paymentMethod,
                                amountPaid: parsedAmount,
                                tenantName: user?.tenant?.name || "SynCloudPOS",
                            };

                            Alert.alert(
                                "✅ Paiement enregistré",
                                `Montant: ${parsedAmount.toLocaleString("fr-FR")} DA\n` +
                                `Ancien solde: ${result.previousBalance.toLocaleString("fr-FR")} DA\n` +
                                `Nouveau solde: ${result.newBalance.toLocaleString("fr-FR")} DA`,
                                [
                                    { text: "Imprimer", onPress: () => { printBL(blData).then(() => navigation.goBack()); } },
                                    { text: "Partager", onPress: () => { shareBL(blData).then(() => navigation.goBack()); } },
                                    { text: "Fermer", style: "cancel", onPress: () => navigation.goBack() }
                                ]
                            );
                        } catch (e: any) {
                            Alert.alert("Erreur", e.message);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Client info */}
            <View style={styles.clientCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{customerName?.charAt(0) || "?"}</Text>
                </View>
                <View>
                    <Text style={styles.clientName}>{customerName}</Text>
                    <Text style={[styles.clientBalance, balanceNum > 0 ? styles.red : styles.green]}>
                        Solde: {balanceNum.toLocaleString("fr-FR")} DA
                    </Text>
                </View>
            </View>

            {/* Amount input */}
            <View style={styles.amountSection}>
                <Text style={styles.sectionLabel}>MONTANT DU PAIEMENT</Text>
                <View style={styles.amountWrapper}>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0"
                        placeholderTextColor="#475569"
                        keyboardType="numeric"
                        autoFocus
                    />
                    <Text style={styles.amountUnit}>DA</Text>
                </View>

                {/* Quick amounts */}
                {quickAmounts.length > 0 && (
                    <View style={styles.quickRow}>
                        {quickAmounts.map((a, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.quickBtn}
                                onPress={() => setAmount(String(a))}
                            >
                                <Text style={styles.quickText}>{a.toLocaleString("fr-FR")}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Payment method */}
            <View style={styles.methodSection}>
                <Text style={styles.sectionLabel}>MODE DE PAIEMENT</Text>
                <View style={styles.methods}>
                    {[
                        { key: "CASH", icon: "cash", label: "Espèces" },
                        { key: "CHECK", icon: "card", label: "Chèque" },
                        { key: "TRANSFER", icon: "swap-horizontal", label: "Virement" },
                    ].map((m) => (
                        <TouchableOpacity
                            key={m.key}
                            style={[styles.methodCard, paymentMethod === m.key && styles.methodCardActive]}
                            onPress={() => setPaymentMethod(m.key)}
                        >
                            <Ionicons
                                name={m.icon as any}
                                size={28}
                                color={paymentMethod === m.key ? "#fff" : "#64748b"}
                            />
                            <Text style={[styles.methodLabel, paymentMethod === m.key && styles.methodLabelActive]}>
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Submit */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={22} color="#fff" />
                            <Text style={styles.submitText}>Enregistrer le paiement</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },

    clientCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: "#1e293b", padding: 16, borderRadius: 16,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: "#334155",
        justifyContent: "center", alignItems: "center",
    },
    avatarText: { color: "#94a3b8", fontSize: 20, fontWeight: "800" },
    clientName: { color: "#f8fafc", fontSize: 17, fontWeight: "700" },
    clientBalance: { fontSize: 14, fontWeight: "600", marginTop: 2 },
    red: { color: "#ef4444" },
    green: { color: "#22c55e" },

    amountSection: { marginTop: 24, alignItems: "center" },
    sectionLabel: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 12,
    },
    amountWrapper: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    amountInput: {
        fontSize: 48, fontWeight: "900", color: "#f8fafc",
        textAlign: "center", minWidth: 120,
    },
    amountUnit: { color: "#64748b", fontSize: 20, fontWeight: "700" },

    quickRow: { flexDirection: "row", gap: 8, marginTop: 16 },
    quickBtn: {
        backgroundColor: "#334155", paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 10,
    },
    quickText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },

    methodSection: { marginTop: 32 },
    methods: { flexDirection: "row", gap: 10 },
    methodCard: {
        flex: 1, alignItems: "center", gap: 8,
        backgroundColor: "#1e293b", padding: 16, borderRadius: 14,
        borderWidth: 1, borderColor: "#334155",
    },
    methodCardActive: { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
    methodLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
    methodLabelActive: { color: "#fff" },

    footer: { marginTop: "auto", paddingTop: 16 },
    submitBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: "#22c55e", padding: 16, borderRadius: 14,
    },
    submitText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
