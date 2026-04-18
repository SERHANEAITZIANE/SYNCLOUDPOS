import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, RefreshControl, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

interface Client {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    balance: number;
    clientType?: string;
}

export default function ClientsScreen({ navigation }: any) {
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchClients = useCallback(async () => {
        try {
            const data = await apiFetch("/clients?limit=200");
            setClients(data.clients);
            setFilteredClients(data.clients);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredClients(clients);
        } else {
            const q = search.toLowerCase();
            setFilteredClients(
                clients.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    c.phone?.includes(q) ||
                    c.address?.toLowerCase().includes(q) ||
                    c.city?.toLowerCase().includes(q)
                )
            );
        }
    }, [search, clients]);

    const getBalanceColor = (balance: number) => {
        if (balance <= 0) return "#22c55e";
        if (balance < 50000) return "#f59e0b";
        return "#ef4444";
    };

    const renderClient = ({ item }: { item: Client }) => {
        const balance = Number(item.balance);
        const balColor = getBalanceColor(balance);

        return (
            <TouchableOpacity
                style={styles.clientCard}
                onPress={() => navigation.navigate("ClientDetail", { clientId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <View style={styles.clientMeta}>
                        {item.address && (
                            <Text style={styles.clientAddress} numberOfLines={1}>
                                📍 {item.address}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.clientRight}>
                    <Text style={[styles.clientBalance, { color: balColor }]}>
                        {balance.toLocaleString("fr-FR")}
                    </Text>
                    <Text style={styles.clientBalanceUnit}>DA</Text>
                    <View style={styles.clientActions}>
                        {item.phone && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(`tel:${item.phone}`)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="call" size={18} color="#3b82f6" />
                            </TouchableOpacity>
                        )}
                        <Ionicons name="chevron-forward" size={18} color="#475569" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchWrapper}>
                <Ionicons name="search" size={18} color="#64748b" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un client..."
                    placeholderTextColor="#64748b"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons name="close-circle" size={18} color="#64748b" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                    {filteredClients.length} clients
                </Text>
                <Text style={styles.summaryBalance}>
                    Total solde: {filteredClients.reduce((s, c) => s + Number(c.balance), 0).toLocaleString("fr-FR")} DA
                </Text>
            </View>

            {/* List */}
            <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={renderClient}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchClients(); }}
                        tintColor="#3b82f6"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color="#475569" />
                        <Text style={styles.emptyText}>Aucun client trouvé</Text>
                    </View>
                }
            />

            {/* Quick Actions FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate("CreateBL", {})}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },

    searchWrapper: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", margin: 16, marginBottom: 0,
        paddingHorizontal: 14, borderRadius: 14,
        borderWidth: 1, borderColor: "#334155",
    },
    searchInput: { flex: 1, height: 46, color: "#f8fafc", marginLeft: 10, fontSize: 15 },

    summaryRow: {
        flexDirection: "row", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 10,
    },
    summaryText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
    summaryBalance: { color: "#64748b", fontSize: 13 },

    clientCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", borderRadius: 14,
        padding: 14, marginBottom: 8,
    },
    clientAvatar: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "#334155", justifyContent: "center", alignItems: "center",
    },
    clientAvatarText: { color: "#94a3b8", fontSize: 18, fontWeight: "800" },
    clientInfo: { flex: 1, marginLeft: 12 },
    clientName: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    clientMeta: { marginTop: 2 },
    clientAddress: { color: "#64748b", fontSize: 12 },

    clientRight: { alignItems: "flex-end" },
    clientBalance: { fontSize: 16, fontWeight: "800" },
    clientBalanceUnit: { color: "#64748b", fontSize: 10, fontWeight: "600" },
    clientActions: { flexDirection: "row", gap: 8, marginTop: 6 },

    fab: {
        position: "absolute", bottom: 24, right: 24,
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center",
        shadowColor: "#2563eb", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },

    emptyContainer: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: "#64748b", fontSize: 16, marginTop: 12 },
});
