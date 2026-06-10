import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, Share, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import SkeletonLoader from "../components/SkeletonLoader";
import HapticButton from "../components/HapticButton";

interface WeeklyData {
    metrics: {
        revenue: number;
        profit: number;
        expenses: number;
        newDebt: number;
        stockAlerts: number;
    };
    comparison: {
        revenueChange: number;
        profitChange: number;
        expensesChange: number;
        debtChange: number;
    };
    aiSummary: string;
    period: {
        start: string;
        end: string;
    };
}

export default function WeeklySummaryScreen() {
    const [data, setData] = useState<WeeklyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const fetchWeeklySummary = useCallback(async () => {
        try {
            const result: WeeklyData = await apiFetch("/gerant/weekly-summary");
            setData(result);
        } catch (e) {
            console.error("[WeeklySummary] Fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchWeeklySummary();
    }, [fetchWeeklySummary]);

    const handleSharePDF = async () => {
        if (!data) return;
        setExporting(true);
        try {
            const htmlContent = `
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
                        .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 16px; margin-bottom: 24px; }
                        .logo { font-size: 24px; font-weight: bold; color: #16a34a; letter-spacing: 1px; }
                        .title { font-size: 20px; font-weight: 800; margin-top: 8px; }
                        .period { font-size: 13px; color: #64748b; margin-top: 4px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                        .card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                        .card-label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                        .card-value { font-size: 18px; font-weight: 800; margin-top: 6px; }
                        .card-sub { font-size: 11px; margin-top: 4px; }
                        .up { color: #16a34a; }
                        .down { color: #dc2626; }
                        .ai-section { background-color: #f0fdf4; border: 1px dashed #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
                        .ai-title { font-size: 14px; font-weight: bold; color: #16a34a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
                        .ai-text { font-size: 13px; line-height: 1.6; color: #334155; }
                        .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">SYNCLOUD POS</div>
                        <div class="title">Rapport Hebdomadaire du Gérant</div>
                        <div class="period">Période du ${data.period.start} au ${data.period.end}</div>
                    </div>
                    
                    <div class="ai-section">
                        <div class="ai-title">✨ Synthèse du Conseiller IA</div>
                        <div class="ai-text">${data.aiSummary}</div>
                    </div>

                    <div class="grid">
                        <div class="card">
                            <div class="card-label">Chiffre d'Affaires</div>
                            <div class="card-value">${fmt(data.metrics.revenue)} DA</div>
                            <div class="card-sub ${data.comparison.revenueChange >= 0 ? "up" : "down"}">
                                ${data.comparison.revenueChange >= 0 ? "▲" : "▼"} ${Math.abs(data.comparison.revenueChange)}% vs. sem. dern.
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-label">Bénéfice Net</div>
                            <div class="card-value">${fmt(data.metrics.profit)} DA</div>
                            <div class="card-sub ${data.comparison.profitChange >= 0 ? "up" : "down"}">
                                ${data.comparison.profitChange >= 0 ? "▲" : "▼"} ${Math.abs(data.comparison.profitChange)}% vs. sem. dern.
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-label">Dépenses Enregistrées</div>
                            <div class="card-value">${fmt(data.metrics.expenses)} DA</div>
                            <div class="card-sub ${data.comparison.expensesChange <= 0 ? "up" : "down"}">
                                ${data.comparison.expensesChange <= 0 ? "▼" : "▲"} ${Math.abs(data.comparison.expensesChange)}% vs. sem. dern.
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-label">Nouvelles Créances</div>
                            <div class="card-value">${fmt(data.metrics.newDebt)} DA</div>
                            <div class="card-sub ${data.comparison.debtChange <= 0 ? "up" : "down"}">
                                ${data.comparison.debtChange <= 0 ? "▼" : "▲"} ${Math.abs(data.comparison.debtChange)}% vs. sem. dern.
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        Généré automatiquement par SynCloud Gérant.<br/>
                        Document confidentiel destiné à la direction commerciale.
                    </div>
                </body>
                </html>
            `;

            // Convert to PDF
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            
            // Share the generated PDF
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: "application/pdf",
                    dialogTitle: `Rapport Hebdomadaire ${data.period.start} - ${data.period.end}`,
                    UTI: "com.adobe.pdf"
                });
            } else {
                Alert.alert("Partage indisponible", "Le partage de fichiers n'est pas disponible sur votre appareil.");
            }
        } catch (err: any) {
            Alert.alert("Erreur", "Impossible de générer le rapport PDF.");
            console.error(err);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <SkeletonLoader type="list" rows={5} />;
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Ionicons name="bar-chart-outline" size={48} color={Colors.accent.green} />
                <Text style={styles.emptyText}>Rapport indisponible</Text>
                <Text style={styles.emptySubText}>Impossible de charger le résumé hebdomadaire.</Text>
            </View>
        );
    }

    const { metrics, comparison, aiSummary, period } = data;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.bg.primary }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchWeeklySummary(); }}
                        tintColor={Colors.accent.green}
                    />
                }
            >
                {/* Period Banner */}
                <View style={styles.periodCard}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.accent.green} />
                    <Text style={styles.periodText}>Résumé du {period.start} au {period.end}</Text>
                </View>

                {/* AI Advisor Box */}
                <View style={styles.aiCard}>
                    <View style={styles.aiHeader}>
                        <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={16} color="#fff" />
                        </View>
                        <Text style={styles.aiTitle}>Synthèse Hebdomadaire IA</Text>
                    </View>
                    <Text style={styles.aiText}>{aiSummary}</Text>
                </View>

                <Text style={styles.sectionTitle}>METRIQUES CLÉS</Text>

                {/* 2x2 Metrics Grid */}
                <View style={styles.grid}>
                    <View style={styles.metricCard}>
                        <Text style={styles.cardLabel}>Chiffre d'Affaires</Text>
                        <Text style={styles.cardValue}>{fmt(metrics.revenue)} DA</Text>
                        <View style={styles.changeRow}>
                            <Ionicons
                                name={comparison.revenueChange >= 0 ? "arrow-up" : "arrow-down"}
                                size={12}
                                color={comparison.revenueChange >= 0 ? Colors.accent.green : Colors.accent.red}
                            />
                            <Text style={[styles.changeText, { color: comparison.revenueChange >= 0 ? Colors.accent.green : Colors.accent.red }]}>
                                {Math.abs(comparison.revenueChange)}% vs. sem. dern.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.cardLabel}>Bénéfice Net</Text>
                        <Text style={styles.cardValue}>{fmt(metrics.profit)} DA</Text>
                        <View style={styles.changeRow}>
                            <Ionicons
                                name={comparison.profitChange >= 0 ? "arrow-up" : "arrow-down"}
                                size={12}
                                color={comparison.profitChange >= 0 ? Colors.accent.green : Colors.accent.red}
                            />
                            <Text style={[styles.changeText, { color: comparison.profitChange >= 0 ? Colors.accent.green : Colors.accent.red }]}>
                                {Math.abs(comparison.profitChange)}% vs. sem. dern.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.cardLabel}>Dépenses</Text>
                        <Text style={styles.cardValue}>{fmt(metrics.expenses)} DA</Text>
                        <View style={styles.changeRow}>
                            <Ionicons
                                name={comparison.expensesChange <= 0 ? "arrow-down" : "arrow-up"}
                                size={12}
                                color={comparison.expensesChange <= 0 ? Colors.accent.green : Colors.accent.red}
                            />
                            <Text style={[styles.changeText, { color: comparison.expensesChange <= 0 ? Colors.accent.green : Colors.accent.red }]}>
                                {Math.abs(comparison.expensesChange)}% vs. sem. dern.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metricCard}>
                        <Text style={styles.cardLabel}>Nouvelles Créances</Text>
                        <Text style={styles.cardValue}>{fmt(metrics.newDebt)} DA</Text>
                        <View style={styles.changeRow}>
                            <Ionicons
                                name={comparison.debtChange <= 0 ? "arrow-down" : "arrow-up"}
                                size={12}
                                color={comparison.debtChange <= 0 ? Colors.accent.green : Colors.accent.red}
                            />
                            <Text style={[styles.changeText, { color: comparison.debtChange <= 0 ? Colors.accent.green : Colors.accent.red }]}>
                                {Math.abs(comparison.debtChange)}% vs. sem. dern.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stock alerts summary badge */}
                {metrics.stockAlerts > 0 && (
                    <View style={styles.alertCard}>
                        <Ionicons name="alert-circle" size={18} color={Colors.accent.red} />
                        <Text style={styles.alertText}>Vous avez {metrics.stockAlerts} produits en rupture cette semaine.</Text>
                    </View>
                )}

                {/* Export Button */}
                <HapticButton
                    style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
                    onPress={handleSharePDF}
                    disabled={exporting}
                >
                    {exporting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="share-social-sharp" size={20} color="#fff" />
                            <Text style={styles.exportBtnText}>Exporter & Partager le Rapport (PDF)</Text>
                        </>
                    )}
                </HapticButton>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.bg.primary, gap: 12 },
    emptyText: { color: Colors.text.primary, fontSize: 16, fontWeight: "800" },
    emptySubText: { color: Colors.text.muted, fontSize: 12, textAlign: "center" },

    periodCard: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: `${Colors.accent.green}15`, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: `${Colors.accent.green}30`,
        marginBottom: 16,
    },
    periodText: { color: Colors.text.primary, fontSize: 13, fontWeight: "700" },

    aiCard: {
        backgroundColor: Colors.bg.card, borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: `${Colors.accent.green}30`, gap: 12,
        marginBottom: 16,
    },
    aiHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    aiAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.accent.green, justifyContent: "center", alignItems: "center" },
    aiTitle: { color: Colors.accent.green, fontSize: 14, fontWeight: "800" },
    aiText: { color: "#e2e8f0", fontSize: 13, lineHeight: 20, fontWeight: "500" },

    sectionTitle: { ...Typography.sectionTitle, marginHorizontal: 0, marginTop: 8, marginBottom: 12 },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
    metricCard: {
        width: "48%", backgroundColor: Colors.bg.card, borderRadius: 18,
        padding: 14, borderWidth: 1, borderColor: Colors.border.card,
        gap: 6,
    },
    cardLabel: { color: Colors.text.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
    cardValue: { color: Colors.text.primary, fontSize: 16, fontWeight: "900" },
    changeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    changeText: { fontSize: 10, fontWeight: "800" },

    alertCard: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: `${Colors.accent.red}15`, borderRadius: 12,
        padding: 12, borderWidth: 1, borderColor: `${Colors.accent.red}30`,
        marginTop: 16,
    },
    alertText: { color: Colors.accent.red, fontSize: 12, fontWeight: "700" },

    exportBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        height: 52, backgroundColor: Colors.accent.green, borderRadius: 14,
        marginTop: 24,
    },
    exportBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
