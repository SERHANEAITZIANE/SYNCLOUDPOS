import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import SkeletonLoader from "../components/SkeletonLoader";

interface ActivityEvent {
    id: string;
    type: "sale_pos" | "sale_bl" | "purchase" | "expense";
    title: string;
    description: string;
    amount: number;
    createdAt: string;
}

const TYPE_CONFIG = {
    sale_pos: { icon: "cart-outline", color: Colors.accent.green, label: "Vente POS" },
    sale_bl: { icon: "receipt-outline", color: Colors.accent.blue, label: "Vente BL" },
    purchase: { icon: "cube-outline", color: Colors.accent.amber, label: "Achat" },
    expense: { icon: "cash-outline", color: Colors.accent.red, label: "Dépense" },
};

export default function ActivityHistoryScreen() {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | "sales" | "purchases" | "expenses">("all");

    const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR");

    const fetchEvents = useCallback(async (pageNum: number, isRefresh = false) => {
        try {
            const data = await apiFetch(`/gerant/activity-history?page=${pageNum}&limit=30&type=${filter}`);
            if (data && Array.isArray(data.events)) {
                if (isRefresh || pageNum === 1) {
                    setEvents(data.events);
                } else {
                    setEvents(prev => [...prev, ...data.events]);
                }
                setHasMore(data.hasMore);
                setPage(pageNum);
            }
        } catch (e) {
            console.error("[ActivityHistory] Fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [filter]);

    useEffect(() => {
        setLoading(true);
        fetchEvents(1);
    }, [filter, fetchEvents]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchEvents(1, true);
    };

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        fetchEvents(page + 1);
    };

    const renderEventItem = ({ item, index }: { item: ActivityEvent; index: number }) => {
        const config = TYPE_CONFIG[item.type] || { icon: "help-circle-outline", color: Colors.text.muted, label: "Inconnu" };
        const isNegative = item.amount < 0;
        const formattedDate = new Date(item.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });

        return (
            <View style={styles.timelineRow}>
                {/* Visual Timeline connector */}
                <View style={styles.timelineColumn}>
                    <View style={[styles.timelineIconWrapper, { borderColor: config.color }]}>
                        <Ionicons name={config.icon as any} size={16} color={config.color} />
                    </View>
                    {index < events.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Card Content */}
                <View style={styles.eventCard}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.eventTime}>{formattedDate}</Text>
                        </View>
                        <Text style={[styles.eventAmount, { color: isNegative ? Colors.accent.red : Colors.accent.green }]}>
                            {isNegative ? "-" : "+"}{fmt(item.amount)} DA
                        </Text>
                    </View>
                    <Text style={styles.eventDesc}>{item.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Horizontal Filter Chips */}
            <View style={styles.filterBar}>
                {([
                    { k: "all" as const, l: "Tout" },
                    { k: "sales" as const, l: "Ventes" },
                    { k: "purchases" as const, l: "Achats" },
                    { k: "expenses" as const, l: "Dépenses" },
                ]).map(f => (
                    <TouchableOpacity
                        key={f.k}
                        style={[styles.filterChip, filter === f.k && styles.filterChipActive]}
                        onPress={() => setFilter(f.k)}
                    >
                        <Text style={[styles.filterText, filter === f.k && styles.filterTextActive]}>{f.l}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && page === 1 ? (
                <SkeletonLoader type="list" rows={6} />
            ) : events.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="time-outline" size={48} color={Colors.text.muted} />
                    <Text style={styles.emptyText}>Aucune activité trouvée</Text>
                    <Text style={styles.emptySubText}>Makan hta activité hna lyoum</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
                        <Text style={styles.retryText}>Actualiser</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={item => item.id}
                    renderItem={renderEventItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={Colors.accent.green}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator size="small" color={Colors.accent.green} style={{ marginVertical: 16 }} />
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg.primary },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
    emptyText: { color: Colors.text.primary, fontSize: 16, fontWeight: "800" },
    emptySubText: { color: Colors.text.muted, fontSize: 12, textAlign: "center" },
    retryBtn: { backgroundColor: Colors.accent.green, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
    retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    filterBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.subtle },
    filterChipActive: { backgroundColor: Colors.accent.green, borderColor: Colors.accent.green },
    filterText: { color: Colors.text.secondary, fontSize: 13, fontWeight: "700" },
    filterTextActive: { color: "#fff" },

    listContent: { padding: 16, paddingBottom: 40 },

    timelineRow: { flexDirection: "row", marginBottom: 12 },
    timelineColumn: { width: 32, alignItems: "center", marginRight: 8 },
    timelineIconWrapper: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg.card,
        borderWidth: 2, justifyContent: "center", alignItems: "center", zIndex: 10,
    },
    timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border.subtle, marginVertical: 4 },

    eventCard: {
        flex: 1, backgroundColor: Colors.bg.card, borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: Colors.border.card,
        gap: 6,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
    eventTitle: { color: Colors.text.primary, fontSize: 13, fontWeight: "700", flex: 1 },
    eventTime: { color: Colors.text.dim, fontSize: 10, fontWeight: "600", marginTop: 2 },
    eventAmount: { fontSize: 13, fontWeight: "800" },
    eventDesc: { color: Colors.text.secondary, fontSize: 11, fontWeight: "600" },
});
