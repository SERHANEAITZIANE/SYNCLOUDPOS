// ─── GerantDashboardScreen — Premium Business Cockpit ────────────────────────
// Completely redesigned v3.0 dashboard.
// Features:
// - Glassmorphic design with LinearGradients
// - Hero header greeting based on time of day, weather/time emojis, and user names
// - Notification bell with unread badge count from live alerts
// - Reusable AnimatedKPICard row with count-up animations and 7-day sparklines
// - Circular gauge for AI Health Score with factors and Darija insight
// - Live Treasury bar-chart comparison (Cash vs Banque)
// - Live Activity Feed with recent transactions
// - Custom floating quick actions

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, StyleSheet,
    RefreshControl, TouchableOpacity, Animated, Platform, StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../lib/api";
import { useLangStore } from "../lib/i18n";
import { useAuthStore } from "../lib/store";
import { useNotificationStore } from "../lib/notificationStore";
import { isOnline } from "../lib/offline-sync";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import AnimatedKPICard from "../components/AnimatedKPICard";
import SkeletonLoader from "../components/SkeletonLoader";
import VoiceAssistantWidget from "../components/VoiceAssistantWidget";

interface GerantDashboardData {
    revenue: number;
    profit: number;
    expenses: number;
    caisseEspeces: number;
    caisseBanque: number;
    outOfStockCount: number;
    debtorsCount: number;
    totalDebts: number;
    trends: {
        revenueLast7Days: number[];
        profitLast7Days: number[];
        expenseLast7Days: number[];
        revenueChangePercent: number;
        profitChangePercent: number;
        expenseChangePercent: number;
    };
    recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        amount: number;
        timestamp: string;
    }>;
}

