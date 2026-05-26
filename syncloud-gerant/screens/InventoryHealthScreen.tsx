import React, { useState } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

type InventoryTab = "overview" | "reorder" | "dead";

interface Product {
    id: string;
    name: string;
    category: string;
    stock: number;
    reorderPoint: number;
    avgDailySales: number;
    costPrice: number;
    salePrice: number;
    lastMovement: string; // days ago
}

const PRODUCTS: Product[] = [
    { id: "1", name: "Coca-Cola Canette 33cl", category: "Boissons", stock: 240, reorderPoint: 120, avgDailySales: 45, costPrice: 58, salePrice: 80, lastMovement: "0" },
    { id: "2", name: "Eau Lalla Khedidja 1.5L", category: "Boissons", stock: 580, reorderPoint: 300, avgDailySales: 75, costPrice: 28, salePrice: 35, lastMovement: "0" },
    { id: "3", name: "Jus Ramy Orange 1L", category: "Boissons", stock: 18, reorderPoint: 60, avgDailySales: 20, costPrice: 95, salePrice: 130, lastMovement: "1" },
    { id: "4", name: "Café Prestige 250g", category: "Café & Thé", stock: 0, reorderPoint: 30, avgDailySales: 12, costPrice: 130, salePrice: 200, lastMovement: "3" },
    { id: "5", name: "Lait Soummam 1L", category: "Produits Laitiers", stock: 95, reorderPoint: 100, avgDailySales: 32, costPrice: 38, salePrice: 50, lastMovement: "0" },
    { id: "6", name: "Biscuits Bimo Choco", category: "Biscuits & Snacks", stock: 320, reorderPoint: 80, avgDailySales: 55, costPrice: 40, salePrice: 60, lastMovement: "0" },
    { id: "7", name: "Huile Fleurial 1L", category: "Épicerie", stock: 4, reorderPoint: 50, avgDailySales: 18, costPrice: 120, salePrice: 160, lastMovement: "5" },
    { id: "8", name: "Savon Vénus 125g", category: "Hygiène", stock: 210, reorderPoint: 50, avgDailySales: 8, costPrice: 60, salePrice: 80, lastMovement: "0" },
    { id: "9", name: "Chips Alaouia 100g", category: "Biscuits & Snacks", stock: 45, reorderPoint: 60, avgDailySales: 25, costPrice: 30, salePrice: 50, lastMovement: "2" },
    { id: "10", name: "Thé Vert Touareg 100g", category: "Café & Thé", stock: 88, reorderPoint: 20, avgDailySales: 3, costPrice: 90, salePrice: 130, lastMovement: "12" },
    { id: "11", name: "Paprika Condor 50g", category: "Épicerie", stock: 142, reorderPoint: 30, avgDailySales: 2, costPrice: 45, salePrice: 70, lastMovement: "18" },
    { id: "12", name: "Sucre Cristal 1kg", category: "Épicerie", stock: 200, reorderPoint: 50, avgDailySales: 1, costPrice: 95, salePrice: 130, lastMovement: "35" },
];

// Derived metrics
const daysRemaining = (p: Product) =>
    p.avgDailySales > 0 ? Math.floor(p.stock / p.avgDailySales) : 999;
const isReorderNeeded = (p: Product) => p.stock <= p.reorderPoint;
const isDeadStock = (p: Product) => parseInt(p.lastMovement) >= 30;
const stockHealth = (p: Product) => {
    if (p.stock === 0) return "rupture";
    if (p.stock <= p.reorderPoint) return "low";
    return "ok";
};

const HEALTH_COLORS: Record<string, string> = {
    rupture: "#ef4444",
    low: "#f59e0b",
    ok: "#22c55e",
};

