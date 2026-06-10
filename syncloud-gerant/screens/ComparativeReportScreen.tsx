// ─── ComparativeReportScreen — Side-by-side Period Comparison ─────────────────
// Allows comparing Period 1 (selected) vs Period 2 (the identical preceding period).
// Displays side-by-side comparative bars, values, and percentage changes.

import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import DateRangeFilter, { DateRange } from "../components/DateRangeFilter";
import SkeletonLoader from "../components/SkeletonLoader";
import { subDays, format } from "date-fns";
import { fr } from "date-fns/locale";

interface MetricRange {
    from: string;
    to: string;
    revenue: number;
    profit: number;
    ordersCount: number;
    expenses: number;
}

interface ComparisonData {
    range1: MetricRange;
    range2: MetricRange;
}

export default function ComparativeReportScreen() {
    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 6),
        to: new Date(),
        key: "7days",
    });
    const [data, setData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchComparison = useCallback(async () => {
        try {
            const r1From = dateRange.from.toISOString().split("T")[0];
            const r1To = dateRange.to.toISOString().split("T")[0];
            const path = `/gerant/comparative?range1From=${r1From}&range1To=${r1To}`;
            const result: ComparisonData = await apiFetch(path);
            setData(result);
        } catch (e) {
            console.error("[ComparativeReport]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateRange]);

    useEffect(() => {
        setLoading(true);
        fetchComparison();
    }, [dateRange, fetchComparison]);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const getPctChange = (v1: number, v2: number) => {
        if (v2 === 0) return v1 > 0 ? 100 : 0;
        return Math.round(((v1 - v2) / v2) * 100);
    };

    const renderMetricComparison = (
        title: string,
        val1: number,
        val2: number,
        icon: string,
        color: string,
        isExpense = false
    ) => {
        const change = getPctChange(val1, val2);
        const isPositive = change >= 0;
        // For expenses, positive change is bad (red), negative change is good (green)
        const isGood = isExpense ? !isPositive : isPositive;
        const changeColor = isGood ? Colors.accent.green : Colors.accent.red;
        
        // Calculate relative width of comparison bar
        const maxVal = Math.max(val1, val2, 1);
        const barWidth1 = (val1 / maxVal) * 100;
        const barWidth2 = (val2 / maxVal) * 100;

        return (
            <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                    <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
                        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                    </View>
                    <Text style={styles.metricTitle}>{title}</Text>
                    
                    <View style={[
                        styles.changeBadge, 
                        { backgroundColor: `${changeColor}15` }
                    ]}>
                        <MaterialCommunityIcons 
                            name={change >= 0 ? "arrow-up" : "arrow-down"} 
                            size={12} 
                            color={changeColor} 
                        />
                        <Text style={[styles.changeText, { color: changeColor }]}>
                            {change >= 0 ? "+" : ""}{change}%
                        </Text>
                    </View>
                </View>

                {/* Values row */}
                <View style={styles.valuesRow}>
                    <View style={styles.valueCol}>
                        <Text style={styles.valueLabel}>Période Actuelle</Text>
                        <Text style={[styles.valueText, { color: Colors.text.primary }]}>
                            {fmt(val1)} {title === "Commandes" ? "cmd" : "DA"}
                        </Text>
                    </View>
                    <View style={[styles.valueCol, styles.alignRight]}>
                        <Text style={styles.valueLabel}>Période Précédente</Text>
                        <Text style={[styles.valueText, { color: Colors.text.secondary }]}>
                            {fmt(val2)} {title === "Commandes" ? "cmd" : "DA"}
                        </Text>
                    </View>
                </View>

                {/* Visual side-by-side horizontal bars */}
                <View style={styles.barsContainer}>
                    <View style={styles.barRow}>
                        <View style={[styles.barFill, { width: `${barWidth1}%`, backgroundColor: color }]} />
                    </View>
                    <View style={styles.barRow}>
                        <View style={[styles.barFill, { width: `${barWidth2}%`, backgroundColor: Colors.border.subtle }]} />
                    </View>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.bg.primary }}>
                <View style={{ paddingTop: 16 }}>
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                </View>
                <SkeletonLoader type="list" rows={5} />
            </View>
        );
    }

    const formatDateNice = (dStr: string) => {
        return format(new Date(dStr), "dd MMM yyyy", { locale: fr });
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchComparison();
                        }}
                        tintColor={Colors.accent.green}
                    />
                }
            >
                {/* Date Picker */}
                <View style={{ paddingTop: 16 }}>
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                </View>

                {data && (
                    <>
                        {/* Period Explanation Card */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <View style={[styles.colorLegend, { backgroundColor: Colors.accent.blue }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoLabel}>Période Actuelle :</Text>
                                    <Text style={styles.infoValue}>
                                        {formatDateNice(data.range1.from)} au {formatDateNice(data.range1.to)}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.infoRow, { marginTop: 10 }]}>
                                <View style={[styles.colorLegend, { backgroundColor: Colors.border.subtle }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoLabel}>Période Précédente :</Text>
                                    <Text style={styles.infoValue}>
                                        {formatDateNice(data.range2.from)} au {formatDateNice(data.range2.to)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Comparative Cards */}
                        <Text style={styles.sectionTitle}>METRICS COMPARATIVES</Text>
                        
                        {renderMetricComparison(
                            "Chiffre d'Affaires",
                            data.range1.revenue,
                            data.range2.revenue,
                            "chart-line",
                            Colors.accent.blue
                        )}

                        {renderMetricComparison(
                            "Bénéfice Net",
                            data.range1.profit,
                            data.range2.profit,
                            "cash",
                            Colors.accent.green
                        )}

                        {renderMetricComparison(
                            "Dépenses",
                            data.range1.expenses,
                            data.range2.expenses,
                            "receipt",
                            Colors.accent.red,
                            true
                        )}

                        {renderMetricComparison(
                            "Commandes",
                            data.range1.ordersCount,
                            data.range2.ordersCount,
                            "cart-outline",
                            Colors.accent.purple
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    infoCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    colorLegend: {
        width: 12,
        height: 12,
        borderRadius: 4,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.text.muted,
        textTransform: "uppercase",
    },
    infoValue: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.text.primary,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        letterSpacing: 2,
        paddingHorizontal: 16,
        marginTop: 24,
        marginBottom: 10,
        textTransform: "uppercase",
    },
    metricCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
        gap: 12,
    },
    metricHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    metricTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.text.primary,
        flex: 1,
    },
    changeBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 2,
    },
    changeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    valuesRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    valueCol: {
        flex: 1,
    },
    alignRight: {
        alignItems: "flex-end",
    },
    valueLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    valueText: {
        fontSize: 16,
        fontWeight: "800",
        marginTop: 4,
    },
    barsContainer: {
        gap: 6,
        marginTop: 4,
    },
    barRow: {
        height: 6,
        backgroundColor: "rgba(0,0,0,0.15)",
        borderRadius: 3,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        borderRadius: 3,
    },
});
