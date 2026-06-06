import React from "react";
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../lib/store";
import Constants from "expo-constants";

interface MenuItem {
    icon: string;
    label: string;
    subtitle: string;
    color: string;
    nav: string;
}

const SECTIONS: { title: string; items: MenuItem[] }[] = [
    {
        title: "OPÉRATIONS",
        items: [
            { icon: "document-text-outline", label: "Créer un BL", subtitle: "Bon de livraison rapide", color: "#22c55e", nav: "CreateBL" },
            { icon: "pricetags-outline", label: "Catalogue & Tarifs", subtitle: "Produits, prix, catégories", color: "#3b82f6", nav: "Catalog" },
            { icon: "cart-outline", label: "Achats Fournisseurs", subtitle: "Commandes et réceptions", color: "#8b5cf6", nav: "GerantPurchases" },
            { icon: "receipt-outline", label: "Dépenses", subtitle: "Charges et frais", color: "#f59e0b", nav: "GerantExpenses" },
        ],
    },
    {
        title: "SUIVI & CONTRÔLE",
        items: [
            { icon: "cube-outline", label: "Santé du Stock", subtitle: "Lents, rapides, sur-stockés", color: "#06b6d4", nav: "InventoryHealth" },
            { icon: "car-outline", label: "Performance Livreurs", subtitle: "KPIs des chauffeurs", color: "#ec4899", nav: "DriverMonitor" },
            { icon: "notifications-outline", label: "Alertes", subtitle: "Stock, créances, promos", color: "#ef4444", nav: "Alerts" },
            { icon: "sunny-outline", label: "Briefing du Jour", subtitle: "Résumé IA matinal", color: "#f59e0b", nav: "MorningBrief" },
        ],
    },
    {
        title: "PARAMÈTRES",
        items: [
            { icon: "settings-outline", label: "Paramètres", subtitle: "Langue, IA, alertes e-mail", color: "#64748b", nav: "Settings" },
        ],
    },
];

function AnimatedRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.row}
                onPress={onPress}
                onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start()}
                onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
                activeOpacity={1}
            >
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function MoreScreen({ navigation }: any) {
    const { user, logout } = useAuthStore();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            {/* User card */}
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => navigation.navigate("Settings")}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={["#22c55e", "#16a34a"]}
                    style={styles.avatar}
                >
                    <Ionicons name="person" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.name || "Gérant"}</Text>
                    <Text style={styles.userRole}>{user?.tenant?.name || "SynCloudPOS"}</Text>
                </View>
                <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{user?.role || "ADMIN"}</Text>
                </View>
            </TouchableOpacity>

            {/* Sections */}
            {SECTIONS.map((section) => (
                <View key={section.title}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.sectionCard}>
                        {section.items.map((item, i) => (
                            <React.Fragment key={item.nav}>
                                <AnimatedRow
                                    item={item}
                                    onPress={() => navigation.navigate(item.nav)}
                                />
                                {i < section.items.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            ))}

            {/* Logout */}
            <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                    const { Alert } = require("react-native");
                    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
                        { text: "Annuler", style: "cancel" },
                        { text: "Déconnecter", style: "destructive", onPress: logout },
                    ]);
                }}
            >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>SynCloudPOS Gérant v{Constants.expoConfig?.version || "2.2.1"}</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },

    userCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        margin: 16, padding: 18,
        backgroundColor: "rgba(30,41,59,0.9)",
        borderRadius: 20, borderWidth: 1, borderColor: "rgba(148,163,184,0.08)",
    },
    avatar: {
        width: 52, height: 52, borderRadius: 16,
        justifyContent: "center", alignItems: "center",
    },
    userInfo: { flex: 1 },
    userName: { color: "#f8fafc", fontSize: 17, fontWeight: "800" },
    userRole: { color: "#64748b", fontSize: 12, fontWeight: "500", marginTop: 2 },
    rolePill: {
        backgroundColor: "#22c55e15", paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: "#22c55e30",
    },
    rolePillText: { color: "#22c55e", fontSize: 10, fontWeight: "800" },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 20, marginTop: 20, marginBottom: 10,
    },
    sectionCard: {
        marginHorizontal: 16,
        backgroundColor: "rgba(30,41,59,0.8)",
        borderRadius: 18, borderWidth: 1, borderColor: "rgba(148,163,184,0.08)",
        overflow: "hidden",
    },
    row: {
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: "center", alignItems: "center",
    },
    rowContent: { flex: 1 },
    rowLabel: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
    rowSubtitle: { color: "#64748b", fontSize: 11, fontWeight: "500", marginTop: 1 },
    divider: { height: 1, backgroundColor: "rgba(148,163,184,0.06)", marginLeft: 70 },

    logoutBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, marginHorizontal: 16, marginTop: 28,
        paddingVertical: 14, borderRadius: 14,
        backgroundColor: "rgba(239,68,68,0.08)",
        borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
    },
    logoutText: { color: "#ef4444", fontSize: 14, fontWeight: "700" },

    versionText: { textAlign: "center", color: "#334155", fontSize: 11, marginTop: 16, fontWeight: "600" },
});
