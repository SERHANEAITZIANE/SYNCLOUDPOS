import React, { useState, useEffect } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

const REASONS = [
    { key: "EXPIRED", label: "Périmé", icon: "time", color: "#ef4444" },
    { key: "DAMAGED", label: "Endommagé", icon: "warning", color: "#f59e0b" },
    { key: "REFUSED", label: "Refusé", icon: "hand-left", color: "#8b5cf6" },
    { key: "ERROR", label: "Erreur", icon: "alert-circle", color: "#3b82f6" },
    { key: "OTHER", label: "Autre", icon: "ellipsis-horizontal", color: "#64748b" },
];

export default function ReturnScreen({ route, navigation }: any) {
    const { customerId, customerName, tourStopId } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState("1");
    const [reason, setReason] = useState("DAMAGED");
    const [notes, setNotes] = useState("");

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

    const selectProduct = (product: any) => {
        setSelectedProduct(product);
        setSearchQuery("");
        setProducts([]);
    };

    const handleSubmit = async () => {
        if (!selectedProduct) {
            Alert.alert("Erreur", "Sélectionnez un produit");
            return;
        }

        const qty = parseInt(quantity);
        if (!qty || qty <= 0) {
            Alert.alert("Erreur", "Quantité invalide");
            return;
        }

        Alert.alert(
            "Confirmer le retour",
            `${qty}x ${selectedProduct.name}\nMotif: ${REASONS.find(r => r.key === reason)?.label}\nDu client: ${customerName}`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Confirmer",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await apiFetch("/returns", {
                                method: "POST",
                                body: JSON.stringify({
                                    customerId,
                                    productId: selectedProduct.id,
                                    quantity: qty,
                                    reason,
                                    notes,
                                    tourStopId,
                                }),
                            });

                            Alert.alert(
                                "✅ Retour enregistré",
                                `${qty}x ${selectedProduct.name} retourné`,
                                [{ text: "OK", onPress: () => navigation.goBack() }]
                            );
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

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Client */}
            <View style={styles.clientRow}>
                <Ionicons name="person" size={18} color="#f59e0b" />
                <Text style={styles.clientName}>{customerName}</Text>
            </View>

            {/* Product search */}
            <Text style={styles.sectionLabel}>PRODUIT RETOURNÉ</Text>
            {selectedProduct ? (
                <View style={styles.selectedProduct}>
                    <View>
                        <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                        <Text style={styles.selectedProductPrice}>
                            {Number(selectedProduct.price).toLocaleString("fr-FR")} DA
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="#64748b" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher le produit..."
                            placeholderTextColor="#64748b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    {products.length > 0 && (
                        <View style={styles.searchResults}>
                            {products.slice(0, 6).map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={styles.searchItem}
                                    onPress={() => selectProduct(p)}
                                >
                                    <Text style={styles.searchItemName}>{p.name}</Text>
                                    <Text style={styles.searchItemPrice}>
                                        {Number(p.price).toLocaleString("fr-FR")} DA
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Quantity */}
            <Text style={styles.sectionLabel}>QUANTITÉ</Text>
            <View style={styles.qtyRow}>
                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setQuantity(String(Math.max(1, parseInt(quantity || "1") - 1)))}
                >
                    <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <TextInput
                    style={styles.qtyInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    textAlign="center"
                />
                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setQuantity(String(parseInt(quantity || "0") + 1))}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Reason */}
            <Text style={styles.sectionLabel}>MOTIF DU RETOUR</Text>
            <View style={styles.reasonGrid}>
                {REASONS.map((r) => (
                    <TouchableOpacity
                        key={r.key}
                        style={[styles.reasonBtn, reason === r.key && { borderColor: r.color, backgroundColor: r.color + "15" }]}
                        onPress={() => setReason(r.key)}
                    >
                        <Ionicons name={r.icon as any} size={22} color={reason === r.key ? r.color : "#64748b"} />
                        <Text style={[styles.reasonText, reason === r.key && { color: r.color }]}>
                            {r.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>NOTES (optionnel)</Text>
            <TextInput
                style={styles.notesInput}
                placeholder="Détails supplémentaires..."
                placeholderTextColor="#64748b"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
            />

            {/* Total */}
            {selectedProduct && (
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>AVOIR À CRÉDITER</Text>
                    <Text style={styles.totalAmount}>
                        {(parseInt(quantity || "0") * Number(selectedProduct.price)).toLocaleString("fr-FR")} DA
                    </Text>
                </View>
            )}

            {/* Submit */}
            <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="return-down-back" size={20} color="#fff" />
                        <Text style={styles.submitText}>Enregistrer le retour</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },

    clientRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#1e293b", padding: 14, borderRadius: 14, marginBottom: 16,
    },
    clientName: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },

    sectionLabel: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        marginTop: 20, marginBottom: 8,
    },

    selectedProduct: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "#1e293b", padding: 14, borderRadius: 14,
        borderWidth: 1, borderColor: "#3b82f6",
    },
    selectedProductName: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    selectedProductPrice: { color: "#94a3b8", fontSize: 13, marginTop: 2 },

    searchBar: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1, borderColor: "#334155",
    },
    searchInput: { flex: 1, height: 44, color: "#f8fafc", marginLeft: 8 },
    searchResults: { backgroundColor: "#1e293b", borderRadius: 12, marginTop: 4, overflow: "hidden" },
    searchItem: {
        flexDirection: "row", justifyContent: "space-between",
        padding: 12, borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    searchItemName: { color: "#f8fafc", fontSize: 14 },
    searchItemPrice: { color: "#64748b", fontSize: 13 },

    qtyRow: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "center" },
    qtyBtn: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: "#334155",
        justifyContent: "center", alignItems: "center",
    },
    qtyInput: {
        width: 80, height: 44, borderRadius: 12, backgroundColor: "#1e293b",
        color: "#f8fafc", fontSize: 22, fontWeight: "800",
        borderWidth: 1, borderColor: "#334155",
    },

    reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    reasonBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, borderColor: "#334155", backgroundColor: "#1e293b",
    },
    reasonText: { color: "#64748b", fontSize: 13, fontWeight: "600" },

    notesInput: {
        backgroundColor: "#1e293b", borderRadius: 12, padding: 14,
        color: "#f8fafc", borderWidth: 1, borderColor: "#334155",
        textAlignVertical: "top", minHeight: 80,
    },

    totalCard: {
        backgroundColor: "#422006", borderRadius: 14, padding: 16,
        alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "#92400e",
    },
    totalLabel: { color: "#fbbf24", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
    totalAmount: { color: "#fbbf24", fontSize: 28, fontWeight: "900", marginTop: 4 },

    submitBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: "#d97706", padding: 16, borderRadius: 14, marginTop: 20,
    },
    submitText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
