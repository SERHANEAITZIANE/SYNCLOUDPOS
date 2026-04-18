import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, Alert, ActivityIndicator, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import BarcodeScanner from "../components/BarcodeScanner";

interface LoadItem {
    productId: string;
    name: string;
    quantity: number;
    stock: number;
    price: number;
}

export default function TruckLoadScreen({ route, navigation }: any) {
    const { tourId, tourName } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [existingLoad, setExistingLoad] = useState<any>(null);
    const [loadItems, setLoadItems] = useState<LoadItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [scannerVisible, setScannerVisible] = useState(false);

    // Check if truck load already exists
    useEffect(() => {
        if (tourId) {
            apiFetch(`/truck-load?tourId=${tourId}`)
                .then(data => setExistingLoad(data))
                .catch(() => {}); // 404 = no load yet
        }
    }, [tourId]);

    // Search products
    useEffect(() => {
        if (searchQuery.length < 2) { setProducts([]); return; }
        const timeout = setTimeout(async () => {
            try {
                const data = await apiFetch(`/products?q=${encodeURIComponent(searchQuery)}`);
                setProducts(data.products);
            } catch { setProducts([]); }
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleBarcodeScan = async (barcode: string) => {
        setScannerVisible(false);
        try {
            const data = await apiFetch(`/products?barcode=${barcode}`);
            if (data.products.length > 0) {
                addToLoad(data.products[0]);
            } else {
                Alert.alert("Produit introuvable", `Aucun produit avec le code: ${barcode}`);
            }
        } catch (e: any) {
            Alert.alert("Erreur", e.message);
        }
    };

    const addToLoad = (product: any) => {
        const existing = loadItems.find(i => i.productId === product.id);
        if (existing) {
            setLoadItems(loadItems.map(i =>
                i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setLoadItems([...loadItems, {
                productId: product.id,
                name: product.name,
                quantity: 1,
                stock: product.stock,
                price: Number(product.price),
            }]);
        }
        setSearchQuery("");
        setProducts([]);
    };

    const updateQty = (productId: string, qty: number) => {
        setLoadItems(loadItems.map(i =>
            i.productId === productId ? { ...i, quantity: Math.max(0, qty) } : i
        ).filter(i => i.quantity > 0));
    };

    const handleSubmit = async () => {
        if (loadItems.length === 0) {
            Alert.alert("Erreur", "Ajoutez au moins un produit au chargement");
            return;
        }

        // Check stock
        const overStock = loadItems.filter(i => i.quantity > i.stock);
        if (overStock.length > 0) {
            Alert.alert(
                "Stock insuffisant",
                overStock.map(i => `${i.name}: ${i.stock} dispo / ${i.quantity} demandé`).join("\n")
            );
            return;
        }

        Alert.alert(
            "Confirmer le chargement",
            `${loadItems.length} produits\n${loadItems.reduce((s, i) => s + i.quantity, 0)} unités au total`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Charger le camion",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await apiFetch("/truck-load", {
                                method: "POST",
                                body: JSON.stringify({
                                    tourId,
                                    items: loadItems.map(i => ({
                                        productId: i.productId,
                                        quantity: i.quantity,
                                    })),
                                }),
                            });
                            Alert.alert("✅ Camion chargé", `${loadItems.length} produits chargés`, [
                                { text: "OK", onPress: () => navigation.goBack() },
                            ]);
                        } catch (e: any) {
                            Alert.alert("Erreur", e.message);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Show existing load
    if (existingLoad) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    <Text style={styles.statusText}>Camion chargé</Text>
                </View>

                <Text style={styles.sectionLabel}>
                    CONTENU DU CAMION ({existingLoad.items?.length || 0} produits)
                </Text>

                {existingLoad.items?.map((item: any) => (
                    <View key={item.id} style={styles.existingItem}>
                        <View style={styles.existingItemLeft}>
                            <Text style={styles.existingItemName}>{item.product.name}</Text>
                            <Text style={styles.existingItemMeta}>
                                Chargé: {item.qtyLoaded} | Vendu: {item.qtySold} | Retourné: {item.qtyReturned}
                            </Text>
                        </View>
                        <View style={styles.remainingBadge}>
                            <Text style={styles.remainingText}>{item.qtyLoaded - item.qtySold - item.qtyReturned}</Text>
                            <Text style={styles.remainingLabel}>restant</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="car" size={22} color="#8b5cf6" />
                <Text style={styles.headerTitle}>Chargement {tourName || "Camion"}</Text>
            </View>

            {/* Search + Scan */}
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#64748b" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un produit..."
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => setScannerVisible(true)}
                >
                    <Ionicons name="barcode-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Search results */}
            {products.length > 0 && (
                <View style={styles.searchResults}>
                    {products.slice(0, 6).map(p => (
                        <TouchableOpacity
                            key={p.id}
                            style={styles.searchItem}
                            onPress={() => addToLoad(p)}
                        >
                            <View>
                                <Text style={styles.searchItemName}>{p.name}</Text>
                                <Text style={styles.searchItemStock}>Stock: {p.stock}</Text>
                            </View>
                            <Ionicons name="add-circle" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Load items */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                <Text style={styles.sectionLabel}>
                    CHARGEMENT ({loadItems.length} produits — {loadItems.reduce((s, i) => s + i.quantity, 0)} unités)
                </Text>

                {loadItems.map(item => (
                    <View key={item.productId} style={styles.loadItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.loadItemName}>{item.name}</Text>
                            <Text style={styles.loadItemStock}>Stock: {item.stock}</Text>
                        </View>
                        <View style={styles.qtyControls}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => updateQty(item.productId, item.quantity - 1)}
                            >
                                <Ionicons name="remove" size={16} color="#fff" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.qtyInput}
                                value={String(item.quantity)}
                                onChangeText={t => updateQty(item.productId, parseInt(t) || 0)}
                                keyboardType="numeric"
                                textAlign="center"
                            />
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => updateQty(item.productId, item.quantity + 1)}
                            >
                                <Ionicons name="add" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {loadItems.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="cube-outline" size={48} color="#475569" />
                        <Text style={styles.emptyText}>Scannez ou recherchez des produits à charger</Text>
                    </View>
                )}
            </ScrollView>

            {/* Submit */}
            {loadItems.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="car" size={20} color="#fff" />
                                <Text style={styles.submitText}>Valider le chargement</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                visible={scannerVisible}
                onScan={handleBarcodeScan}
                onClose={() => setScannerVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },

    header: {
        flexDirection: "row", alignItems: "center", gap: 10,
        padding: 16, backgroundColor: "#1e293b",
        borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    headerTitle: { color: "#f8fafc", fontSize: 17, fontWeight: "700" },

    searchRow: { flexDirection: "row", gap: 8, padding: 12 },
    searchBar: {
        flex: 1, flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", paddingHorizontal: 12, borderRadius: 12,
        borderWidth: 1, borderColor: "#334155",
    },
    searchInput: { flex: 1, height: 44, color: "#f8fafc", marginLeft: 8 },
    scanBtn: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: "#8b5cf6", justifyContent: "center", alignItems: "center",
    },

    searchResults: {
        marginHorizontal: 12, backgroundColor: "#1e293b",
        borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#334155",
    },
    searchItem: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 12, borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    searchItemName: { color: "#f8fafc", fontSize: 14 },
    searchItemStock: { color: "#64748b", fontSize: 11, marginTop: 2 },

    sectionLabel: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        marginBottom: 10,
    },

    loadItem: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", borderRadius: 12, padding: 12, marginBottom: 8,
    },
    loadItemName: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
    loadItemStock: { color: "#64748b", fontSize: 11, marginTop: 2 },
    qtyControls: { flexDirection: "row", alignItems: "center", gap: 6 },
    qtyBtn: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: "#334155",
        justifyContent: "center", alignItems: "center",
    },
    qtyInput: {
        width: 50, height: 32, borderRadius: 8, backgroundColor: "#0f172a",
        color: "#f8fafc", fontSize: 16, fontWeight: "700",
        borderWidth: 1, borderColor: "#334155",
    },

    emptyState: { alignItems: "center", paddingTop: 40 },
    emptyText: { color: "#64748b", fontSize: 14, marginTop: 12, textAlign: "center" },

    footer: { padding: 16, backgroundColor: "#1e293b", borderTopWidth: 1, borderTopColor: "#334155" },
    submitBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: "#8b5cf6", padding: 16, borderRadius: 14,
    },
    submitText: { color: "#fff", fontSize: 17, fontWeight: "700" },

    // Existing load view
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#052e16", padding: 12, borderRadius: 12,
        borderWidth: 1, borderColor: "#166534", marginBottom: 16,
    },
    statusText: { color: "#22c55e", fontSize: 15, fontWeight: "700" },
    existingItem: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "#1e293b", borderRadius: 12, padding: 12, marginBottom: 8,
    },
    existingItemLeft: { flex: 1 },
    existingItemName: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
    existingItemMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },
    remainingBadge: { alignItems: "center", backgroundColor: "#334155", borderRadius: 10, padding: 8, minWidth: 50 },
    remainingText: { color: "#f8fafc", fontSize: 18, fontWeight: "800" },
    remainingLabel: { color: "#64748b", fontSize: 9, fontWeight: "600" },
});