export default function GerantDashboardScreen({ navigation }: any) {
    const { t } = useLangStore();
    const { user } = useAuthStore();
    const [data, setData] = useState<GerantDashboardData | null>(null);
    const [alertCount, setAlertCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [online, setOnline] = useState(true);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Greeting based on hour
    const greeting = React.useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return { text: "Bonjour", emoji: "☀️" };
        if (hour >= 12 && hour < 18) return { text: "Bon après-midi", emoji: "🌤️" };
        return { text: "Bonsoir", emoji: "🌙" };
    }, []);

    // ─── AI Business Health Score ───────────────────────────────────────────────
    const healthFactors = React.useMemo(() => {
        if (!data) return [];
        const revenueScore = Math.min(100, Math.round((data.revenue / 500000) * 100));
        const profitMarginPct = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
        const marginScore = Math.min(100, Math.round(profitMarginPct * 4));
        const debtRatio = data.revenue > 0 ? (data.totalDebts / data.revenue) : 0;
        const debtScore = Math.max(0, Math.round((1 - debtRatio * 5) * 100));
        const cashScore = Math.min(100, Math.round(((data.caisseEspeces + data.caisseBanque) / 200000) * 100));
        const stockScore = Math.max(0, 100 - data.outOfStockCount * 20);
        return [
            { label: "CA & Croissance", score: revenueScore },
            { label: "Marge Bénéficiaire", score: marginScore },
            { label: "Ratio Créances", score: debtScore },
            { label: "Trésorerie", score: cashScore },
            { label: "Santé Stock", score: stockScore },
        ];
    }, [data]);

    const healthScore = React.useMemo(() => {
        if (healthFactors.length === 0) return 0;
        return Math.round(healthFactors.reduce((s, f) => s + f.score, 0) / healthFactors.length);
    }, [healthFactors]);

    const aiInsight = React.useMemo(() => {
        if (!data) return "";
        if (healthScore >= 75) return "المؤسسة راها بخير، المبيعات كاينة والخزينة ممتلئة. واصل هكا!";
        if (healthScore >= 50) return "الحالة معقولة، بصح خلي بالك على الديون والمخزون. زيد شوية جهد.";
        return "كاين مشاكل في الخزينة أو الديون، خدم بسرعة باش تحسن الوضعية.";
    }, [healthScore, data]);

    const fetchDashboard = useCallback(async () => {
        try {
            const [result, unreadCount] = await Promise.all([
                apiFetch("/gerant/dashboard"),
                useNotificationStore.getState().fetchUnreadCount().catch(() => 0),
            ]);

            setData({
                revenue: result.today.revenue.total,
                profit: result.today.profit?.total || 0,
                expenses: result.today.expenses.total,
                caisseEspeces: result.treasury.accounts
                    .filter((a: any) => a.type === "CASH")
                    .reduce((s: number, a: any) => s + a.balance, 0),
                caisseBanque: result.treasury.accounts
                    .filter((a: any) => a.type !== "CASH")
                    .reduce((s: number, a: any) => s + a.balance, 0),
                outOfStockCount: result.stock.lowStockCount,
                debtorsCount: result.debts.clientDebtorCount,
                totalDebts: result.debts.clientsOweUs,
                trends: result.trends || {
                    revenueLast7Days: [],
                    profitLast7Days: [],
                    expenseLast7Days: [],
                    revenueChangePercent: 0,
                    profitChangePercent: 0,
                    expenseChangePercent: 0,
                },
                recentActivity: result.recentActivity || [],
            });
            setAlertCount(unreadCount);

            // Animate content fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        } catch (e) {
            console.error("[Dashboard]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fadeAnim]);

    useEffect(() => {
        isOnline().then(setOnline);
        fetchDashboard();
    }, [fetchDashboard]);

    // Treasury Calculations
    const totalTreasury = data ? data.caisseEspeces + data.caisseBanque : 0;
    const cashPct = totalTreasury > 0 ? (data!.caisseEspeces / totalTreasury) * 100 : 50;
    const bankPct = totalTreasury > 0 ? (data!.caisseBanque / totalTreasury) * 100 : 50;

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <SkeletonLoader type="dashboard" />
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            {/* Custom Top Header Status Bar */}
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchDashboard();
                        }}
                        tintColor={Colors.accent.green}
                        colors={[Colors.accent.green]}
                        progressBackgroundColor={Colors.bg.card}
                    />
                }
            >
                {/* ─── Hero Header Row ────────────────────────────────────────── */}
                <View style={styles.heroSection}>
                    <View style={styles.heroRow}>
                        <View>
                            <Text style={styles.greetingText}>
                                {greeting.text} {greeting.emoji}
                            </Text>
                            <Text style={styles.userNameText}>{user?.name || "Gérant"}</Text>
                            <Text style={styles.shopNameText}>{user?.tenant?.name || "SynCloud Shop"}</Text>
                        </View>

                        <View style={styles.headerRightActions}>
                            {/* Briefing Button */}
                            <TouchableOpacity
                                style={styles.briefingBtn}
                                onPress={() => navigation.navigate("MorningBrief")}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="sunny" size={16} color={Colors.accent.amber} />
                                <Text style={styles.briefingBtnText}>Briefing IA</Text>
                            </TouchableOpacity>

                            {/* Notification Bell */}
                            <TouchableOpacity
                                style={styles.bellBtn}
                                onPress={() => navigation.navigate("NotificationCenter")}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.text.primary} />
                                {alertCount > 0 && (
                                    <View style={styles.bellBadge}>
                                        <Text style={styles.bellBadgeText}>{alertCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Main animated opacity content wrapper */}
                <Animated.View style={{ opacity: fadeAnim }}>

                    {/* ─── Horizontal Scrollable KPI cards ─────────────────────── */}
                    <Text style={styles.sectionTitle}>SITUATION AUJOURD'HUI</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.kpiScrollContainer}
                    >
                        {data && (
                            <>
                                <AnimatedKPICard
                                    title="Chiffre d'Affaires"
                                    value={data.revenue}
                                    trend={data.trends.revenueChangePercent}
                                    sparklineData={data.trends.revenueLast7Days}
                                    icon="trending-up"
                                    color={Colors.accent.blue}
                                    onPress={() => navigation.navigate("SalesAnalytics")}
                                />
                                <AnimatedKPICard
                                    title="Bénéfice Net"
                                    value={data.profit}
                                    trend={data.trends.profitChangePercent}
                                    sparklineData={data.trends.profitLast7Days}
                                    icon="cash"
                                    color={Colors.accent.green}
                                    onPress={() => navigation.navigate("ProfitReport")}
                                />
                                <AnimatedKPICard
                                    title="Dépenses Période"
                                    value={data.expenses}
                                    trend={data.trends.expenseChangePercent}
                                    sparklineData={data.trends.expenseLast7Days}
                                    icon="receipt"
                                    color={Colors.accent.red}
                                    onPress={() => navigation.navigate("GerantExpenses")}
                                />
                                <AnimatedKPICard
                                    title="Créances Clients"
                                    value={data.totalDebts}
                                    trend={undefined}
                                    sparklineData={undefined}
                                    icon="account-arrow-left"
                                    color={Colors.accent.amber}
                                    onPress={() => navigation.navigate("ClientDebts")}
                                />
                            </>
                        )}
                    </ScrollView>

                    {/* ─── Circular gauge for AI Health Score ──────────────────── */}
                    <Text style={styles.sectionTitle}>SCORE DE SANTÉ</Text>
                    <View style={styles.healthCard}>
                        <View style={styles.healthGaugeRow}>
                            <View style={styles.gaugeContainer}>
                                <View style={[styles.gaugeTrack, {
                                    borderColor: healthScore >= 75 ? `${Colors.accent.green}20` : healthScore >= 50 ? `${Colors.accent.amber}20` : `${Colors.accent.red}20`
                                }]}>
                                    <View style={[styles.gaugeOverlay, {
                                        borderColor: healthScore >= 75 ? Colors.accent.green : healthScore >= 50 ? Colors.accent.amber : Colors.accent.red
                                    }]}>
                                        <Text style={[styles.gaugeScoreNum, {
                                            color: healthScore >= 75 ? Colors.accent.green : healthScore >= 50 ? Colors.accent.amber : Colors.accent.red
                                        }]}>
                                            {healthScore}
                                        </Text>
                                        <Text style={styles.gaugeScoreSub}>/100</Text>
                                    </View>
                                </View>
                                <Text style={[styles.gaugeLabel, {
                                    color: healthScore >= 75 ? Colors.accent.green : healthScore >= 50 ? Colors.accent.amber : Colors.accent.red
                                }]}>
                                    {healthScore >= 75 ? "🟢 En Bonne Santé" : healthScore >= 50 ? "🟡 Moyen" : "🔴 Attention"}
                                </Text>
                            </View>

                            <View style={styles.healthFactors}>
                                {healthFactors.map((f, i) => (
                                    <View key={i} style={styles.factorRow}>
                                        <Text style={styles.factorLabel} numberOfLines={1}>{f.label}</Text>
                                        <View style={styles.factorBarTrack}>
                                            <View style={[styles.factorBarFill, {
                                                width: `${f.score}%`,
                                                backgroundColor: f.score >= 75 ? Colors.accent.green : f.score >= 50 ? Colors.accent.amber : Colors.accent.red,
                                            }]} />
                                        </View>
                                        <Text style={styles.factorScore}>{f.score}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.insightRow, { borderColor: healthScore >= 75 ? `${Colors.accent.green}20` : `${Colors.accent.red}20` }]}>
                            <MaterialCommunityIcons name="robot" size={18} color={Colors.accent.green} style={styles.insightIcon} />
                            <Text style={styles.insightText}>"{aiInsight}"</Text>
                        </View>
                    </View>

                    {/* ─── Treasury split bar comparison ───────────────────────── */}
                    <Text style={styles.sectionTitle}>RÉPARTITION TRÉSORERIE</Text>
                    <View style={styles.treasuryCard}>
                        <View style={styles.treasuryBarContainer}>
                            <View style={[styles.treasuryBarFill, { width: `${cashPct}%`, backgroundColor: Colors.accent.green }]} />
                            <View style={[styles.treasuryBarFill, { width: `${bankPct}%`, backgroundColor: Colors.accent.blue }]} />
                        </View>

                        <View style={styles.treasuryDetailsRow}>
                            <View style={styles.treasuryLegendItem}>
                                <View style={[styles.legendIndicator, { backgroundColor: Colors.accent.green }]} />
                                <View>
                                    <Text style={styles.legendTitle}>Espèces (Caisse)</Text>
                                    <Text style={styles.legendValue}>
                                        {data ? data.caisseEspeces.toLocaleString("fr-FR") : 0} DA ({Math.round(cashPct)}%)
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.treasuryLegendItem}>
                                <View style={[styles.legendIndicator, { backgroundColor: Colors.accent.blue }]} />
                                <View>
                                    <Text style={styles.legendTitle}>Banque (CCP/Compte)</Text>
                                    <Text style={styles.legendValue}>
                                        {data ? data.caisseBanque.toLocaleString("fr-FR") : 0} DA ({Math.round(bankPct)}%)
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ─── Live Activity Feed ──────────────────────────────────── */}
                    <Text style={styles.sectionTitle}>DERNIÈRES ACTIVITÉS</Text>
                    <View style={styles.activityCard}>
                        {data && data.recentActivity.length > 0 ? (
                            data.recentActivity.map((act, i) => {
                                const isExpense = act.type === "EXPENSE";
                                const isPos = act.type === "SALE_POS";
                                const color = isExpense ? Colors.accent.red : isPos ? Colors.accent.blue : Colors.accent.green;
                                const icon = isExpense ? "minus-circle" : isPos ? "cash-register" : "file-document-outline";

                                return (
                                    <View key={act.id} style={[styles.activityRow, i === data.recentActivity.length - 1 && styles.lastRow]}>
                                        <View style={[styles.activityIconWrapper, { backgroundColor: `${color}15` }]}>
                                            <MaterialCommunityIcons name={icon} size={18} color={color} />
                                        </View>
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityDesc} numberOfLines={1}>{act.description}</Text>
                                            <Text style={styles.activityTime}>
                                                {new Date(act.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                            </Text>
                                        </View>
                                        <Text style={[styles.activityAmount, { color: isExpense ? Colors.text.primary : color }]}>
                                            {isExpense ? "-" : "+"}{act.amount.toLocaleString("fr-FR")} DA
                                        </Text>
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="clipboard-text-clock" size={36} color={Colors.text.muted} />
                                <Text style={styles.emptyText}>Aucune activité aujourd'hui</Text>
                            </View>
                        )}
                    </View>

                    {/* ─── Floating/Quick Actions Shortcuts ────────────────────── */}
                    <Text style={styles.sectionTitle}>RACCOURCIS RAPIDES</Text>
                    <View style={styles.quickActionsContainer}>
                        {[
                            { icon: "chart-bar", label: "Rapports", color: Colors.accent.blue, nav: "Rapports" },
                            { icon: "file-plus", label: "Créer BL", color: Colors.accent.green, nav: "CreateBL" },
                            { icon: "book-open-variant", label: "Catalogue", color: Colors.accent.green, nav: "Catalog" },
                            { icon: "lock", label: "Clôture", color: Colors.accent.purple, nav: "DailyClose" },
                            { icon: "account-cash", label: "Créances", color: Colors.accent.amber, nav: "ClientDebts" },
                            { icon: "cube-send", label: "Santé Stock", color: Colors.text.secondary, nav: "InventoryHealth" },
                        ].map((a, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.quickActionBtn}
                                onPress={() => navigation.navigate(a.nav)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.quickActionIconWrapper, { backgroundColor: `${a.color}15` }]}>
                                    <MaterialCommunityIcons name={a.icon as any} size={22} color={a.color} />
                                </View>
                                <Text style={styles.quickActionLabel}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                </Animated.View>
            </ScrollView>

            {/* Smart AI Voice Assistant widget */}
            <VoiceAssistantWidget />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
    },
    loaderContainer: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Platform.OS === "ios" ? 100 : 80,
    },
    heroSection: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 50 : 24,
        paddingBottom: 16,
    },
    heroRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    greetingText: {
        ...Typography.caption,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    userNameText: {
        ...Typography.h2,
        fontWeight: "bold",
        color: Colors.text.primary,
        marginTop: 2,
    },
    shopNameText: {
        ...Typography.caption,
        color: Colors.accent.green,
        fontWeight: "700",
        marginTop: 1,
    },
    headerRightActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    briefingBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${Colors.accent.amber}15`,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${Colors.accent.amber}30`,
        marginRight: 12,
    },
    briefingBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.accent.amber,
        marginLeft: 4,
    },
    bellBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.bg.card,
        borderWidth: 1,
        borderColor: Colors.border.card,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    bellBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.accent.red,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 3,
    },
    bellBadgeText: {
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "bold",
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        letterSpacing: 2,
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 8,
        textTransform: "uppercase",
    },
    kpiScrollContainer: {
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 4,
    },
    healthCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 2,
    },
    healthGaugeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    gaugeContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    gaugeTrack: {
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    gaugeOverlay: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    gaugeScoreNum: {
        fontSize: 22,
        fontWeight: "900",
    },
    gaugeScoreSub: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "700",
    },
    gaugeLabel: {
        fontSize: 11,
        fontWeight: "800",
        marginTop: 6,
    },
    healthFactors: {
        flex: 1,
        gap: 8,
    },
    factorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    factorLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.text.secondary,
        width: 75,
    },
    factorBarTrack: {
        flex: 1,
        height: 6,
        backgroundColor: Colors.border.subtle,
        borderRadius: 3,
        overflow: "hidden",
    },
    factorBarFill: {
        height: "100%",
        borderRadius: 3,
    },
    factorScore: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.text.primary,
        width: 20,
        textAlign: "right",
    },
    insightRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        gap: 8,
    },
    insightIcon: {
        marginTop: 1,
    },
    insightText: {
        flex: 1,
        fontSize: 11,
        color: Colors.text.secondary,
        fontStyle: "italic",
        fontWeight: "500",
        lineHeight: 16,
    },
    treasuryCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
        gap: 12,
    },
    treasuryBarContainer: {
        height: 10,
        backgroundColor: Colors.border.subtle,
        borderRadius: 5,
        flexDirection: "row",
        overflow: "hidden",
    },
    treasuryBarFill: {
        height: "100%",
    },
    treasuryDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    treasuryLegendItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
    },
    legendIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 3,
    },
    legendTitle: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "700",
    },
    legendValue: {
        fontSize: 11,
        color: Colors.text.primary,
        fontWeight: "600",
        marginTop: 2,
    },
    activityCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    activityRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.subtle,
    },
    lastRow: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    activityIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    activityInfo: {
        flex: 1,
    },
    activityDesc: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.text.primary,
    },
    activityTime: {
        fontSize: 10,
        color: Colors.text.muted,
        marginTop: 2,
    },
    activityAmount: {
        fontSize: 12,
        fontWeight: "700",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    emptyText: {
        fontSize: 12,
        color: Colors.text.muted,
        fontWeight: "500",
    },
    quickActionsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    quickActionBtn: {
        width: "30%",
        alignItems: "center",
        gap: 6,
        marginVertical: 4,
    },
    quickActionIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    quickActionLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.text.secondary,
        textAlign: "center",
    },
});
