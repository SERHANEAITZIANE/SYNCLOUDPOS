// ─── ProductDashboardScreen — Per-Product Sales & Stock Intelligence ─────────
// Displays product list sorted by sales volume, revenue, margin %, or stock levels.
// Shows 30-day quantity sold, margin %, current stock levels, and daily velocity.

import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, RefreshControl, Platform
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import SkeletonLoader from "../components/SkeletonLoader";

interface ProductMetrics {
    id: string;
    name: string;
    categoryName: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    qtySold30d: number;
    revenue30d: number;
    marginDA: number;
    marginPct: number;
    velocity: number; // qty sold per day
    status: "OUT_OF_STOCK" | "LOW_STOCK" | "OK";
}

type SortOption = "best_seller_revenue" | "best_seller_qty" | "highest_margin" | "lowest_stock";

export default function ProductDashboardScreen() {
    const [products, setProducts] = useState<ProductMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filters & Sorting
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortOption>("best_seller_revenue");

    const fetchProducts = useCallback(async () => {
        try {
            const querySearch = encodeURIComponent(search);
            const path = `/gerant/product-dashboard?sort=${sort}&search=${querySearch}`;
            const result = await apiFetch(path);
            setProducts(result.products || []);
        } catch (e) {
            console.error("[ProductDashboard]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, sort]);

    useEffect(() => {
        // debounce search to avoid spamming the API
        const delayDebounceFn = setTimeout(() => {
            setLoading(true);
            fetchProducts();
        }, search ? 400 : 0);

        return () => clearTimeout(delayDebounceFn);
    }, [search, sort, fetchProducts]);

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const getStatusStyle = (status: string) => {
        if (status === "OUT_OF_STOCK") return { bg: `${Colors.accent.red}15`, text: Colors.accent.red, label: "Rupture" };
        if (status === "LOW_STOCK") return { bg: `${Colors.accent.amber}15`, text: Colors.accent.amber, label: "Stock Bas" };
        return { bg: `${Colors.accent.green}15`, text: Colors.accent.green, label: "Disponible" };
    };

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={Colors.text.muted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un produit..."
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

            {/* Sort row */}
            <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Trier par :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
                    {[
                        { label: "Ventes (CA)", value: "best_seller_revenue" as SortOption },
                        { label: "Quantité vendue", value: "best_seller_qty" as SortOption },
                        { label: "Marge %", value: "highest_margin" as SortOption },
                        { label: "Stock bas", value: "lowest_stock" as SortOption },
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
                </ScrollView>
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
                                fetchProducts();
                            }}
                            tintColor={Colors.accent.green}
                        />
                    }
                >
                    {products.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="cube-outline" size={48} color={Colors.text.muted} />
                            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
                        </View>
                    ) : (
                        products.map((p) => {
                            const badge = getStatusStyle(p.status);
                            return (
                                <View key={p.id} style={styles.productCard}>
                                    <View style={styles.productHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.productName}>{p.name}</Text>
                                            <Text style={styles.categoryName}>{p.categoryName}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                            <Text style={[styles.statusText, { color: badge.text }]}>
                                                {badge.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* 30 day performance stats */}
                                    <View style={styles.performanceGrid}>
                                        <View style={styles.perfItem}>
                                            <Text style={styles.perfLabel}>Revenus (30j)</Text>
                                            <Text style={styles.perfValue}>{fmt(p.revenue30d)} DA</Text>
                                            <Text style={styles.perfSub}>{p.qtySold30d} unités vendues</Text>
                                        </View>
                                        <View style={styles.perfItem}>
                                            <Text style={styles.perfLabel}>Marge moyenne</Text>
                                            <Text style={[styles.perfValue, { color: Colors.accent.green }]}>
                                                {p.marginPct}%
                                            </Text>
                                            <Text style={styles.perfSub}>+{fmt(p.marginDA)} DA / unité</Text>
                                        </View>
                                    </View>

                                    {/* Stock details */}
                                    <View style={styles.stockFooter}>
                                        <View style={styles.stockInfo}>
                                            <MaterialCommunityIcons name="archive-outline" size={14} color={Colors.text.secondary} />
                                            <Text style={styles.stockText}>
                                                Stock: <Text style={{ color: p.stock <= p.minStock ? Colors.accent.amber : Colors.text.primary, fontWeight: "bold" }}>{p.stock}</Text> u. (min: {p.minStock})
                                            </Text>
                                        </View>
                                        <View style={styles.stockInfo}>
                                            <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={14} color={Colors.text.secondary} />
                                            <Text style={styles.stockText}>
                                                Vélocité: <Text style={{ color: Colors.text.primary, fontWeight: "bold" }}>{p.velocity}</Text> u./jour
                                            </Text>
                                        </View>
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
    sortContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        marginVertical: 12,
    },
    sortLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        marginRight: 10,
        textTransform: "uppercase",
    },
    sortScroll: {
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
    productCard: {
        backgroundColor: Colors.bg.card,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border.card,
        gap: 12,
    },
    productHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    productName: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.text.primary,
    },
    categoryName: {
        fontSize: 11,
        color: Colors.text.muted,
        fontWeight: "500",
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
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
    stockFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: Colors.border.subtle,
        paddingTop: 8,
    },
    stockInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    stockText: {
        fontSize: 11,
        color: Colors.text.secondary,
    },
});
