// ─── NotificationCenterScreen — Proactive Business Alerts & Feeds ─────────────
// Pulls notifications from /gerant/notifications, manages read/unread state
// locally using AsyncStorage, and allows filtering by Toutes, Stock, Finance, Ventes, Système.

import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Alert, Platform
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import SkeletonLoader from "../components/SkeletonLoader";

interface NotificationItem {
    id: string;
    type: "STOCK" | "FINANCE" | "VENTES" | "SYSTEME";
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    timestamp: string;
    data?: any;
}

type FilterType = "ALL" | "STOCK" | "FINANCE" | "VENTES" | "SYSTEME";

export default function NotificationCenterScreen({ navigation }: any) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>("ALL");

    // Load read notifications list from storage
    const loadReadState = async () => {
        try {
            const stored = await AsyncStorage.getItem("read_notification_ids");
            if (stored) {
                setReadIds(JSON.parse(stored));
            }
        } catch (e) {
            console.warn("[Notifications] Error loading read states:", e);
        }
    };

    const fetchNotifications = useCallback(async () => {
        try {
            await loadReadState();
            const result = await apiFetch("/gerant/notifications");
            setNotifications(result.notifications || []);
        } catch (e) {
            console.error("[Notifications]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        if (readIds.includes(id)) return;
        const newReadIds = [...readIds, id];
        setReadIds(newReadIds);
        try {
            await AsyncStorage.setItem("read_notification_ids", JSON.stringify(newReadIds));
            // Optional: call read API to be compliant
            await apiFetch("/gerant/notifications/read", { method: "POST" }).catch(() => {});
        } catch (e) {
            console.warn(e);
        }
    };

    const markAllAsRead = async () => {
        const unreadItems = notifications.filter(n => !readIds.includes(n.id));
        if (unreadItems.length === 0) return;
        const newReadIds = [...readIds, ...unreadItems.map(n => n.id)];
        setReadIds(newReadIds);
        try {
            await AsyncStorage.setItem("read_notification_ids", JSON.stringify(newReadIds));
            await apiFetch("/gerant/notifications/read", { method: "POST" }).catch(() => {});
            Alert.alert("✅ Succès", "Toutes les notifications sont marquées comme lues");
        } catch (e) {
            console.warn(e);
        }
    };

    const clearAll = async () => {
        // Reset local storage for testing/clearing
        setReadIds([]);
        await AsyncStorage.removeItem("read_notification_ids");
        fetchNotifications();
    };

    const getSeverityDetails = (severity: string) => {
        if (severity === "critical") return { color: Colors.accent.red, icon: "alert-decagram" };
        if (severity === "warning") return { color: Colors.accent.amber, icon: "alert" };
        return { color: Colors.accent.blue, icon: "information" };
    };

    const getTypeIcon = (type: string) => {
        if (type === "STOCK") return "cube-outline";
        if (type === "FINANCE") return "cash-multiple";
        if (type === "VENTES") return "file-document-outline";
        return "cogs";
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === "ALL") return true;
        return n.type === filter;
    });

    const unreadCount = filteredNotifications.filter(n => !readIds.includes(n.id)).length;

    if (loading && !refreshing) {
        return (
            <View style={styles.loaderContainer}>
                <SkeletonLoader type="list" rows={6} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filter Tabs Header */}
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {[
                        { label: "Toutes", value: "ALL" as FilterType },
                        { label: "Stock", value: "STOCK" as FilterType },
                        { label: "Finance", value: "FINANCE" as FilterType },
                        { label: "Ventes", value: "VENTES" as FilterType },
                        { label: "Système", value: "SYSTEME" as FilterType },
                    ].map((t) => {
                        const isActive = filter === t.value;
                        return (
                            <TouchableOpacity
                                key={t.value}
                                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                                onPress={() => setFilter(t.value)}
                            >
                                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Actions Bar */}
            <View style={styles.actionsBar}>
                <Text style={styles.unreadCountText}>
                    {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </Text>
                <View style={styles.actionsRight}>
                    <TouchableOpacity onPress={markAllAsRead} style={styles.actionLink}>
                        <Ionicons name="checkmark-done" size={16} color={Colors.accent.green} />
                        <Text style={[styles.actionLinkText, { color: Colors.accent.green }]}>Tout lire</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearAll} style={[styles.actionLink, { marginLeft: 16 }]}>
                        <Ionicons name="trash-outline" size={16} color={Colors.text.muted} />
                        <Text style={[styles.actionLinkText, { color: Colors.text.muted }]}>Réinitialiser</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed Scroll */}
            <ScrollView
                style={styles.feedScroll}
                contentContainerStyle={styles.feedContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchNotifications();
                        }}
                        tintColor={Colors.accent.green}
                    />
                }
            >
                {filteredNotifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="bell-off-outline" size={56} color={Colors.text.muted} />
                        <Text style={styles.emptyText}>Aucune notification</Text>
                        <Text style={styles.emptySubtitle}>Tout est calme pour le moment !</Text>
                    </View>
                ) : (
                    filteredNotifications.map((n) => {
                        const isRead = readIds.includes(n.id);
                        const severity = getSeverityDetails(n.severity);
                        
                        return (
                            <TouchableOpacity
                                key={n.id}
                                style={[styles.card, isRead && styles.cardRead]}
                                activeOpacity={0.8}
                                onPress={() => markAsRead(n.id)}
                            >
                                {/* Unread indicator dot */}
                                {!isRead && <View style={styles.unreadDot} />}

                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconWrapper, { backgroundColor: `${severity.color}15` }]}>
                                        <MaterialCommunityIcons name={severity.icon as any} size={20} color={severity.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, isRead && styles.textRead]}>
                                            {n.title}
                                        </Text>
                                        <Text style={styles.timestamp}>
                                            {new Date(n.timestamp).toLocaleDateString("fr-FR", {
                                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name={getTypeIcon(n.type)} size={16} color={Colors.text.muted} />
                                </View>

                                <Text style={[styles.message, isRead && styles.textRead]}>
                                    {n.message}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
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
    loaderContainer: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    tabContainer: {
        backgroundColor: Colors.bg.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.subtle,
        paddingVertical: 10,
    },
    tabScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tabBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: Colors.bg.primary,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    tabBtnActive: {
        backgroundColor: Colors.accent.blue,
        borderColor: Colors.accent.blue,
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.text.secondary,
    },
    tabBtnTextActive: {
        color: "#ffffff",
    },
    actionsBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.subtle,
    },
    unreadCountText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.text.secondary,
    },
    actionsRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionLink: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    actionLinkText: {
        fontSize: 12,
        fontWeight: "700",
    },
    feedScroll: {
        flex: 1,
    },
    feedContent: {
        paddingVertical: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 120,
        gap: 10,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.text.primary,
    },
    emptySubtitle: {
        fontSize: 12,
        color: Colors.text.muted,
        fontWeight: "500",
    },
    card: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
        position: "relative",
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardRead: {
        opacity: 0.7,
        backgroundColor: "rgba(30,41,59,0.4)",
    },
    unreadDot: {
        position: "absolute",
        top: 18,
        left: 8,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.accent.blue,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.text.primary,
    },
    timestamp: {
        fontSize: 10,
        color: Colors.text.muted,
        marginTop: 2,
        fontWeight: "500",
    },
    message: {
        fontSize: 12,
        color: Colors.text.secondary,
        lineHeight: 18,
        fontWeight: "500",
    },
    textRead: {
        color: Colors.text.muted,
    },
});
