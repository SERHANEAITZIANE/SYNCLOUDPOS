import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MonthData {
    month: string;
    monthKey: string;
    year: number;
    taxableSales: number;
    tvaCollected: number;
    taxablePurchases: number;
    tvaDeductible: number;
    netTva: number;
    status: "payé" | "en_attente" | "à_déposer";
}

const STATUS_CONFIG = {
    payé: { color: "#22c55e", bg: "#22c55e15", label: "Payé ✓", icon: "checkmark-circle" as const },
    en_attente: { color: "#f59e0b", bg: "#f59e0b15", label: "En attente", icon: "time" as const },
    à_déposer: { color: "#ef4444", bg: "#ef444415", label: "À déposer !", icon: "warning" as const },
};

// French month abbreviation map
const MONTH_LABELS: Record<string, string> = {
    "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
    "05": "Mai", "06": "Juin", "07": "Juil", "08": "Aoû",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

export default function G50TaxScreen() {
    const [months, setMonths] = useState<MonthData[]>([]);
    const [selected, setSelected] = useState<MonthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

    const fetchG50 = useCallback(async () => {
        try {
            const data = await apiFetch("/gerant/g50");
            const monthsData: MonthData[] = (data.months || []).map((m: any) => ({
                ...m,
                month: MONTH_LABELS[m.monthKey?.split("-")[1]] || m.month,
            }));
            setMonths(monthsData);
            if (monthsData.length > 0) {
                // Default to most recent month
                setSelected(monthsData[monthsData.length - 1]);
            }
        } catch (e) {
            console.error("[G50]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchG50(); }, [fetchG50]);

    const handleExport = () => {
        if (!selected) return;
        Alert.alert(
            "Export G50",
            `Déclaration G50 ${selected.month} ${selected.year}\n\nDocument prêt pour la DGI.\n(Export PDF disponible via expo-print)`,
            [{ text: "OK" }]
        );
    };

    const handleMarkPaid = async () => {
        if (!selected) return;
        Alert.alert("✓ Déclaration déposée", `G50 ${selected.month} ${selected.year} marquée comme déposée.`);
        setMonths(prev => prev.map(m => m.monthKey === selected.monthKey ? { ...m, status: "payé" } : m));
        setSelected(prev => prev ? { ...prev, status: "payé" } : prev);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={styles.loadingText}>Calcul de la TVA en cours...</Text>
            </View>
        );
    }

    const totalCollected = months.reduce((s, m) => s + m.tvaCollected, 0);
    const totalDeductible = months.reduce((s, m) => s + m.tvaDeductible, 0);
    const totalNet = months.reduce((s, m) => s + m.netTva, 0);
    const currentYear = months.length > 0 ? months[months.length - 1].year : new Date().getFullYear();

    // Next deadline
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    const nextDeadline = nextMonth.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchG50(); }} tintColor="#f97316" />}
        >
            {/* Annual Summary */}
            <View style={styles.annualCard}>
                <View style={styles.annualHeader}>
                    <Ionicons name="receipt" size={20} color="#22c55e" />
                    <Text style={styles.annualTitle}>Récapitulatif TVA {currentYear}</Text>
                    <View style={styles.tvaRateBadge}>
                        <Text style={styles.tvaRateText}>TVA 19%</Text>
                    </View>
                </View>
                <View style={styles.annualGrid}>
                    <View style={styles.annualItem}>
                        <Text style={styles.annualLabel}>TVA Collectée</Text>
                        <Text style={[styles.annualValue, { color: "#ef4444" }]}>{fmt(totalCollected)} DA</Text>
                    </View>
                    <View style={styles.annualItem}>
                        <Text style={styles.annualLabel}>TVA Déductible</Text>
                        <Text style={[styles.annualValue, { color: "#22c55e" }]}>{fmt(totalDeductible)} DA</Text>
                    </View>
                    <View style={[styles.annualItem, { borderBottomWidth: 0 }]}>
                        <Text style={styles.annualLabel}>TVA Nette à Payer</Text>
                        <Text style={[styles.annualValue, { color: "#f59e0b", fontSize: 20 }]}>{fmt(totalNet)} DA</Text>
                    </View>
                </View>
            </View>

            {/* Month Selector */}
            {months.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color="#334155" />
                    <Text style={styles.emptyText}>Aucune donnée TVA disponible</Text>
                    <Text style={styles.emptySubText}>Les ventes et achats enregistrés apparaîtront ici</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.sectionTitle}>SÉLECTIONNER UN MOIS</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                        {months.map(m => {
                            const cfg = STATUS_CONFIG[m.status];
                            const isSelected = selected?.monthKey === m.monthKey;
                            return (
                                <TouchableOpacity
                                    key={m.monthKey}
                                    style={[styles.monthChip, isSelected && styles.monthChipActive, { borderColor: isSelected ? cfg.color : "#334155" }]}
                                    onPress={() => setSelected(m)}
                                >
                                    <Text style={[styles.monthChipText, isSelected && { color: cfg.color }]}>{m.month}</Text>
                                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {selected && (
                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <View>
                                    <Text style={styles.detailMonth}>{selected.month} {selected.year}</Text>
                                    <Text style={styles.detailSubtitle}>Déclaration mensuelle TVA (Formulaire G50)</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selected.status].bg }]}>
                                    <Ionicons name={STATUS_CONFIG[selected.status].icon} size={14} color={STATUS_CONFIG[selected.status].color} />
                                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selected.status].color }]}>
                                        {STATUS_CONFIG[selected.status].label}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.computeSection}>
                                <Text style={styles.computeTitle}>① TVA COLLECTÉE (sur ventes)</Text>
                                <View style={styles.computeRow}>
                                    <Text style={styles.computeLabel}>Ventes HT imposables</Text>
                                    <Text style={styles.computeValue}>{fmt(selected.taxableSales)} DA</Text>
                                </View>
                                <View style={[styles.computeRow, styles.computeTotal]}>
                                    <Text style={[styles.computeLabel, { color: "#ef4444" }]}>TVA Collectée</Text>
                                    <Text style={[styles.computeValue, { color: "#ef4444", fontWeight: "900" }]}>
                                        {fmt(selected.tvaCollected)} DA
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.computeSection}>
                                <Text style={styles.computeTitle}>② TVA DÉDUCTIBLE (sur achats)</Text>
                                <View style={styles.computeRow}>
                                    <Text style={styles.computeLabel}>Achats HT imposables</Text>
                                    <Text style={styles.computeValue}>{fmt(selected.taxablePurchases)} DA</Text>
                                </View>
                                <View style={[styles.computeRow, styles.computeTotal]}>
                                    <Text style={[styles.computeLabel, { color: "#22c55e" }]}>TVA Déductible</Text>
                                    <Text style={[styles.computeValue, { color: "#22c55e", fontWeight: "900" }]}>
                                        {fmt(selected.tvaDeductible)} DA
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.netTvaCard}>
                                <Text style={styles.netTvaLabel}>③ TVA NETTE À REVERSER À L'ÉTAT</Text>
                                <Text style={styles.netTvaFormula}>
                                    {fmt(selected.tvaCollected)} − {fmt(selected.tvaDeductible)} =
                                </Text>
                                <Text style={styles.netTvaValue}>{fmt(selected.netTva)} DA</Text>
                                <Text style={styles.netTvaNote}>
                                    À verser à la recette des impôts avant le 20 du mois suivant
                                </Text>
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                                    <Text style={styles.exportBtnText}>Exporter PDF</Text>
                                </TouchableOpacity>
                                {selected.status === "à_déposer" && (
                                    <TouchableOpacity style={styles.markPaidBtn} onPress={handleMarkPaid}>
                                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                                        <Text style={styles.markPaidText}>Marquer Déposé</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* Compliance calendar hint */}
            <View style={styles.calendarHint}>
                <Ionicons name="calendar-outline" size={16} color="#a855f7" />
                <Text style={styles.calendarText}>
                    📅 Prochaine déclaration G50 : avant le <Text style={{ color: "#f8fafc", fontWeight: "800" }}>{nextDeadline}</Text>
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a", gap: 12 },
    loadingText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

    emptyState: { alignItems: "center", padding: 48, gap: 12 },
    emptyText: { color: "#64748b", fontSize: 16, fontWeight: "700" },
    emptySubText: { color: "#475569", fontSize: 12, textAlign: "center" },

    annualCard: {
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: "#22c55e20",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    annualHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    annualTitle: { flex: 1, color: "#f8fafc", fontSize: 16, fontWeight: "900" },
    tvaRateBadge: { backgroundColor: "#22c55e20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tvaRateText: { color: "#22c55e", fontSize: 12, fontWeight: "800" },
    annualGrid: { gap: 0 },
    annualItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#33415540" },
    annualLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
    annualValue: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },

    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 16, marginTop: 8, marginBottom: 10 },

    monthScroll: { paddingHorizontal: 16, marginBottom: 16 },
    monthChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1e293b", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: "#334155" },
    monthChipActive: { backgroundColor: "#0f172a" },
    monthChipText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },

    detailCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 20, padding: 20, gap: 16 },
    detailHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    detailMonth: { color: "#f8fafc", fontSize: 20, fontWeight: "900" },
    detailSubtitle: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 3 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: "800" },

    computeSection: { backgroundColor: "#0f172a", borderRadius: 14, padding: 14, gap: 8 },
    computeTitle: { color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },
    computeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    computeTotal: { borderTopWidth: 1, borderTopColor: "#334155", marginTop: 4, paddingTop: 8 },
    computeLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
    computeValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },

    netTvaCard: { backgroundColor: "#f59e0b10", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#f59e0b30" },
    netTvaLabel: { color: "#f59e0b", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    netTvaFormula: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 8 },
    netTvaValue: { color: "#f59e0b", fontSize: 30, fontWeight: "900", marginTop: 4 },
    netTvaNote: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 8, textAlign: "center" },

    actionRow: { flexDirection: "row", gap: 10 },
    exportBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, backgroundColor: "#3b82f6", borderRadius: 12 },
    exportBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    markPaidBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, backgroundColor: "#22c55e", borderRadius: 12 },
    markPaidText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    calendarHint: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#a855f715", marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#a855f730" },
    calendarText: { color: "#94a3b8", fontSize: 12, fontWeight: "600", flex: 1 },
});