export default function InventoryHealthScreen() {
    const [tab, setTab] = useState<InventoryTab>("overview");

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    // Totals
    const totalStockValue = PRODUCTS.reduce((s, p) => s + p.stock * p.costPrice, 0);
    const totalRetailValue = PRODUCTS.reduce((s, p) => s + p.stock * p.salePrice, 0);
    const outOfStockCount = PRODUCTS.filter(p => p.stock === 0).length;
    const lowStockCount = PRODUCTS.filter(p => p.stock > 0 && isReorderNeeded(p)).length;
    const deadStockCount = PRODUCTS.filter(isDeadStock).length;
    const deadStockValue = PRODUCTS.filter(isDeadStock).reduce((s, p) => s + p.stock * p.costPrice, 0);

    // Category breakdown for stock value
    const categories = [...new Set(PRODUCTS.map(p => p.category))];
    const catData = categories.map(cat => {
        const prods = PRODUCTS.filter(p => p.category === cat);
        return {
            name: cat,
            value: prods.reduce((s, p) => s + p.stock * p.costPrice, 0),
            count: prods.length,
        };
    }).sort((a, b) => b.value - a.value);
    const maxCatValue = Math.max(...catData.map(c => c.value));

    const reorderList = PRODUCTS.filter(isReorderNeeded).sort((a, b) => {
        if (a.stock === 0 && b.stock > 0) return -1;
        if (b.stock === 0 && a.stock > 0) return 1;
        return daysRemaining(a) - daysRemaining(b);
    });

    const deadList = PRODUCTS.filter(isDeadStock).sort((a, b) =>
        parseInt(b.lastMovement) - parseInt(a.lastMovement)
    );

    const CAT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#10b981"];

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Top KPI row */}
            <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { borderLeftColor: "#3b82f6" }]}>
                    <Text style={styles.kpiLabel}>Valeur Stock</Text>
                    <Text style={styles.kpiValue}>{fmt(totalStockValue)}</Text>
                    <Text style={styles.kpiSub}>DA (coût)</Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: "#22c55e" }]}>
                    <Text style={styles.kpiLabel}>Valeur Vente</Text>
                    <Text style={[styles.kpiValue, { color: "#22c55e" }]}>{fmt(totalRetailValue)}</Text>
                    <Text style={styles.kpiSub}>DA (prix vente)</Text>
                </View>
            </View>

            {/* Alert row */}
            <View style={styles.alertRow}>
                <View style={[styles.alertCard, { borderColor: "#ef444440" }]}>
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                    <Text style={styles.alertNum}>{outOfStockCount}</Text>
                    <Text style={styles.alertLabel}>Ruptures</Text>
                </View>
                <View style={[styles.alertCard, { borderColor: "#f59e0b40" }]}>
                    <Ionicons name="alert-circle" size={22} color="#f59e0b" />
                    <Text style={styles.alertNum}>{lowStockCount}</Text>
                    <Text style={styles.alertLabel}>Stock Bas</Text>
                </View>
                <View style={[styles.alertCard, { borderColor: "#94a3b840" }]}>
                    <Ionicons name="archive" size={22} color="#94a3b8" />
                    <Text style={styles.alertNum}>{deadStockCount}</Text>
                    <Text style={styles.alertLabel}>Stock Mort</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {([
                    { k: "overview" as const, label: "Vue d'ensemble" },
                    { k: "reorder" as const, label: `Réappro (${reorderList.length})` },
                    { k: "dead" as const, label: `Stock Mort (${deadList.length})` },
                ]).map(t => (
                    <TouchableOpacity
                        key={t.k}
                        style={[styles.tabBtn, tab === t.k && styles.tabBtnActive]}
                        onPress={() => setTab(t.k)}
                    >
                        <Text style={[styles.tabText, tab === t.k && styles.tabTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Overview Tab */}
            {tab === "overview" && (
                <>
                    <Text style={styles.sectionTitle}>VALEUR PAR CATÉGORIE</Text>
                    <View style={styles.catCard}>
                        {catData.map((cat, i) => (
                            <View key={i} style={styles.catRow}>
                                <View style={[styles.catDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                                <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                                <View style={styles.catBarTrack}>
                                    <View style={[styles.catBarFill, {
                                        width: `${(cat.value / maxCatValue) * 100}%`,
                                        backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                                    }]} />
                                </View>
                                <Text style={styles.catValue}>{fmt(cat.value)} DA</Text>
                            </View>
                        ))}
                    </View>

                    {/* Dead stock alert */}
                    {deadStockValue > 0 && (
                        <View style={styles.deadStockWarning}>
                            <Ionicons name="archive" size={18} color="#94a3b8" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.deadStockTitle}>Stock Mort Immobilisé</Text>
                                <Text style={styles.deadStockSub}>
                                    {fmt(deadStockValue)} DA en produits sans mouvement depuis 30+ jours
                                </Text>
                            </View>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>STATUT TOUS PRODUITS</Text>
                    <View style={styles.productList}>
                        {PRODUCTS.map((p, i) => {
                            const days = daysRemaining(p);
                            const health = stockHealth(p);
                            return (
                                <View key={p.id} style={[styles.productRow, i < PRODUCTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#33415540" }]}>
                                    <View style={[styles.healthDot, { backgroundColor: HEALTH_COLORS[health] }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                        <Text style={styles.productCat}>{p.category}</Text>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={[styles.productStock, { color: HEALTH_COLORS[health] }]}>
                                            {p.stock === 0 ? "RUPTURE" : `${p.stock} unités`}
                                        </Text>
                                        {p.stock > 0 && days < 999 && (
                                            <Text style={styles.productDays}>~{days}j restants</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}

            {/* Reorder Tab */}
            {tab === "reorder" && (
                <>
                    <View style={styles.reorderHint}>
                        <Ionicons name="information-circle-outline" size={16} color="#22c55e" />
                        <Text style={styles.reorderHintText}>
                            Ces produits sont en dessous du seuil de réapprovisionnement ou en rupture.
                        </Text>
                    </View>
                    <View style={styles.productList}>
                        {reorderList.map((p, i) => {
                            const health = stockHealth(p);
                            const days = daysRemaining(p);
                            const suggested = p.reorderPoint * 2;
                            return (
                                <View key={p.id} style={[styles.reorderRow, i < reorderList.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#33415540" }]}>
                                    <View style={styles.reorderLeft}>
                                        <View style={[styles.reorderBadge, { backgroundColor: HEALTH_COLORS[health] + "20" }]}>
                                            <Ionicons
                                                name={p.stock === 0 ? "close-circle" : "alert-circle"}
                                                size={18} color={HEALTH_COLORS[health]}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                            <Text style={styles.productCat}>{p.category}</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={[styles.productStock, { color: HEALTH_COLORS[health] }]}>
                                            {p.stock === 0 ? "RUPTURE" : `${p.stock}/${p.reorderPoint}`}
                                        </Text>
                                        <Text style={styles.reorderSuggested}>Commander: {suggested} u.</Text>
                                        {days < 99 && (
                                            <Text style={styles.productDays}>{days}j restants</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}

            {/* Dead Stock Tab */}
            {tab === "dead" && (
                <>
                    <View style={[styles.reorderHint, { borderColor: "#94a3b840", backgroundColor: "#94a3b810" }]}>
                        <Ionicons name="archive-outline" size={16} color="#94a3b8" />
                        <Text style={[styles.reorderHintText, { color: "#94a3b8" }]}>
                            Stock immobilisé sans aucun mouvement depuis 30+ jours. Envisagez des promotions ou déstockage.
                        </Text>
                    </View>
                    <View style={styles.productList}>
                        {deadList.map((p, i) => (
                            <View key={p.id} style={[styles.productRow, i < deadList.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#33415540" }]}>
                                <View style={[styles.healthDot, { backgroundColor: "#94a3b8" }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                    <Text style={styles.productCat}>{p.category}</Text>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={styles.productStock}>{p.stock} unités</Text>
                                    <Text style={[styles.productDays, { color: "#94a3b8" }]}>
                                        {fmt(p.stock * p.costPrice)} DA bloqués
                                    </Text>
                                    <Text style={[styles.productDays, { color: "#ef4444" }]}>
                                        {p.lastMovement}j sans mouvement
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },

    kpiRow: { flexDirection: "row", gap: 10, padding: 16 },
    kpiCard: {
        flex: 1, backgroundColor: "#1e293b", borderRadius: 16,
        padding: 14, borderLeftWidth: 4, gap: 4,
    },
    kpiLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    kpiValue: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
    kpiSub: { color: "#475569", fontSize: 10, fontWeight: "600" },

    alertRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
    alertCard: {
        flex: 1, backgroundColor: "#1e293b", borderRadius: 14, padding: 12,
        alignItems: "center", gap: 4, borderWidth: 1,
    },
    alertNum: { color: "#f8fafc", fontSize: 22, fontWeight: "900" },
    alertLabel: { color: "#64748b", fontSize: 10, fontWeight: "600" },

    tabBar: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 4 },
    tabBtn: {
        flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center",
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    tabBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    tabText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
    tabTextActive: { color: "#fff" },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 16, marginBottom: 10,
    },

    catCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 12 },
    catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    catName: { color: "#f8fafc", fontSize: 12, fontWeight: "600", width: 110 },
    catBarTrack: { flex: 1, height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden" },
    catBarFill: { height: "100%", borderRadius: 3 },
    catValue: { color: "#94a3b8", fontSize: 10, fontWeight: "700", width: 75, textAlign: "right" },

    deadStockWarning: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#94a3b815", marginHorizontal: 16, marginTop: 12,
        borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#94a3b830",
    },
    deadStockTitle: { color: "#f8fafc", fontSize: 12, fontWeight: "800" },
    deadStockSub: { color: "#94a3b8", fontSize: 11, fontWeight: "600", marginTop: 2 },

    productList: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16 },
    productRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
    healthDot: { width: 10, height: 10, borderRadius: 5 },
    productName: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
    productCat: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },
    productStock: { color: "#f8fafc", fontSize: 12, fontWeight: "800" },
    productDays: { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },

    reorderHint: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "#22c55e15", marginHorizontal: 16, marginBottom: 8,
        borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#22c55e30",
    },
    reorderHintText: { flex: 1, color: "#22c55e", fontSize: 12, fontWeight: "600", lineHeight: 17 },
    reorderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
    reorderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    reorderBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    reorderSuggested: { color: "#22c55e", fontSize: 10, fontWeight: "700", marginTop: 2 },
});
