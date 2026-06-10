// ─── ClientAnalyticsScreen — Customer Intelligence & Segments ─────────────────
// Allows searching, sorting, and filtering clients by segment (Fidèle, Nouveau, Dormant, Débiteur).
// Displays purchase contribution, order frequency, and last purchase info.

import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, RefreshControl, Linking, Alert, Platform
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import SkeletonLoader from "../components/SkeletonLoader";

interface ClientMetrics {
    id: string;
    name: string;
    phone: string;
    clientType: string;
    debt: number;
    owesUs: boolean;
    totalRevenue: number;
    totalOrders: number;
    daysSinceLastPurchase: number | null;
    lastPurchaseDate: string | null;
    segment: "FIDELE" | "NOUVEAU" | "DORMANT" | "REGULIER" | "INACTIF";
}

interface SegmentStats {
    total: number;
    fidele: number;
    nouveau: number;
    dormant: number;
    debiteurs: number;
}

type SegmentFilter = "all" | "fidele" | "nouveau" | "dormant" | "debiteur";
type SortOption = "revenue" | "debt" | "frequency";

export default function ClientAnalyticsScreen() {
    const [clients, setClients] = useState<ClientMetrics[]>([]);
    const [stats, setStats] = useState<SegmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters & Sorting
    const [search, setSearch] = useState("");
    const [segment, setSegment] = useState<SegmentFilter>("all");
    const [sort, setSort] = useState<SortOption>("revenue");

    const fetchClients = useCallback(async () => {
        try {
            const querySearch = encodeURIComponent(search);
            const path = `/gerant/client-analytics?segment=${segment}&sort=${sort}&search=${querySearch}`;
            const result = await apiFetch(path);
            setClients(result.clients || []);
            setStats(result.stats || null);
        } catch (e) {
            console.error("[ClientAnalytics]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, segment, sort]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setLoading(true);
            fetchClients();
        }, search ? 400 : 0);

        return () => clearTimeout(delayDebounceFn);
    }, [search, segment, sort, fetchClients]);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const getSegmentStyle = (seg: string) => {
        if (seg === "FIDELE") return { bg: `${Colors.accent.purple}15`, text: Colors.accent.purple, label: "Fidèle" };
        if (seg === "NOUVEAU") return { bg: `${Colors.accent.blue}15`, text: Colors.accent.blue, label: "Nouveau" };
        if (seg === "DORMANT") return { bg: `${Colors.accent.red}15`, text: Colors.accent.red, label: "Dormant" };
        if (seg === "INACTIF") return { bg: `${Colors.text.muted}15`, text: Colors.text.muted, label: "Inactif" };
        return { bg: `${Colors.accent.green}15`, text: Colors.accent.green, label: "Régulier" };
    };

    const handleCall = (phone: string) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Erreur", "Appel impossible"));
    };

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={Colors.text.muted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un client..."
                    placeholderTextColor={Colors.text.muted}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Segment stats row */}
            {stats && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    {[
                        { label: "Tous", value: "all" as SegmentFilter, count: stats.total, color: Colors.text.secondary },
                        { label: "Fidèles", value: "fidele" as SegmentFilter, count: stats.fidele, color: Colors.accent.purple },
                        { label: "Nouveaux", value: "nouveau" as SegmentFilter, count: stats.nouveau, color: Colors.accent.blue },
                        { label: "Dormants", value: "dormant" as SegmentFilter, count: stats.dormant, color: Colors.accent.red },
                        { label: "Débiteurs", value: "debiteur" as SegmentFilter, count: stats.debiteurs, color: Colors.accent.amber },
                    ].map((badge) => {
                        const isActive = segment === badge.value;
                        return (
                            <TouchableOpacity
                                key={badge.value}
                                style={[
                                    styles.statsCard,
                                    isActive && { borderColor: badge.color, backgroundColor: `${badge.color}05` }
                                ]}
                                onPress={() => setSegment(badge.value)}
                            >
                                <Text style={[styles.statsCardLabel, { color: badge.color }]}>{badge.label}</Text>
                                <Text style={styles.statsCardCount}>{badge.count}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* Sorting bar */}
            <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Trier par :</Text>
                <View style={styles.sortChips}>
                    {[
                        { label: "Volume CA", value: "revenue" as SortOption },
                        { label: "Dettes", value: "debt" as SortOption },
                        { label: "Commandes", value: "frequency" as SortOption },
                    ].map((opt) => {
                        const isActive = sort === opt.value;
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.sortChip, isActive && styles.sortChipActive]}
                                onPress={() => setSort(opt.value)}
                            >
                                <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Content */}
            {loading && !refreshing ? (
                <View style={{ flex: 1 }}>
                    <SkeletonLoader type="list" rows={6} />
                </View>
            ) : (
                <ScrollView
                    style={styles.listContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchClients();
                            }}
                            tintColor={Colors.accent.green}
                        />
                    }
                >
                    {clients.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="account-search-outline" size={48} color={Colors.text.muted} />
                            <Text style={styles.emptyText}>Aucun client trouvé</Text>
                        </View>
                    ) : (
                        clients.map((c) => {
                            const badge = getSegmentStyle(c.segment);
                            return (
                                <View key={c.id} style={styles.clientCard}>
                                    <View style={styles.clientHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.clientName}>{c.name}</Text>
                                            <Text style={styles.clientPhone}>{c.phone || "Aucun numéro"}</Text>
                                        </View>
                                        <View style={[styles.segmentBadge, { backgroundColor: badge.bg }]}>
                                            <Text style={[styles.segmentText, { color: badge.text }]}>
                                                {badge.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Stats grid */}
                                    <View style={styles.performanceGrid}>
                                        <View style={styles.perfItem}>
                                            <Text style={styles.perfLabel}>Total Ventes</Text>
                                            <Text style={styles.perfValue}>{fmt(c.totalRevenue)} DA</Text>
                                            <Text style={styles.perfSub}>{c.totalOrders} cmd.</Text>
                                        </View>
                                        <View style={styles.perfItem}>
                                            <Text style={styles.perfLabel}>Solde Dettes</Text>
                                            <Text style={[styles.perfValue, { color: c.owesUs ? Colors.accent.red : Colors.text.primary }]}>
                                                {c.debt > 0 ? `${fmt(c.debt)} DA` : "0 DA"}
                                            </Text>
                                            <Text style={styles.perfSub}>{c.owesUs ? "Dette client" : "Solde sain"}</Text>
                                        </View>
                                    </View>

                                    {/* Contact & Last purchase */}
                                    <View style={styles.clientFooter}>
                                        <Text style={styles.lastPurchaseText}>
                                            {c.daysSinceLastPurchase !== null 
                                                ? `Achat: il y a ${c.daysSinceLastPurchase} jours` 
                                                : "Aucun achat enregistré"}
                                        </Text>
                                        {c.phone ? (
                                            <TouchableOpacity 
                                                style={styles.callBtn}
                                                onPress={() => handleCall(c.phone)}
                                            >
                                                <Ionicons name="call" size={14} color={Colors.accent.blue} />
                                                <Text style={styles.callBtnText}>Appeler</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: Colors.text.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    statsScroll: {
        paddingHorizontal: 16,
        gap: 10,
        marginVertical: 12,
        height: 52,
    },
    statsCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border.card,
        paddingHorizontal: 16,
        paddingVertical: 6,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 80,
    },
    statsCardLabel: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    statsCardCount: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.text.primary,
        marginTop: 2,
    },
    sortContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sortLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        marginRight: 10,
        textTransform: "uppercase",
    },
    sortChips: {
        flexDirection: "row",
        gap: 6,
    },
    sortChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.bg.card,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    sortChipActive: {
        backgroundColor: Colors.accent.blue,
        borderColor: Colors.accent.blue,
    },
    sortChipText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.secondary,
    },
    sortChipTextActive: {
        color: "#ffffff",
    },
    listContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
        gap: 8,
    },
    emptyText: {
        fontSize: 13,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    clientCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
        gap: 12,
    },
    clientHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    clientName: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.text.primary,
    },
    clientPhone: {
        fontSize: 11,
        color: Colors.text.muted,
        fontWeight: "500",
        marginTop: 2,
    },
    segmentBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    segmentText: {
        fontSize: 10,
        fontWeight: "800",
    },
    performanceGrid: {
        flexDirection: "row",
        backgroundColor: "rgba(0,0,0,0.15)",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    perfItem: {
        flex: 1,
    },
    perfLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    perfValue: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.text.primary,
        marginTop: 4,
    },
    perfSub: {
        fontSize: 10,
        color: Colors.text.secondary,
        marginTop: 2,
        fontWeight: "500",
    },
    clientFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.border.subtle,
        paddingTop: 8,
    },
    lastPurchaseText: {
        fontSize: 11,
        color: Colors.text.secondary,
        fontWeight: "500",
    },
    callBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    callBtnText: {
        fontSize: 11,
        color: Colors.accent.blue,
        fontWeight: "700",
    },
});
