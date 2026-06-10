import React from "react";
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface FinanceItem {
    id: string;
    icon: string;
    label: string;
    subtitle: string;
    gradient: [string, string];
    nav: string;
}

const FINANCE_SECTIONS: { title: string; items: FinanceItem[] }[] = [
    {
        title: "ANALYSE DES VENTES",
        items: [
            { id: "sales", icon: "trending-up", label: "Ventes & Revenus", subtitle: "CA, tendances, comparaisons", gradient: ["#3b82f6", "#2563eb"], nav: "SalesAnalytics" },
            { id: "profit", icon: "stats-chart", label: "Marges & Rentabilité", subtitle: "Bénéfice brut, net, COGS", gradient: ["#22c55e", "#16a34a"], nav: "ProfitReport" },
        ],
    },
    {
        title: "TRÉSORERIE & DETTES",
        items: [
            { id: "debts", icon: "people", label: "Créances Clients", subtitle: "Vieillissement, relances, soldes", gradient: ["#f59e0b", "#d97706"], nav: "ClientDebts" },
            { id: "suppliers", icon: "business", label: "Grand Livre Fournisseurs", subtitle: "Obligations, paiements, soldes", gradient: ["#8b5cf6", "#7c3aed"], nav: "SupplierLedger" },
            { id: "cashflow", icon: "swap-horizontal", label: "Flux de Trésorerie", subtitle: "Entrées, sorties, solde net", gradient: ["#06b6d4", "#0891b2"], nav: "CashFlow" },
            { id: "cheques", icon: "card", label: "Gestion des Chèques", subtitle: "En attente, encaissés, rejetés", gradient: ["#ec4899", "#db2777"], nav: "ChequeManager" },
        ],
    },
    {
        title: "FISCALITÉ & CLÔTURE",
        items: [
            { id: "g50", icon: "document-text", label: "Déclaration G50 TVA", subtitle: "TVA mensuelle, achats, ventes", gradient: ["#ef4444", "#dc2626"], nav: "G50Tax" },
            { id: "close", icon: "lock-closed", label: "Clôture de Caisse", subtitle: "Comptage, réconciliation, archivage", gradient: ["#a855f7", "#9333ea"], nav: "DailyClose" },
        ],
    },
];

function AnimatedCard({ item, onPress, index }: { item: FinanceItem; onPress: () => void; index: number }) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.card}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardIconWrap}
                >
                    <Ionicons name={item.icon as any} size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function FinanceScreen({ navigation }: any) {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Hero header */}
            <LinearGradient
                colors={["#0a0f1e", "#1a1f3a"]}
                style={styles.hero}
            >
                <View style={styles.heroRow}>
                    <View>
                        <Text style={styles.heroTitle}>Finance</Text>
                        <Text style={styles.heroSubtitle}>Rapports & analyses en temps réel</Text>
                    </View>
                    <View style={styles.heroBadge}>
                        <Ionicons name="pulse" size={18} color="#22c55e" />
                        <Text style={styles.heroBadgeText}>Live</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Sections */}
            {FINANCE_SECTIONS.map((section, si) => (
                <View key={section.title}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, { backgroundColor: FINANCE_SECTIONS[si].items[0].gradient[0] }]} />
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                    </View>
                    <View style={styles.cardList}>
                        {section.items.map((item, i) => (
                            <AnimatedCard
                                key={item.id}
                                item={item}
                                index={i}
                                onPress={() => navigation.navigate(item.nav)}
                            />
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },

    hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    heroTitle: { color: "#f8fafc", fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
    heroSubtitle: { color: "#64748b", fontSize: 13, fontWeight: "600", marginTop: 4 },
    heroBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#22c55e15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#22c55e30" },
    heroBadgeText: { color: "#22c55e", fontSize: 12, fontWeight: "700" },

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
    sectionDot: { width: 6, height: 6, borderRadius: 3 },
    sectionTitle: { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2 },

    cardList: { paddingHorizontal: 16, gap: 8 },
    card: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: "rgba(30,41,59,0.8)",
        borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: "rgba(148,163,184,0.08)",
    },
    cardIconWrap: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: "center", alignItems: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
    },
    cardContent: { flex: 1 },
    cardLabel: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    cardSubtitle: { color: "#64748b", fontSize: 12, fontWeight: "500", marginTop: 2 },
});
