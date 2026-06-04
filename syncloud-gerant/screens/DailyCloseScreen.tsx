import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

interface CashCloseData {
    date: string;
    expectedCash: number;
    totalSales: number;
    totalReturns: number;
    totalExpenses: number;
    totalPaymentsReceived: number;
    openingBalance: number;
    transactions: { label: string; amount: number; type: "in" | "out" }[];
}

const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5];

export default function DailyCloseScreen() {
    const [data, setData] = useState<CashCloseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [counts, setCounts] = useState<Record<number, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [notes, setNotes] = useState("");

    const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

    const fetchData = useCallback(async () => {
        try {
            const result = await apiFetch("/gerant/daily-close");
            setData(result);
        } catch (e) {
            console.error("[DailyClose]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const countedCash = DENOMINATIONS.reduce((sum, d) => {
        const qty = parseInt(counts[d] || "0") || 0;
        return sum + d * qty;
    }, 0);

    const discrepancy = data ? countedCash - data.expectedCash : 0;

    const handleClose = () => {
        if (countedCash === 0) {
            Alert.alert("Erreur", "Veuillez compter les espèces dans la caisse avant de clôturer.");
            return;
        }
        if (!data) return;

        const discrepancyAbs = Math.abs(discrepancy);
        const msg = discrepancy === 0
            ? "La caisse est parfaitement équilibrée. Confirmer la clôture ?"
            : `Il y a un écart de ${discrepancy > 0 ? "+" : "-"}${fmt(discrepancyAbs)} DA. ${discrepancy > 0 ? "Excédent" : "Manquant"} dans la caisse. Confirmer quand même ?`;

        Alert.alert("Clôture de Caisse", msg, [
            { text: "Annuler", style: "cancel" },
            {
                text: "Confirmer la Clôture",
                onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        await apiFetch("/gerant/daily-close", {
                            method: "POST",
                            body: JSON.stringify({
                                countedCash,
                                expectedCash: data.expectedCash,
                                notes,
                            }),
                        });
                        setIsClosed(true);
                        Alert.alert(
                            "✓ Caisse Clôturée",
                            `Rapport archivé sur le serveur.\nMontant compté : ${fmt(countedCash)} DA\nÉcart : ${discrepancy >= 0 ? "+" : ""}${fmt(discrepancy)} DA`
                        );
                    } catch (err: any) {
                        // Handle "already closed" gracefully
                        if (err?.message?.includes("déjà été clôturée")) {
                            Alert.alert("Caisse déjà clôturée", "La caisse a déjà été clôturée pour aujourd'hui.");
                            setIsClosed(true);
                        } else {
                            Alert.alert("Erreur", "Impossible de clôturer la caisse. Vérifiez la connexion.");
                        }
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#a855f7" />
                <Text style={styles.loadingText}>Chargement des données de caisse...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Ionicons name="cloud-offline-outline" size={48} color="#334155" />
                <Text style={styles.loadingText}>Impossible de charger les données</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
                    <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isClosed) {
        return (
            <View style={styles.closedContainer}>
                <View style={styles.closedCard}>
                    <View style={styles.closedIconWrap}>
                        <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                    </View>
                    <Text style={styles.closedTitle}>Caisse Clôturée</Text>
                    <Text style={styles.closedDate}>{data.date}</Text>
                    <View style={styles.closedSummary}>
                        <View style={styles.closedRow}>
                            <Text style={styles.closedLabel}>Espèces comptées</Text>
                            <Text style={styles.closedValue}>{fmt(countedCash)} DA</Text>
                        </View>
                        <View style={styles.closedRow}>
                            <Text style={styles.closedLabel}>Attendu</Text>
                            <Text style={styles.closedValue}>{fmt(data.expectedCash)} DA</Text>
                        </View>
                        <View style={[styles.closedRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.closedLabel}>Écart</Text>
                            <Text style={[styles.closedValue, {
                                color: discrepancy === 0 ? "#22c55e" : discrepancy > 0 ? "#3b82f6" : "#ef4444"
                            }]}>
                                {discrepancy >= 0 ? "+" : ""}{fmt(discrepancy)} DA
                            </Text>
                        </View>
                    </View>
                    <View style={styles.closedStamp}>
                        <Ionicons name="shield-checkmark" size={16} color="#22c55e" />
                        <Text style={styles.closedStampText}>
                            Archivé à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#a855f7" />}
        >
            {/* Date Header */}
            <View style={styles.dateCard}>
                <Ionicons name="calendar" size={20} color="#a855f7" />
                <Text style={styles.dateText}>{data.date}</Text>
            </View>

            {/* Day Summary */}
            <Text style={styles.sectionTitle}>RÉSUMÉ DE LA JOURNÉE</Text>
            <View style={styles.summaryCard}>
                {data.transactions.map((tx, i) => (
                    <View key={i} style={styles.txRow}>
                        <Ionicons
                            name={tx.type === "in" ? "arrow-down-circle" : "arrow-up-circle"}
                            size={18}
                            color={tx.type === "in" ? "#22c55e" : "#ef4444"}
                        />
                        <Text style={styles.txLabel}>{tx.label}</Text>
                        <Text style={[styles.txAmount, { color: tx.type === "in" ? "#22c55e" : "#ef4444" }]}>
                            {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)} DA
                        </Text>
                    </View>
                ))}

                <View style={styles.txDivider} />

                <View style={styles.txRow}>
                    <Ionicons name="wallet" size={18} color="#3b82f6" />
                    <Text style={styles.txLabel}>Solde d'ouverture matin</Text>
                    <Text style={[styles.txAmount, { color: "#3b82f6" }]}>
                        {fmt(data.openingBalance)} DA
                    </Text>
                </View>

                <View style={styles.expectedRow}>
                    <Text style={styles.expectedLabel}>SOLDE ATTENDU EN CAISSE</Text>
                    <Text style={styles.expectedValue}>{fmt(data.expectedCash)} DA</Text>
                </View>
            </View>

            {/* Cash Counting */}
            <Text style={styles.sectionTitle}>COMPTAGE DES ESPÈCES</Text>
            <View style={styles.countCard}>
                <View style={styles.countHeader}>
                    <Ionicons name="calculator" size={18} color="#a855f7" />
                    <Text style={styles.countTitle}>Billets & Pièces en caisse</Text>
                </View>

                {DENOMINATIONS.map(denom => {
                    const qty = parseInt(counts[denom] || "0") || 0;
                    const subtotal = denom * qty;
                    return (
                        <View key={denom} style={styles.denomRow}>
                            <View style={styles.denomBadge}>
                                <Text style={styles.denomText}>
                                    {denom >= 100 ? `${fmt(denom)} DA` : `${denom} DA`}
                                </Text>
                            </View>
                            <Text style={styles.denomX}>×</Text>
                            <TextInput
                                style={styles.denomInput}
                                keyboardType="numeric"
                                value={counts[denom] || ""}
                                onChangeText={(val) => setCounts(prev => ({ ...prev, [denom]: val }))}
                                placeholder="0"
                                placeholderTextColor="#475569"
                            />
                            <Text style={styles.denomEqual}>=</Text>
                            <Text style={styles.denomSubtotal}>
                                {subtotal > 0 ? `${fmt(subtotal)} DA` : "—"}
                            </Text>
                        </View>
                    );
                })}

                <View style={styles.countTotal}>
                    <Text style={styles.countTotalLabel}>TOTAL COMPTÉ</Text>
                    <Text style={styles.countTotalValue}>{fmt(countedCash)} DA</Text>
                </View>

                {countedCash > 0 && (
                    <View style={[styles.discrepancyCard, {
                        borderColor: discrepancy === 0 ? "#22c55e40" : discrepancy > 0 ? "#3b82f640" : "#ef444440",
                        backgroundColor: discrepancy === 0 ? "#22c55e10" : discrepancy > 0 ? "#3b82f610" : "#ef444410",
                    }]}>
                        <Ionicons
                            name={discrepancy === 0 ? "checkmark-circle" : "alert-circle"}
                            size={20}
                            color={discrepancy === 0 ? "#22c55e" : discrepancy > 0 ? "#3b82f6" : "#ef4444"}
                        />
                        <View>
                            <Text style={[styles.discrepancyTitle, {
                                color: discrepancy === 0 ? "#22c55e" : discrepancy > 0 ? "#3b82f6" : "#ef4444"
                            }]}>
                                {discrepancy === 0 ? "Caisse Équilibrée ✓" : discrepancy > 0 ? "Excédent" : "Manquant"}
                            </Text>
                            <Text style={styles.discrepancyValue}>
                                Écart : {discrepancy >= 0 ? "+" : ""}{fmt(discrepancy)} DA
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Notes */}
            <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Notes / Observations (optionnel)</Text>
                <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Ex: Client X a promis de payer demain..."
                    placeholderTextColor="#475569"
                    multiline
                />
            </View>

            {/* Close Button */}
            <TouchableOpacity
                style={[styles.closeBtn, isSubmitting && styles.closeBtnDisabled]}
                onPress={handleClose}
                disabled={isSubmitting}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="lock-closed" size={20} color="#fff" />
                        <Text style={styles.closeBtnText}>Clôturer la Caisse</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a", gap: 12 },
    loadingText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
    retryBtn: { backgroundColor: "#a855f7", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    dateCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#a855f715", marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#a855f730" },
    dateText: { color: "#f8fafc", fontSize: 14, fontWeight: "700", textTransform: "capitalize" },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },

    summaryCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 12 },
    txRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    txLabel: { flex: 1, color: "#f8fafc", fontSize: 13, fontWeight: "600" },
    txAmount: { fontSize: 13, fontWeight: "800" },
    txDivider: { height: 1, backgroundColor: "#334155", marginVertical: 4 },
    expectedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0f172a", borderRadius: 10, padding: 12, marginTop: 4 },
    expectedLabel: { color: "#a855f7", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
    expectedValue: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },

    countCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 10 },
    countHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    countTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "800" },
    denomRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    denomBadge: { width: 80, backgroundColor: "#0f172a", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: "#334155" },
    denomText: { color: "#f8fafc", fontSize: 12, fontWeight: "700", textAlign: "center" },
    denomX: { color: "#64748b", fontSize: 14, fontWeight: "700" },
    denomInput: { width: 52, height: 36, backgroundColor: "#0f172a", borderRadius: 8, color: "#f8fafc", textAlign: "center", fontSize: 14, fontWeight: "700", borderWidth: 1, borderColor: "#334155" },
    denomEqual: { color: "#64748b", fontSize: 14 },
    denomSubtotal: { flex: 1, color: "#94a3b8", fontSize: 12, fontWeight: "700", textAlign: "right" },

    countTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0f172a", borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "#a855f740" },
    countTotalLabel: { color: "#a855f7", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
    countTotalValue: { color: "#f8fafc", fontSize: 20, fontWeight: "900" },

    discrepancyCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
    discrepancyTitle: { fontSize: 13, fontWeight: "800" },
    discrepancyValue: { color: "#94a3b8", fontSize: 11, fontWeight: "600", marginTop: 2 },

    notesCard: { backgroundColor: "#1e293b", marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16 },
    notesLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 8 },
    notesInput: { backgroundColor: "#0f172a", borderRadius: 10, minHeight: 60, color: "#f8fafc", padding: 12, borderWidth: 1, borderColor: "#334155", fontSize: 13, textAlignVertical: "top" },

    closeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 20, height: 52, backgroundColor: "#a855f7", borderRadius: 14, shadowColor: "#a855f7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    closeBtnDisabled: { opacity: 0.7 },
    closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    closedContainer: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", padding: 24 },
    closedCard: { backgroundColor: "#1e293b", borderRadius: 24, padding: 32, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
    closedIconWrap: { marginBottom: 16 },
    closedTitle: { color: "#f8fafc", fontSize: 24, fontWeight: "900" },
    closedDate: { color: "#64748b", fontSize: 13, marginTop: 4, textTransform: "capitalize" },
    closedSummary: { width: "100%", backgroundColor: "#0f172a", borderRadius: 14, padding: 16, marginTop: 20, gap: 10 },
    closedRow: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#334155" },
    closedLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
    closedValue: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
    closedStamp: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, backgroundColor: "#22c55e15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#22c55e30" },
    closedStampText: { color: "#22c55e", fontSize: 12, fontWeight: "700" },
});
