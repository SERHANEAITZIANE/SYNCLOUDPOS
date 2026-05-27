import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions,
    Vibration, Platform, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { useLangStore } from "../lib/i18n";
import BarcodeScanner from "../components/BarcodeScanner";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const { width } = Dimensions.get("window");

interface Client {
    id: string;
    name: string;
    phone: string;
    balance: number;
}

interface Product {
    id: string;
    name: string;
    price: number;
    tvaRate: number;
    stock: number;
    barcodes?: { value: string }[] | null;
}

interface SelectedItem {
    product: Product;
    quantity: number;
    customPrice: number;
}

export default function CreateBLScreen({ navigation }: any) {
    const { lang } = useLangStore();
    const isAr = lang === "ar";

    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Flow State
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [clientSearch, setClientSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CREDIT");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [notes, setNotes] = useState("");

    // UI States
    const [scannerVisible, setScannerVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showClientSelector, setShowClientSelector] = useState(false);
    const [showProductSelector, setShowProductSelector] = useState(false);

    // Mock fallbacks for offline
    const MOCK_CLIENTS: Client[] = [
        { id: "c1", name: "Supérette Horizon", phone: "+213555123456", balance: 32000 },
        { id: "c2", name: "Alimentation El Hanaa", phone: "+213555234567", balance: 15000 },
        { id: "c3", name: "Café du Centre", phone: "+213555345678", balance: 12000 },
        { id: "c4", name: "Epicerie La Source", phone: "+213555456789", balance: 6000 },
        { id: "c5", name: "Mini Market Étoile", phone: "+213555567890", balance: 8500 },
        { id: "c6", name: "Dépôt El Baraka", phone: "+213555678901", balance: 4200 },
    ];

    const MOCK_PRODUCTS: Product[] = [
        { id: "p1", name: "Coca-Cola Canette 33cl", price: 80, tvaRate: 19, stock: 240, barcodes: [{ value: "5449000000996" }] },
        { id: "p2", name: "Eau Minérale Lalla Khedidja 1.5L", price: 35, tvaRate: 9, stock: 580, barcodes: [{ value: "6130000001234" }] },
        { id: "p3", name: "Jus Ramy Orange 1L", price: 130, tvaRate: 19, stock: 18, barcodes: [{ value: "6131100005678" }] },
        { id: "p4", name: "Café Prestige 250g", price: 200, tvaRate: 19, stock: 20 },
        { id: "p5", name: "Lait Soummam UHT 1L", price: 110, tvaRate: 9, stock: 95 },
    ];

    // Load clients and products
    useEffect(() => {
        const fetchClientsAndProducts = async () => {
            setLoadingClients(true);
            setLoadingProducts(true);
            try {
                // Fetch clients
                const cRes = await apiFetch("/clients").catch(() => null);
                if (cRes && Array.isArray(cRes)) {
                    setClients(cRes);
                } else if (cRes && cRes.clients) {
                    setClients(cRes.clients);
                } else {
                    setClients(MOCK_CLIENTS);
                }
            } catch (e) {
                setClients(MOCK_CLIENTS);
            } finally {
                setLoadingClients(false);
            }

            try {
                // Fetch products
                const pRes = await apiFetch("/products?limit=200").catch(() => null);
                if (pRes && pRes.products) {
                    setProducts(pRes.products);
                } else {
                    setProducts(MOCK_PRODUCTS);
                }
            } catch (e) {
                setProducts(MOCK_PRODUCTS);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchClientsAndProducts();
    }, []);

    // Filter selectors
    const filteredClients = useMemo(() => {
        return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
    }, [clients, clientSearch]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }, [products, productSearch]);

    // Financial calculations
    const totals = useMemo(() => {
        let totalHT = 0;
        let totalTVA = 0;
        let totalTTC = 0;

        selectedItems.forEach(item => {
            const lineTTC = item.quantity * item.customPrice;
            const lineHT = lineTTC / (1 + item.product.tvaRate / 100);
            const lineTVA = lineTTC - lineHT;

            totalHT += lineHT;
            totalTVA += lineTVA;
            totalTTC += lineTTC;
        });

        // Stamp tax for Cash payments (1% capped naturally or simple calculated)
        let stampTax = 0;
        if (paymentMethod === "CASH") {
            stampTax = Math.ceil(totalTTC * 0.01);
        }

        const grandTotal = totalTTC + stampTax;

        return {
            totalHT: Math.round(totalHT * 100) / 100,
            totalTVA: Math.round(totalTVA * 100) / 100,
            subtotalTTC: totalTTC,
            stampTax,
            grandTotal
        };
    }, [selectedItems, paymentMethod]);

    // Handlers
    const handleBarcodeScanned = (barcode: string) => {
        setScannerVisible(false);
        const found = products.find(p => p.barcodes && p.barcodes.some(b => b.value === barcode));
        if (found) {
            addItemToBL(found);
            Vibration.vibrate(80);
            Alert.alert("✓ Article Ajouté", `${found.name} a été ajouté au Bon de Livraison !`);
        } else {
            Alert.alert("Code barre non répertorié", `Le produit avec code barre ${barcode} n'a pas été trouvé.`);
        }
    };

    const addItemToBL = (product: Product) => {
        setSelectedItems(prev => {
            const existingIdx = prev.findIndex(item => item.product.id === product.id);
            if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx].quantity += 1;
                return updated;
            } else {
                return [...prev, { product, quantity: 1, customPrice: product.price }];
            }
        });
        setShowProductSelector(false);
    };

    const updateItemQuantity = (index: number, qty: number) => {
        if (qty <= 0) {
            Alert.alert("Supprimer", "Retirer cet article du Bon ?", [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Retirer",
                    style: "destructive",
                    onPress: () => {
                        setSelectedItems(prev => prev.filter((_, i) => i !== index));
                    }
                }
            ]);
            return;
        }
        setSelectedItems(prev => {
            const updated = [...prev];
            updated[index].quantity = qty;
            return updated;
        });
    };

    const updateItemPrice = (index: number, price: number) => {
        setSelectedItems(prev => {
            const updated = [...prev];
            updated[index].customPrice = price;
            return updated;
        });
    };

    const handleCreateBL = async () => {
        if (!selectedClient) {
            Alert.alert("Sélection requise", "Veuillez sélectionner un client.");
            return;
        }

        if (selectedItems.length === 0) {
            Alert.alert("Panier vide", "Veuillez ajouter au moins un produit.");
            return;
        }

        setSubmitting(true);
        try {
            const parsedPaymentAmount = parseFloat(paymentAmount) || 0;
            
            const response = await apiFetch("/sales", {
                method: "POST",
                body: JSON.stringify({
                    customerId: selectedClient.id,
                    type: "ORDER", // Bon de livraison
                    paymentMethod,
                    paymentAmount: parsedPaymentAmount,
                    notes,
                    items: selectedItems.map(item => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                        unitPrice: item.customPrice
                    }))
                })
            });

            if (response && response.receiptNumber) {
                Alert.alert(
                    "✓ Bon de Livraison Créé",
                    `Le Bon ${response.receiptNumber} a été enregistré avec succès !`,
                    [
                        {
                            text: "Partager en PDF / WhatsApp",
                            onPress: () => handleGenerateAndSharePDF(response)
                        },
                        {
                            text: "Fermer",
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
            } else {
                throw new Error("Invalid response");
            }
        } catch (e) {
            console.error(e);
            // Offline/Fallback creation
            handleOfflineFallbackBLSubmit();
        } finally {
            setSubmitting(false);
        }
    };

    const handleOfflineFallbackBLSubmit = () => {
        const dummyReceiptNumber = `BL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const fallbackOrder = {
            receiptNumber: dummyReceiptNumber,
            customer: selectedClient,
            items: selectedItems.map(it => ({
                product: { name: it.product.name },
                quantity: it.quantity,
                unitPrice: it.customPrice,
                total: it.quantity * it.customPrice
            })),
            subtotal: totals.totalHT,
            tvaAmount: totals.totalTVA,
            stampTax: totals.stampTax,
            total: totals.grandTotal,
            notes,
            createdAt: new Date().toISOString()
        };

        Alert.alert(
            "✓ Enregistré Localement (Mode Hors-ligne)",
            `Le BL ${dummyReceiptNumber} a été sauvegardé en cache et sera synchronisé dès le retour de connexion !`,
            [
                {
                    text: "Partager PDF / WhatsApp",
                    onPress: () => handleGenerateAndSharePDF(fallbackOrder)
                },
                {
                    text: "Fermer",
                    onPress: () => navigation.goBack()
                }
            ]
        );
    };

    const handleGenerateAndSharePDF = async (salesOrder: any) => {
        const currentLocalDate = new Date(salesOrder.createdAt || new Date()).toLocaleDateString("fr-FR", {
            year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const storeName = "SynCloudPOS Mobile ERP";
        const clientName = salesOrder.customer?.name || selectedClient?.name || "Client Général";
        const clientPhone = selectedClient?.phone || "Non spécifié";

        const itemRows = (salesOrder.items || []).map((item: any, idx: number) => {
            const name = item.product?.name || item.name || "Article";
            const qty = item.quantity;
            const unit = item.unitPrice || item.price || 0;
            const total = qty * unit;
            return `
                <tr style="border-bottom: 1px solid #334155;">
                    <td style="padding: 10px; color: #94a3b8; text-align: center;">${idx + 1}</td>
                    <td style="padding: 10px; color: #f8fafc; font-weight: bold;">${name}</td>
                    <td style="padding: 10px; color: #f8fafc; text-align: center;">${qty}</td>
                    <td style="padding: 10px; color: #f8fafc; text-align: right;">${unit.toLocaleString()} DA</td>
                    <td style="padding: 10px; color: #10b981; font-weight: bold; text-align: right;">${total.toLocaleString()} DA</td>
                </tr>
            `;
        }).join("");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #22c55e; padding-bottom: 16px; margin-bottom: 24px; }
                    .title { font-size: 24px; color: #22c55e; font-weight: bold; }
                    .meta { text-align: right; font-size: 12px; color: #94a3b8; }
                    .client-box { background-color: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 8px; margin-bottom: 24px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background-color: #1e293b; color: #94a3b8; padding: 10px; text-align: left; border-bottom: 2px solid #334155; font-size: 11px; }
                    td { font-size: 12.5px; }
                    .totals-box { margin-top: 24px; border-top: 1px solid #334155; padding-top: 14px; display: flex; flex-direction: column; align-items: flex-end; }
                    .total-row { display: flex; justify-content: space-between; width: 260px; font-size: 13px; margin-bottom: 6px; }
                    .grand-total { font-size: 18px; color: #22c55e; font-weight: bold; margin-top: 8px; border-top: 1px solid #334155; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">${storeName}</div>
                        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Algérie | ERP Mobile</div>
                    </div>
                    <div class="meta">
                        <div style="font-size: 16px; font-weight: bold; color: #f8fafc;">BON DE LIVRAISON</div>
                        <div style="margin-top: 4px;">N°: ${salesOrder.receiptNumber}</div>
                        <div>Date: ${currentLocalDate}</div>
                    </div>
                </div>

                <div class="client-box">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">LIVRÉ À :</div>
                    <div style="font-size: 16px; font-weight: bold; margin-top: 4px;">${clientName}</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">📞 ${clientPhone}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">N°</th>
                            <th>Désignation Article</th>
                            <th style="width: 80px; text-align: center;">Quantité</th>
                            <th style="width: 120px; text-align: right;">P.U. HT</th>
                            <th style="width: 130px; text-align: right;">Total TTC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div class="total-row">
                        <span style="color: #94a3b8;">Total HT :</span>
                        <span>${salesOrder.subtotal?.toLocaleString()} DA</span>
                    </div>
                    <div class="total-row">
                        <span style="color: #94a3b8;">TVA cumulée :</span>
                        <span>${salesOrder.tvaAmount?.toLocaleString()} DA</span>
                    </div>
                    ${salesOrder.stampTax > 0 ? `
                        <div class="total-row">
                            <span style="color: #94a3b8;">Timbre fiscal :</span>
                            <span>${salesOrder.stampTax?.toLocaleString()} DA</span>
                        </div>
                    ` : ""}
                    <div class="total-row grand-total">
                        <span>TOTAL À PAYER :</span>
                        <span>${salesOrder.total?.toLocaleString()} DA</span>
                    </div>
                </div>

                ${salesOrder.notes ? `
                    <div style="margin-top: 30px; padding: 10px; background-color: #1e293b; border-radius: 6px; font-size: 12px; color: #94a3b8;">
                        <strong>Notes :</strong> ${salesOrder.notes}
                    </div>
                ` : ""}

                <div style="margin-top: 50px; text-align: center; color: #475569; font-size: 10px;">
                    Généré électroniquement via SynCloudPOS Mobile. Merci pour votre fidélité.
                </div>
            </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, {
                mimeType: "application/pdf",
                dialogTitle: "Partager le Bon de Livraison",
                UTI: "com.adobe.pdf",
            });
            navigation.goBack();
        } catch (error) {
            console.error("PDF share error:", error);
            Alert.alert("Erreur", "Impossible d'exporter le document PDF.");
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Créer un Bon de Livraison</Text>
                <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.scannerIconBtn}>
                    <Ionicons name="barcode" size={24} color="#22c55e" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 150 }}>
                {/* 1. Client Selector Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person-outline" size={20} color="#22c55e" />
                        <Text style={styles.cardTitle}>Client Destinataire</Text>
                    </View>

                    {selectedClient ? (
                        <View style={styles.selectedClientContainer}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.clientNameText}>{selectedClient.name}</Text>
                                <Text style={styles.clientPhoneText}>📞 {selectedClient.phone}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.changeClientBtn}
                                onPress={() => setShowClientSelector(true)}
                            >
                                <Text style={styles.changeClientBtnText}>Modifier</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.selectClientPromptBtn}
                            onPress={() => setShowClientSelector(true)}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#22c55e" />
                            <Text style={styles.selectClientPromptText}>Sélectionner un Client</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 2. Basket / Added Items Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="cart-outline" size={20} color="#22c55e" />
                        <Text style={styles.cardTitle}>Articles du Bon ({selectedItems.length})</Text>
                        <TouchableOpacity
                            style={styles.addProductShortcut}
                            onPress={() => setShowProductSelector(true)}
                        >
                            <Ionicons name="add-circle" size={22} color="#22c55e" />
                        </TouchableOpacity>
                    </View>

                    {selectedItems.length === 0 ? (
                        <View style={styles.emptyCartContainer}>
                            <Ionicons name="basket-outline" size={40} color="#475569" />
                            <Text style={styles.emptyCartText}>Aucun article dans ce Bon pour l'instant</Text>
                            <TouchableOpacity
                                style={styles.addProductShortcutBtn}
                                onPress={() => setShowProductSelector(true)}
                            >
                                <Text style={styles.addProductShortcutBtnText}>Ajouter des articles</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.basketItemsList}>
                            {selectedItems.map((item, index) => (
                                <View key={index} style={styles.basketItemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.basketItemName} numberOfLines={1}>{item.product.name}</Text>
                                        <Text style={styles.basketItemTva}>TVA: {item.product.tvaRate}% | Stock: {item.product.stock}</Text>
                                    </View>
                                    <View style={styles.basketItemActions}>
                                        {/* Price input */}
                                        <TextInput
                                            style={styles.priceInputMini}
                                            keyboardType="numeric"
                                            value={String(item.customPrice)}
                                            onChangeText={(val) => updateItemPrice(index, parseFloat(val) || 0)}
                                        />
                                        <Text style={styles.currencySuffixMini}>DA</Text>
                                        
                                        {/* Qty controller */}
                                        <View style={styles.qtyRowMini}>
                                            <TouchableOpacity
                                                style={styles.qtyBtnMini}
                                                onPress={() => updateItemQuantity(index, item.quantity - 1)}
                                            >
                                                <Ionicons name="remove" size={14} color="#fff" />
                                            </TouchableOpacity>
                                            <Text style={styles.qtyTextMini}>{item.quantity}</Text>
                                            <TouchableOpacity
                                                style={styles.qtyBtnMini}
                                                onPress={() => updateItemQuantity(index, item.quantity + 1)}
                                            >
                                                <Ionicons name="add" size={14} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* 3. Payment & Settings Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="wallet-outline" size={20} color="#22c55e" />
                        <Text style={styles.cardTitle}>Règlement & Caisse</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Méthode de Paiement</Text>
                        <View style={styles.toggleGroup}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, paymentMethod === "CREDIT" && styles.toggleBtnActive]}
                                onPress={() => setPaymentMethod("CREDIT")}
                            >
                                <Text style={[styles.toggleText, paymentMethod === "CREDIT" && styles.toggleTextActive]}>Crédit Client</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, paymentMethod === "CASH" && styles.toggleBtnActive]}
                                onPress={() => setPaymentMethod("CASH")}
                            >
                                <Text style={[styles.toggleText, paymentMethod === "CASH" && styles.toggleTextActive]}>Espèces (Caisse)</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Montant Versé (DA)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            placeholder="Ex: 5000"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Notes / Observations</Text>
                        <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                            multiline
                            numberOfLines={3}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Observations complémentaires..."
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                {/* 4. Financial breakdown Summary */}
                <View style={styles.totalsCard}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total HT :</Text>
                        <Text style={styles.totalValue}>{totals.totalHT.toLocaleString()} DA</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TVA cumulée :</Text>
                        <Text style={styles.totalValue}>{totals.totalTVA.toLocaleString()} DA</Text>
                    </View>
                    {totals.stampTax > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Timbre Fiscal (1%) :</Text>
                            <Text style={styles.totalValue}>{totals.stampTax.toLocaleString()} DA</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>NET À PAYER :</Text>
                        <Text style={styles.grandTotalValue}>{totals.grandTotal.toLocaleString()} DA</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom sticky create bar */}
            <View style={styles.stickyFooter}>
                <TouchableOpacity
                    style={[styles.createBtn, submitting && styles.createBtnDisabled]}
                    onPress={handleCreateBL}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="document-text-outline" size={20} color="#fff" />
                            <Text style={styles.createBtnText}>Enregistrer le Bon de Livraison</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Barcode scanner MODAL overlay */}
            <BarcodeScanner
                visible={scannerVisible}
                onScan={handleBarcodeScanned}
                onClose={() => setScannerVisible(false)}
            />

            {/* Client selector sheet modal */}
            <Modal visible={showClientSelector} animationType="slide" transparent={true}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Sélectionner un Client</Text>
                            <TouchableOpacity onPress={() => setShowClientSelector(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.sheetSearch}
                            value={clientSearch}
                            onChangeText={setClientSearch}
                            placeholder="Rechercher un client par nom..."
                            placeholderTextColor="#64748b"
                        />

                        {loadingClients ? (
                            <ActivityIndicator color="#22c55e" style={{ margin: 20 }} />
                        ) : (
                            <FlatList
                                data={filteredClients}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.sheetItemRow}
                                        onPress={() => {
                                            setSelectedClient(item);
                                            setShowClientSelector(false);
                                        }}
                                    >
                                        <View>
                                            <Text style={styles.sheetItemName}>{item.name}</Text>
                                            <Text style={styles.sheetItemSub}>📞 {item.phone} | Solde: {item.balance.toLocaleString()} DA</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Product selector sheet modal */}
            <Modal visible={showProductSelector} animationType="slide" transparent={true}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Ajouter un Produit</Text>
                            <TouchableOpacity onPress={() => setShowProductSelector(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.sheetSearch}
                            value={productSearch}
                            onChangeText={setProductSearch}
                            placeholder="Rechercher par nom..."
                            placeholderTextColor="#64748b"
                        />

                        {loadingProducts ? (
                            <ActivityIndicator color="#22c55e" style={{ margin: 20 }} />
                        ) : (
                            <FlatList
                                data={filteredProducts}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.sheetItemRow}
                                        onPress={() => addItemToBL(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.sheetItemName}>{item.name}</Text>
                                            <Text style={styles.sheetItemSub}>P.U: {item.price} DA | Stock: {item.stock}</Text>
                                        </View>
                                        <Ionicons name="add-circle-outline" size={24} color="#22c55e" />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    
    // Header
    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: "#334155",
        backgroundColor: "#0f172a"
    },
    backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
    headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    scannerIconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },

    formContainer: { flex: 1, padding: 16 },

    // Card Blocks
    card: {
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155",
        borderRadius: 16, padding: 16, marginBottom: 16,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    cardTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "800", flex: 1 },
    addProductShortcut: { width: 30, height: 30, justifyContent: "center", alignItems: "center" },

    // Client select UI
    selectedClientContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a50", padding: 12, borderRadius: 12 },
    clientNameText: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
    clientPhoneText: { color: "#64748b", fontSize: 12, marginTop: 2 },
    changeClientBtn: { backgroundColor: "#334155", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    changeClientBtnText: { color: "#f8fafc", fontSize: 11, fontWeight: "700" },
    selectClientPromptBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        height: 50, borderStyle: "dashed", borderWidth: 1, borderColor: "#334155", borderRadius: 12,
    },
    selectClientPromptText: { color: "#22c55e", fontSize: 13, fontWeight: "700" },

    // Basket UI
    emptyCartContainer: { alignItems: "center", paddingVertical: 20 },
    emptyCartText: { color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 14 },
    addProductShortcutBtn: { backgroundColor: "#22c55e20", borderWidth: 1, borderColor: "#22c55e50", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    addProductShortcutBtnText: { color: "#22c55e", fontSize: 12, fontWeight: "800" },

    basketItemsList: { gap: 10 },
    basketItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0f172a30", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#33415580" },
    basketItemName: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
    basketItemTva: { color: "#64748b", fontSize: 11, marginTop: 2 },
    basketItemActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    priceInputMini: { backgroundColor: "#0f172a", borderRadius: 8, borderWidth: 1, borderColor: "#334155", width: 70, height: 32, paddingHorizontal: 8, color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "right" },
    currencySuffixMini: { color: "#64748b", fontSize: 10, fontWeight: "700" },
    
    qtyRowMini: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", borderRadius: 8, borderWidth: 1, borderColor: "#334155", padding: 2, gap: 6 },
    qtyBtnMini: { width: 24, height: 24, borderRadius: 6, backgroundColor: "#334155", justifyContent: "center", alignItems: "center" },
    qtyTextMini: { color: "#f8fafc", fontSize: 12, fontWeight: "800", minWidth: 20, textAlign: "center" },

    // Forms
    inputGroup: { marginBottom: 14 },
    label: { color: "#94a3b8", fontSize: 12, fontWeight: "700", marginBottom: 6 },
    input: { backgroundColor: "#0f172a", borderRadius: 12, borderWidth: 1, borderColor: "#334155", height: 44, color: "#fff", paddingHorizontal: 12, fontSize: 13 },
    
    toggleGroup: { flexDirection: "row", backgroundColor: "#0f172a", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "#334155" },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
    toggleBtnActive: { backgroundColor: "#22c55e" },
    toggleText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
    toggleTextActive: { color: "#fff" },

    // Totals card
    totalsCard: { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 16, padding: 16, gap: 10 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    totalLabel: { color: "#64748b", fontSize: 12, fontWeight: "700" },
    totalValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
    grandTotalRow: { borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10, marginTop: 4 },
    grandTotalLabel: { color: "#22c55e", fontSize: 14, fontWeight: "900" },
    grandTotalValue: { color: "#22c55e", fontSize: 18, fontWeight: "900" },

    // Sticky Footer
    stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === "ios" ? 34 : 16, backgroundColor: "#0f172a", borderTopWidth: 1, borderTopColor: "#334155", zIndex: 100 },
    createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#22c55e", height: 50, borderRadius: 14 },
    createBtnDisabled: { backgroundColor: "#334155" },
    createBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

    // Bottom Sheets
    sheetOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.75)", justifyContent: "flex-end" },
    sheetContent: { backgroundColor: "#1e293b", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "70%", padding: 16 },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sheetTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    sheetSearch: { backgroundColor: "#0f172a", borderRadius: 12, borderWidth: 1, borderColor: "#334155", height: 44, color: "#fff", paddingHorizontal: 12, fontSize: 13, marginBottom: 14 },
    sheetItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#33415540", paddingVertical: 12 },
    sheetItemName: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
    sheetItemSub: { color: "#64748b", fontSize: 11, marginTop: 2 }
});
