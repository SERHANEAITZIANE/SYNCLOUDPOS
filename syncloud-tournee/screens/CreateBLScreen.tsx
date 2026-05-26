import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, Alert, ActivityIndicator, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import BarcodeScanner from "../components/BarcodeScanner";
import { printBL, shareBL, BLData } from "../lib/printer";
import { useAuthStore } from "../lib/store";

interface CartItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
}

export default function CreateBLScreen({ route, navigation }: any) {
    const { customerId, customerName, tourStopId, tourId } = route.params || {};
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [scannerVisible, setScannerVisible] = useState(false);
    
    // Devis proforma vs BL Selector state
    const [docType, setDocType] = useState<"ORDER" | "QUOTE">("ORDER");

    // Scan barcode handle
    const handleScan = async (barcode: string) => {
        setScannerVisible(false);
        setSearchLoading(true);
        try {
            const data = await apiFetch(`/products?barcode=${encodeURIComponent(barcode)}`);
            if (data.products && data.products.length > 0) {
                // Add first matched product to cart
                const p = data.products[0];
                const existing = cart.find(c => c.productId === p.id);
                if (existing) {
                    setCart(cart.map(c => c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c));
                } else {
                    setCart([...cart, {
                        productId: p.id,
                        name: p.name,
                        quantity: 1,
                        unitPrice: p.price,
                        tvaRate: p.tvaRate,
                    }]);
                }
            } else {
                Alert.alert("Introuvable", "Aucun produit avec ce code.");
            }
        } catch (e: any) {
            Alert.alert("Erreur", e.message);
        } finally {
            setSearchLoading(false);
        }
    };

    // Search products
    useEffect(() => {
        if (searchQuery.length < 2) { setProducts([]); return; }
        const timeout = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const data = await apiFetch(`/products?q=${encodeURIComponent(searchQuery)}`);
                setProducts(data.products);
            } catch { setProducts([]); }
            setSearchLoading(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const addToCart = (product: any) => {
        const existing = cart.find(c => c.productId === product.id);
        if (existing) {
            setCart(cart.map(c => c.productId === product.id
                ? { ...c, quantity: c.quantity + 1 }
                : c
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                quantity: 1,
                unitPrice: product.price,
                tvaRate: product.tvaRate,
            }]);
        }
        setSearchQuery("");
        setProducts([]);
    };

    const updateQty = (productId: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.productId !== productId) return c;
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : c;
        }).filter(c => c.quantity > 0));
    };

    const removeItem = (productId: string) => setCart(cart.filter(c => c.productId !== productId));

    const totalTTC = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

    const handleSubmit = async () => {
        if (!customerId) {
            Alert.alert("Erreur", "Sélectionnez un client");
            return;
        }
        if (cart.length === 0) {
            Alert.alert("Erreur", "Ajoutez au moins un produit");
            return;
        }

        const isQuote = docType === "QUOTE";
        const docLabel = isQuote ? "Devis" : "BL";
        const alertTitle = isQuote ? "Confirmer le Devis" : "Confirmer le BL";
        const alertMessage = isQuote 
            ? `Client: ${customerName}\nTotal Estimé: ${totalTTC.toLocaleString("fr-FR")} DA\nCe document n'affecte pas les stocks.`
            : `Client: ${customerName}\nTotal: ${totalTTC.toLocaleString("fr-FR")} DA\nPaiement: ${paymentAmount || "0"} DA`;

        Alert.alert(
            alertTitle,
            alertMessage,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Valider",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await apiFetch("/sales", {
                                method: "POST",
                                body: JSON.stringify({
                                    customerId,
                                    tourStopId: isQuote ? undefined : tourStopId, // Quotes don't settle active tour delivery notes directly
                                    type: docType,
                                    items: cart.map(c => ({
                                        productId: c.productId,
                                        quantity: c.quantity,
                                        unitPrice: c.unitPrice,
                                    })),
                                    paymentMethod: isQuote ? "CASH" : paymentMethod,
                                    paymentAmount: isQuote ? 0 : (parseFloat(paymentAmount) || 0),
                                }),
                            });

                            const blData: BLData = {
                                receiptNumber: result.receiptNumber || `${isQuote ? "DE" : "BL"}-${Date.now()}`,
                                date: new Date().toISOString(),
                                customer: { name: customerName },
                                items: cart.map(c => ({
                                    name: c.name,
                                    quantity: c.quantity,
                                    unitPrice: c.unitPrice,
                                    total: c.quantity * c.unitPrice,
                                })),
                                subtotal: totalTTC,
                                taxAmount: 0,
                                stampTax: 0,
                                total: Number(result.total) || totalTTC,
                                paymentMethod: isQuote ? "CASH" : paymentMethod,
                                amountPaid: isQuote ? 0 : (parseFloat(paymentAmount) || 0),
                                tenantName: user?.tenant?.name || "SynCloudPOS",
                                type: docType
                            };

                            const successTitle = isQuote ? "✨ Devis Créé" : "✅ BL Créé";
                            const successMsg = isQuote 
                                ? `N° ${result.receiptNumber}\nLe devis proforma est prêt à être partagé.`
                                : `N° ${result.receiptNumber}\nTotal: ${Number(result.total).toLocaleString("fr-FR")} DA`;

                            Alert.alert(
                                successTitle,
                                successMsg,
                                [
                                    { text: "Imprimer", onPress: () => { printBL(blData).then(() => navigation.goBack()); } },
                                    { text: "Partager", onPress: () => { shareBL(blData).then(() => navigation.goBack()); } },
                                    { text: "Fermer", style: "cancel", onPress: () => navigation.goBack() }
                                ]
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
        <View style={styles.container}>
            {/* Client header */}
            <View style={styles.clientHeader}>
                <Ionicons name="person" size={20} color="#3b82f6" />
                <Text style={styles.clientName}>{customerName || "Sélectionnez un client"}</Text>
            </View>

            {/* Document Type Selector Slider */}
            <View style={styles.typeSelectorBar}>
                <TouchableOpacity
                    style={[styles.typeTab, docType === "ORDER" && styles.typeTabActive]}
                    onPress={() => {
                        setDocType("ORDER");
                        setPaymentAmount("");
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="document-text-outline" size={16} color={docType === "ORDER" ? "#fff" : "#94a3b8"} />
                    <Text style={[styles.typeTabText, docType === "ORDER" && styles.typeTabTextActive]}>
                        Bon de Livraison (BL)
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeTab, docType === "QUOTE" && styles.typeTabActiveQuote]}
                    onPress={() => {
                        setDocType("QUOTE");
                        setPaymentAmount("0");
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sparkles-outline" size={16} color={docType === "QUOTE" ? "#fff" : "#94a3b8"} />
                    <Text style={[styles.typeTabText, docType === "QUOTE" && styles.typeTabTextActive]}>
                        Devis Proforma
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Product search */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#64748b" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un produit..."
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchLoading ? (
                        <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 8 }} />
                    ) : (
                        <TouchableOpacity onPress={() => setScannerVisible(true)} style={{ padding: 4, marginLeft: 8 }}>
                            <Ionicons name="barcode-outline" size={24} color="#f8fafc" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search results */}
                {products.length > 0 && (
                    <View style={styles.searchResults}>
                        {products.slice(0, 8).map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={styles.searchItem}
                                onPress={() => addToCart(p)}
                            >
                                <View>
                                    <Text style={styles.searchItemName}>{p.name}</Text>
                                    <Text style={styles.searchItemStock}>Stock: {p.stock}</Text>
                                </View>
                                <Text style={styles.searchItemPrice}>
                                    {Number(p.price).toLocaleString("fr-FR")} DA
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Cart */}
            <ScrollView style={styles.cartSection}>
                <Text style={styles.sectionTitle}>
                    Panier ({cart.length} article{cart.length > 1 ? "s" : ""})
                </Text>

                {cart.map((item) => (
                    <View key={item.productId} style={styles.cartItem}>
                        <View style={styles.cartItemInfo}>
                            <Text style={styles.cartItemName}>{item.name}</Text>
                            <Text style={styles.cartItemPrice}>
                                {item.unitPrice.toLocaleString("fr-FR")} DA
                            </Text>
                        </View>
                        <View style={styles.qtyControls}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => updateQty(item.productId, -1)}
                            >
                                <Ionicons name="remove" size={16} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => updateQty(item.productId, 1)}
                            >
                                <Ionicons name="add" size={16} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.qtyBtn, { backgroundColor: "#ef4444" }]}
                                onPress={() => removeItem(item.productId)}
                            >
                                <Ionicons name="trash" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.cartItemTotal}>
                            {(item.quantity * item.unitPrice).toLocaleString("fr-FR")} DA
                        </Text>
                    </View>
                ))}

                {/* Payment section */}
                {cart.length > 0 && (
                    docType === "QUOTE" ? (
                        <View style={styles.paymentSection}>
                            <Text style={styles.sectionTitle}>Estimation Commerciale</Text>
                            <View style={styles.quoteInfoCard}>
                                <Ionicons name="information-circle" size={20} color="#d97706" />
                                <Text style={styles.quoteInfoText}>
                                    Ce document est un devis estimatif proforma. Les caisses et les transactions financières de trésorerie ne sont pas impactées par cette saisie.
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.paymentSection}>
                            <Text style={styles.sectionTitle}>Paiement</Text>
                            <View style={styles.paymentMethods}>
                                {["CASH", "CHECK", "TRANSFER"].map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                                        onPress={() => setPaymentMethod(m)}
                                    >
                                        <Ionicons
                                            name={m === "CASH" ? "cash" : m === "CHECK" ? "card" : "swap-horizontal"}
                                            size={16}
                                            color={paymentMethod === m ? "#fff" : "#64748b"}
                                        />
                                        <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
                                            {m === "CASH" ? "Espèces" : m === "CHECK" ? "Chèque" : "Virement"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={styles.paymentInput}
                                placeholder="Montant payé (DA)"
                                placeholderTextColor="#64748b"
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                keyboardType="numeric"
                            />
                        </View>
                    )
                )}
            </ScrollView>

            {/* Fixed footer with total */}
            {cart.length > 0 && (
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <Text style={styles.footerLabel}>{docType === "QUOTE" ? "DEVIS PROPOSÉ" : "TOTAL TTC"}</Text>
                        <Text style={[styles.footerAmount, docType === "QUOTE" && { color: "#f59e0b" }]}>{totalTTC.toLocaleString("fr-FR")} DA</Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.submitBtn, 
                            docType === "QUOTE" && styles.submitBtnQuote,
                            loading && { opacity: 0.7 }
                        ]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name={docType === "QUOTE" ? "sparkles" : "checkmark-circle"} size={20} color="#fff" />
                                <Text style={styles.submitText}>
                                    {docType === "QUOTE" ? "Générer Devis" : "Valider BL"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <BarcodeScanner
                visible={scannerVisible}
                onScan={handleScan}
                onClose={() => setScannerVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    clientHeader: {
        flexDirection: "row", alignItems: "center", gap: 8,
        padding: 14, backgroundColor: "#1e293b",
        borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    clientName: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },

    // Segmented document type selector bar
    typeSelectorBar: {
        flexDirection: "row",
        backgroundColor: "#1e293b",
        marginHorizontal: 12,
        marginTop: 12,
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#334155",
    },
    typeTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    typeTabActive: {
        backgroundColor: "#22c55e",
    },
    typeTabActiveQuote: {
        backgroundColor: "#d97706",
    },
    typeTabText: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "700",
    },
    typeTabTextActive: {
        color: "#fff",
    },

    searchSection: { zIndex: 100 },
    searchBar: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#1e293b", margin: 12, paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1, borderColor: "#334155",
    },
    searchInput: { flex: 1, height: 44, color: "#f8fafc", marginLeft: 8 },
    searchResults: {
        position: "absolute", top: 60, left: 12, right: 12,
        backgroundColor: "#1e293b", borderRadius: 12,
        borderWidth: 1, borderColor: "#334155", overflow: "hidden", zIndex: 200,
    },
    searchItem: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 12, borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    searchItemName: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
    searchItemStock: { color: "#64748b", fontSize: 11, marginTop: 2 },
    searchItemPrice: { color: "#3b82f6", fontSize: 14, fontWeight: "700" },

    cartSection: { flex: 1, paddingHorizontal: 12 },
    sectionTitle: {
        color: "#94a3b8", fontSize: 12, fontWeight: "700",
        letterSpacing: 1, marginTop: 16, marginBottom: 8, textTransform: "uppercase",
    },
    cartItem: {
        backgroundColor: "#1e293b", borderRadius: 12, padding: 12,
        marginBottom: 8,
    },
    cartItemInfo: { flexDirection: "row", justifyContent: "space-between" },
    cartItemName: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
    cartItemPrice: { color: "#64748b", fontSize: 13 },
    qtyControls: {
        flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
    },
    qtyBtn: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: "#334155",
        justifyContent: "center", alignItems: "center",
    },
    qtyText: { color: "#f8fafc", fontSize: 16, fontWeight: "700", minWidth: 30, textAlign: "center" },
    cartItemTotal: {
        color: "#3b82f6", fontSize: 15, fontWeight: "800",
        textAlign: "right", marginTop: 4,
    },

    paymentSection: { marginTop: 8 },
    paymentMethods: { flexDirection: "row", gap: 8 },
    methodBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, padding: 10, borderRadius: 10,
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
    },
    methodBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
    methodText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
    methodTextActive: { color: "#fff" },
    paymentInput: {
        backgroundColor: "#1e293b", borderRadius: 12, padding: 14,
        color: "#f8fafc", fontSize: 18, fontWeight: "700",
        borderWidth: 1, borderColor: "#334155", marginTop: 10, textAlign: "center",
    },

    quoteInfoCard: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: "#d9770615",
        borderWidth: 1,
        borderColor: "#d9770630",
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
        alignItems: "center"
    },
    quoteInfoText: {
        flex: 1,
        color: "#d97706",
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 16,
    },

    footer: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        padding: 16, backgroundColor: "#1e293b",
        borderTopWidth: 1, borderTopColor: "#334155",
    },
    footerLeft: {},
    footerLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
    footerAmount: { color: "#f8fafc", fontSize: 22, fontWeight: "900" },
    submitBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#22c55e", paddingHorizontal: 20, paddingVertical: 14,
        borderRadius: 14,
    },
    submitBtnQuote: {
        backgroundColor: "#d97706",
    },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
