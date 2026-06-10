import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Alert, Modal, RefreshControl, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import SkeletonLoader from "../components/SkeletonLoader";
import HapticButton from "../components/HapticButton";

interface GoalsData {
    actuals: {
        revenue: number;
        profit: number;
        expenses: number;
    };
    lastMonth: {
        revenue: number;
        profit: number;
        expenses: number;
    };
    daysRemaining: number;
    daysInMonth: number;
}

const STORAGE_KEY = "@syncloud_gerant_goals";

export default function GoalsScreen() {
    const [data, setData] = useState<GoalsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Goal targets
    const [revenueTarget, setRevenueTarget] = useState(1000000);
    const [profitTarget, setProfitTarget] = useState(300000);
    const [expenseBudget, setExpenseBudget] = useState(150000);

    // Edit modal
    const [editVisible, setEditVisible] = useState(false);
    const [tempRevenue, setTempRevenue] = useState("1000000");
    const [tempProfit, setTempProfit] = useState("300000");
    const [tempExpense, setTempExpense] = useState("150000");

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const loadLocalTargets = async () => {
        try {
            const val = await AsyncStorage.getItem(STORAGE_KEY);
            if (val) {
                const parsed = JSON.parse(val);
                if (parsed.revenueTarget) setRevenueTarget(parsed.revenueTarget);
                if (parsed.profitTarget) setProfitTarget(parsed.profitTarget);
                if (parsed.expenseBudget) setExpenseBudget(parsed.expenseBudget);
            }
        } catch (e) {
            console.error("[Goals] Load local targets error:", e);
        }
    };

    const fetchGoalsData = useCallback(async () => {
        try {
            const result: GoalsData = await apiFetch("/gerant/goals");
            setData(result);

            // If local targets don't exist yet, we can initialize them with last month's suggestions or default multiplier
            const local = await AsyncStorage.getItem(STORAGE_KEY);
            if (!local && result.lastMonth) {
                const suggRev = result.lastMonth.revenue > 0 ? Math.round(result.lastMonth.revenue * 1.1) : 1000000;
                const suggProf = result.lastMonth.profit > 0 ? Math.round(result.lastMonth.profit * 1.1) : 300000;
                const suggExp = result.lastMonth.expenses > 0 ? Math.round(result.lastMonth.expenses * 1.05) : 150000;

                setRevenueTarget(suggRev);
                setProfitTarget(suggProf);
                setExpenseBudget(suggExp);

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                    revenueTarget: suggRev,
                    profitTarget: suggProf,
                    expenseBudget: suggExp
                }));
            }
        } catch (e) {
            console.error("[Goals] Fetch actuals error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadLocalTargets().then(() => fetchGoalsData());
    }, [fetchGoalsData]);

    const handleSaveTargets = async () => {
        const rev = parseInt(tempRevenue, 10);
        const prof = parseInt(tempProfit, 10);
        const exp = parseInt(tempExpense, 10);

        if (isNaN(rev) || isNaN(prof) || isNaN(exp) || rev <= 0 || prof <= 0 || exp <= 0) {
            Alert.alert("Erreur", "Veuillez entrer des montants valides.");
            return;
        }

        setRevenueTarget(rev);
        setProfitTarget(prof);
        setExpenseBudget(exp);
        setEditVisible(false);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                revenueTarget: rev,
                profitTarget: prof,
                expenseBudget: exp
            }));
            Alert.alert("✓ Objectifs enregistrés", "Vos objectifs mensuels ont été mis à jour.");
        } catch (e) {
            Alert.alert("Erreur", "Impossible de sauvegarder localement.");
        }
    };

    const openEditModal = () => {
        setTempRevenue(revenueTarget.toString());
        setTempProfit(profitTarget.toString());
        setTempExpense(expenseBudget.toString());
        setEditVisible(true);
    };

    if (loading) {
        return <SkeletonLoader type="list" rows={5} />;
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Ionicons name="sparkles" size={48} color={Colors.accent.green} />
                <Text style={styles.emptyText}>Impossible de charger les indicateurs</Text>
                <Text style={styles.emptySubText}>Vérifiez votre connexion internet.</Text>
            </View>
        );
    }

    const { actuals, daysRemaining, daysInMonth } = data;
    const elapsedDays = daysInMonth - daysRemaining;
    const timeElapsedPct = daysInMonth > 0 ? (elapsedDays / daysInMonth) * 100 : 50;

    // Revenue calculations
    const revProgress = revenueTarget > 0 ? (actuals.revenue / revenueTarget) * 100 : 0;
    const revOnTrack = revProgress >= timeElapsedPct;

    // Profit calculations
    const profitProgress = profitTarget > 0 ? (actuals.profit / profitTarget) * 100 : 0;
    const profitOnTrack = profitProgress >= timeElapsedPct;

    // Expenses calculations
    const expProgress = expenseBudget > 0 ? (actuals.expenses / expenseBudget) * 100 : 0;
    const expOnTrack = expProgress <= timeElapsedPct;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.bg.primary }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchGoalsData(); }}
                        tintColor={Colors.accent.green}
                    />
                }
            >
                {/* Header overview */}
                <View style={styles.timeCard}>
                    <View style={styles.timeLeft}>
                        <Text style={styles.timeTitle}>Progression du mois</Text>
                        <Text style={styles.timeSubtitle}>Il reste {daysRemaining} jours sur {daysInMonth}</Text>
                    </View>
                    <View style={styles.timeRight}>
                        <Text style={styles.timePct}>{Math.round(timeElapsedPct)}%</Text>
                        <Text style={styles.timePctLabel}>Écoulé</Text>
                    </View>
                    <View style={styles.timeBarTrack}>
                        <View style={[styles.timeBarFill, { width: `${timeElapsedPct}%` }]} />
                    </View>
                </View>

                {/* Section title & configure button */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginTop: 0 }]}>OBJECTIFS DE CE MOIS</Text>
                    <HapticButton style={styles.configBtn} onPress={openEditModal}>
                        <Ionicons name="options-outline" size={14} color={Colors.accent.green} />
                        <Text style={styles.configBtnText}>Ajuster</Text>
                    </HapticButton>
                </View>

                {/* Revenue card */}
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <View style={[styles.goalIconWrapper, { backgroundColor: `${Colors.accent.blue}15` }]}>
                            <Ionicons name="trending-up" size={22} color={Colors.accent.blue} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.goalTitle}>Chiffre d'Affaires</Text>
                            <Text style={styles.goalActual}>{fmt(actuals.revenue)} / {fmt(revenueTarget)} DA</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: revOnTrack ? `${Colors.accent.green}15` : `${Colors.accent.amber}15` }]}>
                            <Text style={[styles.statusText, { color: revOnTrack ? Colors.accent.green : Colors.accent.amber }]}>
                                {revOnTrack ? "En avance 🚀" : "En retard ⚠️"}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(revProgress, 100)}%`, backgroundColor: Colors.accent.blue }]} />
                        {/* Time marker indicator */}
                        <View style={[styles.timeMarker, { left: `${timeElapsedPct}%` }]} />
                    </View>
                    <View style={styles.goalFooter}>
                        <Text style={styles.footerLabel}>Taux de réalisation</Text>
                        <Text style={[styles.footerValue, { color: Colors.accent.blue }]}>{Math.round(revProgress)}%</Text>
                    </View>
                </View>

                {/* Profit card */}
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <View style={[styles.goalIconWrapper, { backgroundColor: `${Colors.accent.green}15` }]}>
                            <Ionicons name="stats-chart" size={22} color={Colors.accent.green} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.goalTitle}>Bénéfice Net</Text>
                            <Text style={styles.goalActual}>{fmt(actuals.profit)} / {fmt(profitTarget)} DA</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: profitOnTrack ? `${Colors.accent.green}15` : `${Colors.accent.amber}15` }]}>
                            <Text style={[styles.statusText, { color: profitOnTrack ? Colors.accent.green : Colors.accent.amber }]}>
                                {profitOnTrack ? "En avance 🚀" : "En retard ⚠️"}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(profitProgress, 100)}%`, backgroundColor: Colors.accent.green }]} />
                        <View style={[styles.timeMarker, { left: `${timeElapsedPct}%` }]} />
                    </View>
                    <View style={styles.goalFooter}>
                        <Text style={styles.footerLabel}>Taux de réalisation</Text>
                        <Text style={[styles.footerValue, { color: Colors.accent.green }]}>{Math.round(profitProgress)}%</Text>
                    </View>
                </View>

                {/* Expense card */}
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <View style={[styles.goalIconWrapper, { backgroundColor: `${Colors.accent.red}15` }]}>
                            <Ionicons name="cash-outline" size={22} color={Colors.accent.red} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.goalTitle}>Budget Dépenses</Text>
                            <Text style={styles.goalActual}>{fmt(actuals.expenses)} / {fmt(expenseBudget)} DA</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: expOnTrack ? `${Colors.accent.green}15` : `${Colors.accent.red}15` }]}>
                            <Text style={[styles.statusText, { color: expOnTrack ? Colors.accent.green : Colors.accent.red }]}>
                                {expOnTrack ? "Sous budget ✓" : "Dépassement ⚠️"}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(expProgress, 100)}%`, backgroundColor: Colors.accent.red }]} />
                        <View style={[styles.timeMarker, { left: `${timeElapsedPct}%` }]} />
                    </View>
                    <View style={styles.goalFooter}>
                        <Text style={styles.footerLabel}>Consommé</Text>
                        <Text style={[styles.footerValue, { color: Colors.accent.red }]}>{Math.round(expProgress)}%</Text>
                    </View>
                </View>

                {/* Suggestions block based on last month */}
                {data.lastMonth && (
                    <>
                        <Text style={styles.sectionTitle}>SUGGESTIONS IA (MOIS DERNIER)</Text>
                        <View style={styles.suggestionsCard}>
                            <View style={styles.suggRow}>
                                <Ionicons name="arrow-redo-outline" size={16} color={Colors.text.muted} />
                                <Text style={styles.suggText}>CA le mois dernier : <Text style={styles.suggVal}>{fmt(data.lastMonth.revenue)} DA</Text></Text>
                            </View>
                            <View style={styles.suggRow}>
                                <Ionicons name="arrow-redo-outline" size={16} color={Colors.text.muted} />
                                <Text style={styles.suggText}>Profit le mois dernier : <Text style={styles.suggVal}>{fmt(data.lastMonth.profit)} DA</Text></Text>
                            </View>
                            <View style={styles.suggRow}>
                                <Ionicons name="arrow-redo-outline" size={16} color={Colors.text.muted} />
                                <Text style={styles.suggText}>Dépenses le mois dernier : <Text style={styles.suggVal}>{fmt(data.lastMonth.expenses)} DA</Text></Text>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Config modal */}
            <Modal
                visible={editVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ajuster les Objectifs</Text>
                            <TouchableOpacity onPress={() => setEditVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Objectif Chiffre d'Affaires (DA)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    keyboardType="numeric"
                                    value={tempRevenue}
                                    onChangeText={setTempRevenue}
                                    placeholder="ex: 1200000"
                                    placeholderTextColor="#475569"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Objectif Bénéfice Net (DA)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    keyboardType="numeric"
                                    value={tempProfit}
                                    onChangeText={setTempProfit}
                                    placeholder="ex: 400000"
                                    placeholderTextColor="#475569"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Budget Dépenses Maximum (DA)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    keyboardType="numeric"
                                    value={tempExpense}
                                    onChangeText={setTempExpense}
                                    placeholder="ex: 100000"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                        </View>

                        <HapticButton style={styles.saveBtn} onPress={handleSaveTargets}>
                            <Ionicons name="checkmark-sharp" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Enregistrer</Text>
                        </HapticButton>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.bg.primary, gap: 12 },
    emptyText: { color: Colors.text.primary, fontSize: 16, fontWeight: "800" },
    emptySubText: { color: Colors.text.muted, fontSize: 12, textAlign: "center" },

    timeCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.border.card,
        marginBottom: 20,
    },
    timeLeft: { gap: 4 },
    timeTitle: { color: Colors.text.primary, fontSize: 16, fontWeight: "800" },
    timeSubtitle: { color: Colors.text.muted, fontSize: 12, fontWeight: "600" },
    timeRight: { position: "absolute", top: 16, right: 16, alignItems: "flex-end" },
    timePct: { color: Colors.accent.green, fontSize: 20, fontWeight: "900" },
    timePctLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: "600", marginTop: 2 },
    timeBarTrack: { height: 6, backgroundColor: Colors.bg.input, borderRadius: 3, overflow: "hidden" },
    timeBarFill: { height: "100%", backgroundColor: Colors.accent.green, borderRadius: 3 },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle: { ...Typography.sectionTitle, marginHorizontal: 0 },
    configBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: `${Colors.accent.green}10`, borderWidth: 1, borderColor: `${Colors.accent.green}30` },
    configBtnText: { color: Colors.accent.green, fontSize: 12, fontWeight: "700" },

    goalCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.border.card,
        marginBottom: 12,
    },
    goalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    goalIconWrapper: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    goalTitle: { color: Colors.text.secondary, fontSize: 12, fontWeight: "600" },
    goalActual: { color: Colors.text.primary, fontSize: 16, fontWeight: "900", marginTop: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: "800" },
    progressBarTrack: { height: 8, backgroundColor: Colors.bg.input, borderRadius: 4, position: "relative" },
    progressBarFill: { height: "100%", borderRadius: 4 },
    timeMarker: {
        position: "absolute", top: -4, bottom: -4, width: 2,
        backgroundColor: Colors.text.muted,
        borderRadius: 1, zIndex: 10,
    },
    goalFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerLabel: { color: Colors.text.muted, fontSize: 11, fontWeight: "600" },
    footerValue: { fontSize: 14, fontWeight: "900" },

    suggestionsCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: 20,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    suggRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    suggText: { color: Colors.text.secondary, fontSize: 12, fontWeight: "600" },
    suggVal: { color: Colors.text.primary, fontWeight: "800" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(10, 15, 30, 0.85)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: Colors.bg.elevated, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalTitle: { color: Colors.text.primary, fontSize: 18, fontWeight: "900" },
    modalBody: { gap: 16 },
    inputGroup: { gap: 6 },
    inputLabel: { color: Colors.text.secondary, fontSize: 12, fontWeight: "700" },
    textInput: {
        backgroundColor: Colors.bg.input, borderRadius: 12, height: 48,
        color: Colors.text.primary, paddingHorizontal: 14, borderWidth: 1,
        borderColor: Colors.border.subtle, fontSize: 14, fontWeight: "700",
    },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, backgroundColor: Colors.accent.green, borderRadius: 14 },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
