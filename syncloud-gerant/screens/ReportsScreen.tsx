import React, { useState } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Dimensions, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLangStore } from "../lib/i18n";

const { width } = Dimensions.get("window");

interface ReportCard {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    screen: string;
    badge?: string;
}

const reportCards: ReportCard[] = [
    {
        id: "sales",
        title: "Ventes & Revenus",
        subtitle: "Tendances CA, comparaisons, top produits",
        icon: "trending-up",
        color: "#3b82f6",
        screen: "SalesAnalytics",
        badge: "📈",
    },
    {
        id: "profit",
        title: "Marges & Rentabilité",
        subtitle: "Analyse marge brute par produit & catégorie",
        icon: "analytics",
        color: "#22c55e",
        screen: "ProfitReport",
        badge: "💰",
    },
    {
        id: "debts",
        title: "Créances Clients",
        subtitle: "Rapport d'âge, relances WhatsApp, encaissements",
        icon: "people",
        color: "#f59e0b",
        screen: "ClientDebts",
        badge: "🧾",
    },
    {
        id: "daily-close",
        title: "Clôture de Caisse",
        subtitle: "Réconciliation journalière, écarts, archivage",
        icon: "calculator",
        color: "#a855f7",
        screen: "DailyClose",
        badge: "🔐",
    },
    {
        id: "suppliers",
        title: "Grand Livre Fournisseurs",
        subtitle: "Soldes, paiements, historique par fournisseur",
        icon: "business",
        color: "#ef4444",
        screen: "SupplierLedger",
        badge: "🏭",
    },
    {
        id: "cashflow",
        title: "Flux de Trésorerie",
        subtitle: "Projection 7/14/30j, entrées vs sorties",
        icon: "swap-horizontal",
        color: "#34d399",
        screen: "CashFlow",
        badge: "🌊",
    },
    {
        id: "inventory",
        title: "Santé du Stock",
        subtitle: "Valeur, vélocité, stock mort, réapprovisionnement",
        icon: "cube",
        color: "#10b981",
        screen: "InventoryHealth",
        badge: "📦",
    },
    {
        id: "drivers",
        title: "Performance Livreurs",
        subtitle: "BLs, CA par chauffeur, commissions, GPS",
        icon: "car-sport",
        color: "#ec4899",
        screen: "DriverMonitor",
        badge: "🚚",
    },
    {
        id: "g50",
        title: "Déclaration G50 TVA",
        subtitle: "TVA collectée vs déductible, export DGI",
        icon: "receipt",
        color: "#f97316",
        screen: "G50Tax",
        badge: "🇿🇦",
    },
    {
        id: "cheques",
        title: "Gestion des Chèques",
        subtitle: "Received & issued, maturités, alertes",
        icon: "document-text",
        color: "#6366f1",
        screen: "ChequeManager",
        badge: "🏦",
    },
];


export default function ReportsScreen({ navigation }: any) {
    const { t } = useLangStore();

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerIconWrap}>
                        <Ionicons name="bar-chart" size={22} color="#22c55e" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Centre de Rapports</Text>
                        <Text style={styles.headerSubtitle}>Analyses financières & opérationnelles</Text>
                    </View>
                </View>
            </View>

            {/* Quick Stats Bar */}
            <View style={styles.quickBar}>
                <View style={styles.quickItem}>
                    <Text style={styles.quickValue}>10</Text>
                    <Text style={styles.quickLabel}>Rapports</Text>
                </View>
                <View style={styles.quickDivider} />
                <View style={styles.quickItem}>
                    <Text style={[styles.quickValue, { color: "#22c55e" }]}>Live</Text>
                    <Text style={styles.quickLabel}>Données</Text>
                </View>
                <View style={styles.quickDivider} />
                <View style={styles.quickItem}>
                    <Text style={styles.quickValue}>PDF</Text>
                    <Text style={styles.quickLabel}>Export</Text>
                </View>
            </View>

            {/* Report Cards Grid */}
            <View style={styles.grid}>
                {reportCards.map((card) => (
                    <TouchableOpacity
                        key={card.id}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate(card.screen)}
                    >
                        {/* Accent bar */}
                        <View style={[styles.cardAccent, { backgroundColor: card.color }]} />

                        {/* Badge */}
                        <Text style={styles.cardBadge}>{card.badge}</Text>

                        {/* Icon */}
                        <View style={[styles.cardIconWrap, { backgroundColor: `${card.color}20` }]}>
                            <Ionicons name={card.icon as any} size={24} color={card.color} />
                        </View>

                        {/* Content */}
                        <Text style={styles.cardTitle}>{card.title}</Text>
                        <Text style={styles.cardSubtitle}>{card.subtitle}</Text>

                        {/* Arrow */}
                        <View style={styles.cardArrow}>
                            <Ionicons name="chevron-forward" size={16} color="#475569" />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Voice hint */}
            <View style={styles.voiceHint}>
                <Ionicons name="mic-outline" size={18} color="#22c55e" />
                <Text style={styles.voiceHintText}>
                    Astuce : Demandez à l'assistant vocal « وريني تقرير المبيعات » pour un résumé audio
                </Text>
            </View>
        </ScrollView>
    );
}

const cardWidth = (width - 48 - 12) / 2;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },

    header: { padding: 16, paddingTop: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerIconWrap: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: "#22c55e15", justifyContent: "center", alignItems: "center",
    },
    headerTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "900" },
    headerSubtitle: { color: "#64748b", fontSize: 13, marginTop: 2 },

    // Quick stats bar
    quickBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-around",
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 14,
        paddingVertical: 14, marginBottom: 8,
    },
    quickItem: { alignItems: "center" },
    quickValue: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
    quickLabel: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 2 },
    quickDivider: { width: 1, height: 28, backgroundColor: "#334155" },

    // Grid
    grid: {
        flexDirection: "row", flexWrap: "wrap", gap: 12,
        paddingHorizontal: 16, marginTop: 16,
    },
    card: {
        width: cardWidth, backgroundColor: "#1e293b", borderRadius: 18,
        padding: 16, overflow: "hidden", position: "relative",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    cardAccent: {
        position: "absolute", top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    },
    cardBadge: {
        position: "absolute", top: 12, right: 12, fontSize: 20,
    },
    cardIconWrap: {
        width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center",
        marginBottom: 12, marginTop: 4,
    },
    cardTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "800", lineHeight: 18 },
    cardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 6, lineHeight: 15 },
    cardArrow: {
        position: "absolute", bottom: 12, right: 12,
        width: 24, height: 24, borderRadius: 8,
        backgroundColor: "#334155", justifyContent: "center", alignItems: "center",
    },

    // Voice hint
    voiceHint: {
        flexDirection: "row", alignItems: "center", gap: 8,
        marginHorizontal: 16, marginTop: 24,
        backgroundColor: "#22c55e10", borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: "#22c55e20",
    },
    voiceHintText: { color: "#94a3b8", fontSize: 12, flex: 1, lineHeight: 17 },
});
