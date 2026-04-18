import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, RefreshControl, Alert, Linking, Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { useLangStore } from "../lib/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DeliveryProof from "../components/DeliveryProof";

interface TourStop {
    id: string;
    sortOrder: number;
    status: string;
    customer: {
        id: string;
        name: string;
        phone?: string;
        address?: string;
        city?: string;
        balance: number;
    };
    salesOrderId?: string;
    paymentAmount: number;
    returnAmount: number;
    notes?: string;
}

interface Tour {
    id: string;
    name?: string;
    date: string;
    status: string;
    stops: TourStop[];
    stopsCount: number;
    completedStops: number;
    totalSales: number;
}

export default function TourneeScreen({ navigation }: any) {
    const { t } = useLangStore();
    const [tours, setTours] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTour, setActiveTour] = useState<Tour | null>(null);

    // Delivery proof modal
    const [proofVisible, setProofVisible] = useState(false);
    const [proofStop, setProofStop] = useState<TourStop | null>(null);

    const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
        PENDING: { label: t("pending"), color: "#64748b", icon: "time-outline" },
        EN_ROUTE: { label: t("enRoute"), color: "#f59e0b", icon: "navigate-outline" },
        DELIVERED: { label: t("delivered"), color: "#22c55e", icon: "checkmark-circle" },
        ABSENT: { label: t("absent"), color: "#ef4444", icon: "close-circle" },
        SKIPPED: { label: t("skipped"), color: "#8b5cf6", icon: "play-skip-forward" },
        PARTIAL: { label: t("partial"), color: "#f97316", icon: "alert-circle" },
    };

    const fetchTours = useCallback(async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const data = await apiFetch(`/tours?date=${today}`);
            setTours(data);
            const active = data.find((t: Tour) => t.status === "IN_PROGRESS") || data[0];
            setActiveTour(active || null);
        } catch (e: any) {
            Alert.alert(t("error"), e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchTours(); }, [fetchTours]);

    const handleStartTour = async (tourId: string) => {
        try {
            await apiFetch(`/tours/${tourId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "IN_PROGRESS" }),
            });
            Vibration.vibrate(100);
            fetchTours();
        } catch (e: any) {
            Alert.alert(t("error"), e.message);
        }
    };

    const handleCloseTour = async (tourId: string) => {
        Alert.alert(
            t("closeTour"),
            t("closeConfirm"),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("close"),
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await apiFetch(`/tours/${tourId}`, {
                                method: "PATCH",
                                body: JSON.stringify({ status: "COMPLETED" }),
                            });
                            Vibration.vibrate(200);
                            fetchTours();
                        } catch (e: any) {
                            Alert.alert(t("error"), e.message);
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleStopStatus = async (tourId: string, stopId: string, status: string) => {
        try {
            await apiFetch(`/tours/${tourId}/stops/${stopId}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            Vibration.vibrate(50);
            fetchTours();
        } catch (e: any) {
            Alert.alert(t("error"), e.message);
        }
    };

    // Delivery proof flow
    const handleDeliveryPress = (stop: TourStop) => {
        setProofStop(stop);
        setProofVisible(true);
    };

    const handleDeliveryConfirm = async (photoUri?: string) => {
        setProofVisible(false);
        if (proofStop && activeTour) {
            await handleStopStatus(activeTour.id, proofStop.id, "DELIVERED");
        }
        setProofStop(null);
    };

    const navigateToClient = async (address: string) => {
        const encoded = encodeURIComponent(address);
        try {
            const provider = await AsyncStorage.getItem("setting_mapsProvider");
            if (provider === "waze") {
                Linking.openURL(`https://waze.com/ul?q=${encoded}&navigate=yes`);
            } else if (provider === "osm") {
                Linking.openURL(`geo:0,0?q=${encoded}`);
            } else {
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
            }
        } catch {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
        }
    };

    const openWhatsApp = (phone: string) => {
        const cleaned = phone.replace(/\s+/g, "").replace(/^0/, "213");
        Linking.openURL(`https://wa.me/${cleaned}`);
    };

    const renderStop = ({ item, index }: { item: TourStop; index: number }) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
        const balance = Number(item.customer.balance);

        return (
            <View style={styles.stopCard}>
                {/* Index badge */}
                <View style={[styles.stopIndex, { backgroundColor: config.color }]}>
                    <Text style={styles.stopIndexText}>{index + 1}</Text>
                </View>

                <View style={styles.stopContent}>
                    {/* Header */}
                    <View style={styles.stopHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stopName}>{item.customer.name}</Text>
                            {item.customer.address && (
                                <Text style={styles.stopAddress}>{item.customer.address}</Text>
                            )}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: config.color + "20" }]}>
                            <Ionicons name={config.icon as any} size={14} color={config.color} />
                            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                        </View>
                    </View>

                    {/* Balance + Contact */}
                    <View style={styles.stopMeta}>
                        <Text style={[styles.balanceText, balance > 0 ? styles.balanceRed : styles.balanceGreen]}>
                            {t("balance")}: {balance.toLocaleString("fr-FR")} DA
                        </Text>
                        <View style={styles.contactBtns}>
                            {item.customer.phone && (
                                <>
                                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.customer.phone}`)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="call-outline" size={18} color="#3b82f6" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openWhatsApp(item.customer.phone!)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Actions */}
                    {item.status === "PENDING" || item.status === "EN_ROUTE" ? (
                        <View style={styles.stopActions}>
                            {item.customer.address && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.actionNav]}
                                    onPress={() => navigateToClient(item.customer.address!)}
                                >
                                    <Ionicons name="navigate" size={16} color="#fff" />
                                    <Text style={styles.actionBtnText}>{t("gps")}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBL]}
                                onPress={() => navigation.navigate("CreateBL", {
                                    customerId: item.customer.id,
                                    customerName: item.customer.name,
                                    tourStopId: item.id,
                                    tourId: activeTour?.id,
                                })}
                            >
                                <Ionicons name="document-text" size={16} color="#fff" />
                                <Text style={styles.actionBtnText}>{t("bl")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionPay]}
                                onPress={() => navigation.navigate("Payment", {
                                    customerId: item.customer.id,
                                    customerName: item.customer.name,
                                    balance: balance,
                                    tourStopId: item.id,
                                })}
                            >
                                <Ionicons name="cash" size={16} color="#fff" />
                                <Text style={styles.actionBtnText}>{t("pay")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionReturn]}
                                onPress={() => navigation.navigate("Return", {
                                    customerId: item.customer.id,
                                    customerName: item.customer.name,
                                    tourStopId: item.id,
                                })}
                            >
                                <Ionicons name="return-down-back" size={16} color="#fff" />
                                <Text style={styles.actionBtnText}>{t("returnLabel")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionDone]}
                                onPress={() => handleDeliveryPress(item)}
                            >
                                <Ionicons name="checkmark" size={16} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionAbsent]}
                                onPress={() => handleStopStatus(activeTour!.id, item.id, "ABSENT")}
                            >
                                <Ionicons name="close" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.stopDoneRow}>
                            {item.paymentAmount > 0 && (
                                <Text style={styles.doneStat}>💰 {item.paymentAmount.toLocaleString()} DA</Text>
                            )}
                            {item.returnAmount > 0 && (
                                <Text style={styles.doneStat}>🔄 {item.returnAmount.toLocaleString()} DA</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (!activeTour) {
        return (
            <View style={styles.center}>
                <Ionicons name="map-outline" size={64} color="#475569" />
                <Text style={styles.emptyTitle}>{t("noTourToday")}</Text>
                <Text style={styles.emptySubtitle}>{t("createFromWeb")}</Text>
            </View>
        );
    }

    // Completed tour summary
    if (activeTour.status === "COMPLETED") {
        const delivered = activeTour.stops.filter(s => s.status === "DELIVERED").length;
        const absent = activeTour.stops.filter(s => s.status === "ABSENT").length;
        return (
            <View style={styles.container}>
                <View style={styles.completedCard}>
                    <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                    <Text style={styles.completedTitle}>{t("completedDay")}</Text>
                    <Text style={styles.completedSub}>{activeTour.name || t("tourOfDay")}</Text>
                    <View style={styles.completedStats}>
                        <View style={styles.completedStat}>
                            <Text style={styles.completedStatVal}>{delivered}</Text>
                            <Text style={styles.completedStatLabel}>{t("deliveredLbl")}</Text>
                        </View>
                        <View style={styles.completedStat}>
                            <Text style={[styles.completedStatVal, { color: "#ef4444" }]}>{absent}</Text>
                            <Text style={styles.completedStatLabel}>{t("absentLbl")}</Text>
                        </View>
                        <View style={styles.completedStat}>
                            <Text style={[styles.completedStatVal, { color: "#3b82f6" }]}>
                                {activeTour.totalSales?.toLocaleString("fr-FR") || "0"}
                            </Text>
                            <Text style={styles.completedStatLabel}>DA</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    const progress = activeTour.stopsCount > 0
        ? Math.round((activeTour.completedStops / activeTour.stopsCount) * 100)
        : 0;

    return (
        <View style={styles.container}>
            {/* Tour Header */}
            <View style={styles.tourHeader}>
                <View style={styles.tourHeaderLeft}>
                    <Text style={styles.tourName}>{activeTour.name || t("tourOfDay")}</Text>
                    <Text style={styles.tourMeta}>
                        {activeTour.completedStops}/{activeTour.stopsCount} {t("clients")}
                    </Text>
                </View>
                <View style={styles.tourHeaderRight}>
                    {activeTour.status === "PLANNED" ? (
                        <TouchableOpacity
                            style={styles.startBtn}
                            onPress={() => handleStartTour(activeTour.id)}
                        >
                            <Ionicons name="play" size={18} color="#fff" />
                            <Text style={styles.startBtnText}>{t("start")}</Text>
                        </TouchableOpacity>
                    ) : progress === 100 && activeTour.status === "IN_PROGRESS" ? (
                        <TouchableOpacity
                            style={[styles.startBtn, { backgroundColor: "#10b981", paddingHorizontal: 12 }]}
                            onPress={() => handleCloseTour(activeTour.id)}
                        >
                            <Ionicons name="checkmark-done" size={18} color="#fff" />
                            <Text style={styles.startBtnText}>{t("close")}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.progressBadge}>
                            <Text style={styles.progressText}>{progress}%</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            {/* Tour global actions */}
            <View style={styles.tourGlobalActions}>
                <TouchableOpacity
                    style={styles.loadTruckBtn}
                    onPress={() => navigation.navigate("TruckLoad", { tourId: activeTour.id, tourName: activeTour.name })}
                >
                    <Ionicons name="cube-outline" size={20} color="#fff" />
                    <Text style={styles.loadTruckBtnText}>{t("truckLoad")}</Text>
                </TouchableOpacity>
            </View>

            {/* Stops list */}
            <FlatList
                data={activeTour.stops}
                keyExtractor={(item) => item.id}
                renderItem={renderStop}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchTours(); }}
                        tintColor="#3b82f6"
                    />
                }
            />

            {/* Delivery Proof Modal */}
            <DeliveryProof
                visible={proofVisible}
                customerName={proofStop?.customer.name || ""}
                onConfirm={handleDeliveryConfirm}
                onClose={() => { setProofVisible(false); setProofStop(null); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
    emptyTitle: { color: "#94a3b8", fontSize: 18, fontWeight: "700", marginTop: 16 },
    emptySubtitle: { color: "#64748b", fontSize: 14, marginTop: 4, textAlign: "center", paddingHorizontal: 32 },

    // Completed tour
    completedCard: {
        flex: 1, justifyContent: "center", alignItems: "center", padding: 32,
    },
    completedTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "900", marginTop: 16 },
    completedSub: { color: "#64748b", fontSize: 14, marginTop: 4 },
    completedStats: { flexDirection: "row", gap: 24, marginTop: 32 },
    completedStat: { alignItems: "center" },
    completedStatVal: { color: "#22c55e", fontSize: 32, fontWeight: "900" },
    completedStatLabel: { color: "#64748b", fontSize: 12, marginTop: 4 },

    // Tour Header
    tourHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    },
    tourHeaderLeft: {},
    tourHeaderRight: {},
    tourName: { color: "#f8fafc", fontSize: 18, fontWeight: "800" },
    tourMeta: { color: "#64748b", fontSize: 13, marginTop: 2 },
    startBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#22c55e", paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 12,
    },
    startBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    progressBadge: {
        backgroundColor: "#3b82f6", borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6,
    },
    progressText: { color: "#fff", fontSize: 14, fontWeight: "800" },

    // Progress bar
    progressBar: {
        height: 4, backgroundColor: "#1e293b", marginHorizontal: 16,
        borderRadius: 2, overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: "#3b82f6", borderRadius: 2 },

    // Global Actions
    tourGlobalActions: {
        flexDirection: "row", paddingHorizontal: 16, marginTop: 12,
    },
    loadTruckBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: "#8b5cf6", paddingVertical: 12, borderRadius: 12,
    },
    loadTruckBtnText: {
        color: "#fff", fontSize: 14, fontWeight: "700",
    },

    // Stop card
    stopCard: {
        flexDirection: "row", backgroundColor: "#1e293b",
        borderRadius: 16, marginBottom: 12, overflow: "hidden",
    },
    stopIndex: {
        width: 36, justifyContent: "center", alignItems: "center",
    },
    stopIndexText: { color: "#fff", fontSize: 14, fontWeight: "800" },
    stopContent: { flex: 1, padding: 14 },
    stopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    stopName: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    stopAddress: { color: "#64748b", fontSize: 12, marginTop: 2 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    statusText: { fontSize: 11, fontWeight: "700" },

    // Meta
    stopMeta: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginTop: 8,
    },
    balanceText: { fontSize: 13, fontWeight: "600" },
    balanceRed: { color: "#ef4444" },
    balanceGreen: { color: "#22c55e" },
    contactBtns: { flexDirection: "row", gap: 12 },

    // Actions
    stopActions: {
        flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap",
    },
    actionBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    },
    actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    actionNav: { backgroundColor: "#6366f1" },
    actionBL: { backgroundColor: "#3b82f6" },
    actionPay: { backgroundColor: "#22c55e" },
    actionReturn: { backgroundColor: "#f59e0b" },
    actionDone: { backgroundColor: "#059669", paddingHorizontal: 8 },
    actionAbsent: { backgroundColor: "#ef4444", paddingHorizontal: 8 },

    // Done row
    stopDoneRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    doneStat: { color: "#94a3b8", fontSize: 12 },
});
