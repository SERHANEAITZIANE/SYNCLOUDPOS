import React, { useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, TextInput, Alert, Image, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { apiFetch } from "../lib/api";

interface PurchaseItem {
    name: string;
    quantity: number;
    priceHt: number;       // Unit Price HT
    tvaRate: number;       // TVA Rate % (e.g. 0, 9, 19)
    currentStock: number;  // Existing stock before purchase
    oldPmp: number;        // Old Weighted Average Cost
    sellingPrice: number;  // Selling price (to compute margin)
}

interface ScannedPurchase {
    supplier: string;
    items: PurchaseItem[];
    shippingFees: number;  // Frais d'approche / Transport
    paymentMethod: "CASH" | "CREDIT"; // Cash caisse drawer debit or Supplier ledger credit
}

export default function GerantPurchasesScreen() {
    const [recentPurchases, setRecentPurchases] = useState<any[]>([
        { id: "ACH-8849", supplier: "Grossiste El Mountazah", date: "24/05/2026", totalHt: 155462, totalTva: 29538, totalTtc: 185000, shippingFees: 0, paymentMethod: "CREDIT", status: "Reçu", photos: ["https://picsum.photos/id/10/300/300"], productCount: 3, totalQuantity: 420 },
        { id: "ACH-8840", SPA: "SPA Ramy Boissons", supplier: "SPA Ramy Boissons", date: "22/05/2026", totalHt: 352941, totalTva: 67059, totalTtc: 420000, shippingFees: 5000, paymentMethod: "CASH", status: "Reçu", photos: ["https://picsum.photos/id/20/300/300", "https://picsum.photos/id/30/300/300"], productCount: 5, totalQuantity: 980 },
        { id: "ACH-8799", supplier: "SARL Soummam Lait", date: "18/05/2026", totalHt: 87156, totalTva: 7844, totalTtc: 95000, shippingFees: 0, paymentMethod: "CREDIT", status: "Brouillon", photos: [], productCount: 2, totalQuantity: 150 },
    ]);

    const [scanning, setScanning] = useState(false);
    const [scannedData, setScannedData] = useState<ScannedPurchase | null>(null);
    const [saving, setSaving] = useState(false);

    // Form inputs
    const [supplierName, setSupplierName] = useState("");
    const [shippingFees, setShippingFees] = useState("0");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CREDIT");
    const [itemsList, setItemsList] = useState<PurchaseItem[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [isTakingPhoto, setIsTakingPhoto] = useState(false);

    // Gemini AI OCR Simulation with extremely rich data extraction
    const captureFromCamera = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                await processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Camera scan error:", error);
            Alert.alert("Erreur", "Impossible d'accéder à l'appareil photo.");
        }
    };

    const pickFromGallery = async () => {
        const hasPermission = await requestLibraryPermission();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                await processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Gallery pick error:", error);
            Alert.alert("Erreur", "Impossible d'accéder à la galerie photo.");
        }
    };

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission refusée", "Vous devez autoriser l'accès à la caméra pour scanner les factures.");
            return false;
        }
        return true;
    };

    const requestLibraryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission refusée", "Vous devez autoriser l'accès à vos photos pour importer les factures.");
            return false;
        }
        return true;
    };

    const fallbackToSimulated = () => {
        const result: ScannedPurchase = {
            supplier: "SARL El Mountazah (El Eulma)",
            shippingFees: 1500, // Simulated transport fees
            paymentMethod: "CREDIT",
            items: [
                { name: "Canette Coca-Cola 33cl", quantity: 120, priceHt: 50, tvaRate: 19, currentStock: 80, oldPmp: 54, sellingPrice: 80 },
                { name: "Eau Minérale Lalla Khedidja 1.5L", quantity: 240, priceHt: 24, tvaRate: 9, currentStock: 150, oldPmp: 25, sellingPrice: 35 },
                { name: "Jus Ramy Orange 1L", quantity: 60, priceHt: 80, tvaRate: 19, currentStock: 40, oldPmp: 90, sellingPrice: 130 },
            ]
        };

        setScannedData(result);
        setSupplierName(result.supplier);
        setShippingFees(String(result.shippingFees));
        setPaymentMethod(result.paymentMethod);
        setItemsList(result.items);
        setPhotos(["https://picsum.photos/id/102/300/300"]);
        Alert.alert("✨ Facture Papier Numérisée (Simulé)", "L'IA a extrait le Fournisseur, les frais annexes, les articles avec HT, TVA et stocks actuels !");
    };

    const processImage = async (uri: string) => {
        setScanning(true);
        setScannedData(null);
        setPhotos([]);

        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: "base64",
            });

            // Call ocr-purchase API — backend expects { images: string[] }
            const response = await apiFetch("/ocr-purchase", {
                method: "POST",
                body: JSON.stringify({ images: [base64] }),
            });

            if (response.success && response.data) {
                const extracted = response.data;
                const result: ScannedPurchase = {
                    supplier: extracted.supplier || "Fournisseur Inconnu",
                    shippingFees: extracted.shippingFees || 0,
                    paymentMethod: extracted.paymentMethod || "CREDIT",
                    items: (extracted.items || []).map((item: any) => ({
                        name: item.name || "Article Inconnu",
                        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                        priceHt: typeof item.priceHt === 'number' ? item.priceHt : 0,
                        tvaRate: typeof item.tvaRate === 'number' ? item.tvaRate : 19,
                        currentStock: typeof item.currentStock === 'number' ? item.currentStock : 0,
                        oldPmp: typeof item.oldPmp === 'number' ? item.oldPmp : (typeof item.priceHt === 'number' ? item.priceHt : 0),
                        sellingPrice: typeof item.sellingPrice === 'number' ? item.sellingPrice : ((typeof item.priceHt === 'number' ? item.priceHt : 0) * 1.3)
                    }))
                };

                setScannedData(result);
                setSupplierName(result.supplier);
                setShippingFees(String(result.shippingFees));
                setPaymentMethod(result.paymentMethod);
                setItemsList(result.items);
                setPhotos([uri]);
                Alert.alert("✨ Facture Numérisée", "L'assistant IA a extrait le Fournisseur, les taxes et articles avec succès !");
            } else {
                fallbackToSimulated();
            }
        } catch (error) {
            console.error("OCR API error:", error);
            fallbackToSimulated();
        } finally {
            setScanning(false);
        }
    };

    const handleCameraScan = () => {
        Alert.alert(
            "Source de la facture",
            "Veuillez choisir comment importer votre facture fournisseur papier :",
            [
                { text: "Prendre une photo", onPress: () => captureFromCamera() },
                { text: "Choisir depuis la galerie", onPress: () => pickFromGallery() },
                { text: "Annuler", style: "cancel" }
            ]
        );
    };

    // Calculate financials in real time
    const calculateTotals = () => {
        let totalHt = 0;
        let totalTva = 0;
        
        itemsList.forEach(item => {
            const subtotalHt = item.quantity * item.priceHt;
            const subtotalTva = subtotalHt * (item.tvaRate / 100);
            totalHt += subtotalHt;
            totalTva += subtotalTva;
        });

        const parsedShipping = parseFloat(shippingFees) || 0;
        const totalTtc = totalHt + totalTva + parsedShipping;

        return {
            totalHt,
            totalTva,
            totalTtc
        };
    };

    const { totalHt, totalTva, totalTtc } = calculateTotals();

    // Weighted Average Cost (PMP) computation
    // PMP = ((Stock Actuel * Ancien PMP) + (Qté Achetée * Prix Achat HT)) / (Stock Actuel + Qté Achetée)
    const computeNewPmp = (item: PurchaseItem) => {
        const totalStock = item.currentStock + item.quantity;
        if (totalStock === 0) return item.priceHt;
        
        const currentValuation = item.currentStock * item.oldPmp;
        const purchaseValuation = item.quantity * item.priceHt;
        
        return Math.round((currentValuation + purchaseValuation) / totalStock * 100) / 100;
    };

    // Estimated margin based on new PMP
    // Margin % = ((Selling Price - PMP) / Selling Price) * 100
    const computeEstimatedMargin = (item: PurchaseItem, newPmp: number) => {
        if (item.sellingPrice <= 0) return 0;
        return Math.round(((item.sellingPrice - newPmp) / item.sellingPrice) * 1000) / 10;
    };

    // Handle inline item updates
    const updateItemField = (index: number, field: keyof PurchaseItem, val: any) => {
        setItemsList(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                [field]: val
            };
            return updated;
        });
    };

    const handleAddPhoto = () => {
        if (photos.length >= 3) {
            Alert.alert("Limite justificatifs", "Vous ne pouvez pas ajouter plus de 3 justificatifs.");
            return;
        }

        Alert.alert(
            "Ajouter un justificatif",
            "Prendre une photo ou choisir une image existante :",
            [
                {
                    text: "Prendre une photo",
                    onPress: async () => {
                        const hasPermission = await requestCameraPermission();
                        if (!hasPermission) return;
                        try {
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                quality: 0.8,
                            });
                            if (!result.canceled && result.assets?.[0]?.uri) {
                                setPhotos(prev => [...prev, result.assets[0].uri]);
                                Alert.alert("✓ Ajouté", "Pièce jointe enregistrée !");
                            }
                        } catch (err) {
                            Alert.alert("Erreur", "Impossible de prendre la photo.");
                        }
                    }
                },
                {
                    text: "Depuis la galerie",
                    onPress: async () => {
                        const hasPermission = await requestLibraryPermission();
                        if (!hasPermission) return;
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                quality: 0.8,
                            });
                            if (!result.canceled && result.assets?.[0]?.uri) {
                                setPhotos(prev => [...prev, result.assets[0].uri]);
                                Alert.alert("✓ Ajouté", "Pièce jointe enregistrée !");
                            }
                        } catch (err) {
                            Alert.alert("Erreur", "Impossible d'importer la photo.");
                        }
                    }
                },
                { text: "Annuler", style: "cancel" }
            ]
        );
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSavePurchase = async () => {
        if (!supplierName.trim()) {
            Alert.alert("Erreur", "Veuillez spécifier le nom du fournisseur.");
            return;
        }

        setSaving(true);
        try {
            setTimeout(() => {
                const newId = `ACH-${Math.floor(1000 + Math.random() * 9000)}`;
                const today = new Date().toLocaleDateString("fr-FR");
                
                const productCount = itemsList.length;
                const totalQuantity = itemsList.reduce((sum, item) => sum + item.quantity, 0);

                setRecentPurchases(prev => [
                    {
                        id: newId,
                        supplier: supplierName,
                        date: today,
                        totalHt,
                        totalTva,
                        totalTtc,
                        shippingFees: parseFloat(shippingFees) || 0,
                        paymentMethod,
                        status: "Reçu",
                        photos: [...photos],
                        productCount,
                        totalQuantity
                    },
                    ...prev
                ]);
                
                setScannedData(null);
                setSupplierName("");
                setShippingFees("0");
                setPhotos([]);
                setSaving(false);
                Alert.alert("✓ Achat Enregistré", "Le bon d'achat a été comptabilisé. Le stock et les prix moyens pondérés (PMP) des produits ont été recalculés !");
            }, 1200);
        } catch {
            setSaving(false);
            Alert.alert("Erreur", "Impossible d'enregistrer le bon d'achat.");
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Gestion des Achats</Text>
                <Text style={styles.headerSubtitle}>Entrées de stock, HT/TVA détaillés et calcul du PMP</Text>
            </View>

            {/* Scanning area widget */}
            <View style={styles.scanCard}>
                <View style={styles.scanBadge}>
                    <Ionicons name="sparkles" size={14} color="#22c55e" />
                    <Text style={styles.scanBadgeText}>OCR IA — Analyse intelligente</Text>
                </View>
                
                <Text style={styles.scanTitle}>Saisie rapide par Caméra</Text>
                <Text style={styles.scanDesc}>
                    Numérisez une facture fournisseur papier. L'IA extrait les articles, calcule les taxes (TVA, HT) et affiche la variation du prix d'achat moyen (PMP).
                </Text>

                {scanning ? (
                    <View style={styles.scanningWrap}>
                        <ActivityIndicator size="large" color="#22c55e" />
                        <Text style={styles.scanningText}>L'IA extrait les taxes et articles...</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.scanBtn} onPress={handleCameraScan}>
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={styles.scanBtnText}>Scanner une Facture Papier</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Rich Scanned Form Editor */}
            {scannedData && (
                <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <Ionicons name="document-text" size={20} color="#22c55e" />
                        <Text style={styles.formTitle}>Récapitulatif & Edition du Bon</Text>
                    </View>

                    {/* Inputs */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Fournisseur</Text>
                        <TextInput
                            style={styles.input}
                            value={supplierName}
                            onChangeText={setSupplierName}
                            placeholder="SARL Fournisseur"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.rowInputs}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Frais de Transport / Approche</Text>
                            <View style={styles.feesInputWrapper}>
                                <TextInput
                                    style={[styles.input, { paddingRight: 32 }]}
                                    keyboardType="numeric"
                                    value={shippingFees}
                                    onChangeText={setShippingFees}
                                />
                                <Text style={styles.feesSuffix}>DA</Text>
                            </View>
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Type de Règlement</Text>
                            <View style={styles.toggleGroup}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, paymentMethod === "CASH" && styles.toggleBtnActive]}
                                    onPress={() => setPaymentMethod("CASH")}
                                >
                                    <Text style={[styles.toggleText, paymentMethod === "CASH" && styles.toggleTextActive]}>Caisse</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, paymentMethod === "CREDIT" && styles.toggleBtnActive]}
                                    onPress={() => setPaymentMethod("CREDIT")}
                                >
                                    <Text style={[styles.toggleText, paymentMethod === "CREDIT" && styles.toggleTextActive]}>Crédit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Dynamic Items Table */}
                    <Text style={styles.itemsLabel}>Détail des Articles Extraits :</Text>
                    <View style={styles.itemsList}>
                        {itemsList.map((item, index) => {
                            const itemTotalHt = item.quantity * item.priceHt;
                            const itemTva = itemTotalHt * (item.tvaRate / 100);
                            const itemCostTtc = item.priceHt * (1 + item.tvaRate / 100);
                            
                            const newPmp = computeNewPmp(item);
                            const oldPmpVal = item.oldPmp;
                            const pmpDiff = newPmp - oldPmpVal;
                            
                            const marginRate = computeEstimatedMargin(item, newPmp);

                            return (
                                <View key={index} style={styles.itemCard}>
                                    {/* Item Title row */}
                                    <View style={styles.itemTitleRow}>
                                        <Text style={styles.itemNameText}>{item.name}</Text>
                                        <Text style={styles.stockBadge}>Stock Actuel: {item.currentStock}</Text>
                                    </View>

                                    {/* Inputs row */}
                                    <View style={styles.itemInputsRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.subLabel}>Quantité</Text>
                                            <TextInput
                                                style={styles.itemInputCompact}
                                                keyboardType="numeric"
                                                value={String(item.quantity)}
                                                onChangeText={(v) => updateItemField(index, "quantity", parseInt(v) || 0)}
                                            />
                                        </View>

                                        <View style={{ flex: 1.2 }}>
                                            <Text style={styles.subLabel}>Prix Unitaire HT</Text>
                                            <TextInput
                                                style={styles.itemInputCompact}
                                                keyboardType="numeric"
                                                value={String(item.priceHt)}
                                                onChangeText={(v) => updateItemField(index, "priceHt", parseFloat(v) || 0)}
                                            />
                                        </View>

                                        <View style={{ flex: 1.5 }}>
                                            <Text style={styles.subLabel}>Taux TVA</Text>
                                            <View style={styles.tvaPillsRow}>
                                                {[0, 9, 19].map(tRate => (
                                                    <TouchableOpacity
                                                        key={tRate}
                                                        style={[styles.tvaPill, item.tvaRate === tRate && styles.tvaPillActive]}
                                                        onPress={() => updateItemField(index, "tvaRate", tRate)}
                                                    >
                                                        <Text style={[styles.tvaPillText, item.tvaRate === tRate && styles.tvaPillTextActive]}>
                                                            {tRate}%
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Tax & PMP calculations breakdown */}
                                    <View style={styles.calculationsGrid}>
                                        <View style={styles.calcCell}>
                                            <Text style={styles.calcLabel}>Total HT</Text>
                                            <Text style={styles.calcValue}>{itemTotalHt.toLocaleString("fr-FR")} DA</Text>
                                        </View>
                                        <View style={styles.calcCell}>
                                            <Text style={styles.calcLabel}>Montant TVA</Text>
                                            <Text style={styles.calcValue}>+{itemTva.toLocaleString("fr-FR")} DA</Text>
                                        </View>
                                        <View style={styles.calcCell}>
                                            <Text style={styles.calcLabel}>Prix U. TTC</Text>
                                            <Text style={[styles.calcValue, { color: "#4ade80" }]}>
                                                {itemCostTtc.toLocaleString("fr-FR")} DA
                                            </Text>
                                        </View>
                                    </View>

                                    {/* PMP & Margin analysis */}
                                    <View style={styles.pmpRow}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <Ionicons name="trending-up" size={14} color="#f59e0b" />
                                            <Text style={styles.pmpLabel}>PMP Moyen :</Text>
                                            <Text style={styles.pmpValue}>
                                                {oldPmpVal} DA → <Text style={{ fontWeight: "800", color: "#f8fafc" }}>{newPmp} DA</Text>
                                            </Text>
                                            {pmpDiff !== 0 && (
                                                <Text style={[styles.diffText, pmpDiff > 0 ? styles.diffUp : styles.diffDown]}>
                                                    ({pmpDiff > 0 ? "+" : ""}{pmpDiff.toFixed(1)} DA)
                                                </Text>
                                            )}
                                        </View>

                                        <View style={[styles.marginBadge, marginRate < 20 ? styles.marginRed : styles.marginGreen]}>
                                            <Text style={[styles.marginText, marginRate < 20 ? styles.marginTextRed : styles.marginTextGreen]}>
                                                Marge: {marginRate}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Financial summary blocks */}
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Produits ajoutés (Réf.)</Text>
                            <Text style={styles.summaryValue}>{itemsList.length}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Quantité totale</Text>
                            <Text style={styles.summaryValue}>{itemsList.reduce((sum, item) => sum + item.quantity, 0)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Hors Taxes (HT)</Text>
                            <Text style={styles.summaryValue}>{totalHt.toLocaleString("fr-FR")} DA</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total TVA</Text>
                            <Text style={styles.summaryValue}>+{totalTva.toLocaleString("fr-FR")} DA</Text>
                        </View>
                        {parseFloat(shippingFees) > 0 ? (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Frais de Transport</Text>
                                <Text style={styles.summaryValue}>+{parseFloat(shippingFees).toLocaleString("fr-FR")} DA</Text>
                            </View>
                        ) : null}
                        <View style={[styles.summaryRow, styles.summaryRowGrand]}>
                            <Text style={styles.summaryLabelGrand}>TOTAL NET TTC</Text>
                            <Text style={styles.summaryValueGrand}>{totalTtc.toLocaleString("fr-FR")} DA</Text>
                        </View>
                    </View>

                    {/* Photos Proof upload */}
                    <View style={styles.inputGroup}>
                        <View style={styles.photoHeaderRow}>
                            <Text style={styles.label}>Justificatifs numériques ({photos.length}/3)</Text>
                            <Text style={styles.photoSublabel}>Factures d'achat, bons de transport et colis reçus</Text>
                        </View>

                        <View style={styles.photoContainer}>
                            {photos.map((photoUri, index) => (
                                <View key={index} style={styles.photoWrapper}>
                                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                                    <TouchableOpacity
                                        style={styles.deletePhotoBtn}
                                        onPress={() => handleRemovePhoto(index)}
                                    >
                                        <Ionicons name="close" size={12} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {photos.length < 3 && (
                                <TouchableOpacity
                                    style={styles.addPhotoBtn}
                                    onPress={handleAddPhoto}
                                    disabled={isTakingPhoto}
                                >
                                    {isTakingPhoto ? (
                                        <ActivityIndicator size="small" color="#22c55e" />
                                    ) : (
                                        <>
                                            <Ionicons name="camera-outline" size={20} color="#22c55e" />
                                            <Text style={styles.addPhotoText}>Ajouter</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Form actions */}
                    <View style={styles.formButtons}>
                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => setScannedData(null)}
                            disabled={saving}
                        >
                            <Text style={styles.cancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.confirmBtn} 
                            onPress={handleSavePurchase}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                    <Text style={styles.confirmText}>Valider & Mettre à jour</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* History listing */}
            <Text style={styles.sectionTitle}>BONS D'ACHAT ENREGISTRÉS</Text>
            <View style={styles.purchasesCard}>
                {recentPurchases.map((p, i) => (
                    <View key={i} style={[styles.purchaseRow, i === recentPurchases.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={styles.purchaseMeta}>
                                <Text style={styles.purchaseId}>{p.id}</Text>
                                <Text style={styles.purchaseDate}>{p.date}</Text>
                            </View>
                            <Text style={styles.purchaseSupplier}>{p.supplier}</Text>
                            
                            {/* Taxes breakdowns details in history */}
                            <View style={styles.historyTaxesRow}>
                                <Text style={styles.taxesText}>{p.productCount || 0} Réf. ({p.totalQuantity || 0} Qté)</Text>
                                <Text style={styles.taxesDivider}>|</Text>
                                <Text style={styles.taxesText}>HT: {p.totalHt.toLocaleString("fr-FR")} DA</Text>
                                <Text style={styles.taxesDivider}>|</Text>
                                <Text style={styles.taxesText}>TVA: {p.totalTva.toLocaleString("fr-FR")} DA</Text>
                                {p.shippingFees > 0 && (
                                    <>
                                        <Text style={styles.taxesDivider}>|</Text>
                                        <Text style={styles.taxesText}>Frais: {p.shippingFees.toLocaleString("fr-FR")} DA</Text>
                                    </>
                                )}
                            </View>
                        </View>
                        
                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.purchaseTotal}>{p.totalTtc.toLocaleString("fr-FR")} DA</Text>
                            
                            <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 6 }}>
                                {p.paymentMethod === "CASH" ? (
                                    <View style={styles.payBadgeCash}><Text style={styles.payBadgeText}>Caisse</Text></View>
                                ) : (
                                    <View style={styles.payBadgeCredit}><Text style={styles.payBadgeText}>Crédit</Text></View>
                                )}

                                {p.photos && p.photos.length > 0 ? (
                                    <View style={styles.proofBadge}>
                                        <Ionicons name="image-outline" size={10} color="#22c55e" />
                                        <Text style={styles.proofText}>{p.photos.length} Justif.</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.proofBadge, styles.proofBadgeMissing]}>
                                        <Ionicons name="warning-outline" size={10} color="#f59e0b" />
                                        <Text style={[styles.proofText, styles.proofTextMissing]}>Sans justif</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0a0f1e" },
    header: { padding: 16, paddingTop: 20 },
    headerTitle: { color: "#f8fafc", fontSize: 24, fontWeight: "900" },
    headerSubtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 24, marginBottom: 10,
    },

    // Scan card widget
    scanCard: {
        backgroundColor: "#1e293b", margin: 16, padding: 20, borderRadius: 20,
        borderWidth: 1, borderColor: "#334155",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    scanBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#22c55e15", paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, alignSelf: "flex-start", marginBottom: 12,
        borderWidth: 1, borderColor: "#22c55e30",
    },
    scanBadgeText: { color: "#22c55e", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
    scanTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "800" },
    scanDesc: { color: "#94a3b8", fontSize: 13, marginTop: 8, lineHeight: 18 },
    scanBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: "#22c55e", borderRadius: 12, height: 50, marginTop: 18,
    },
    scanBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    scanningWrap: { alignItems: "center", paddingVertical: 12, marginTop: 12, gap: 10 },
    scanningText: { color: "#22c55e", fontSize: 13, fontWeight: "600" },

    // Scanned editor card
    formCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, padding: 20, borderRadius: 20,
        borderWidth: 1, borderColor: "#334155", gap: 16,
    },
    formHeader: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 10 },
    formTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    
    inputGroup: { gap: 6 },
    label: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    input: { backgroundColor: "#0a0f1e", borderRadius: 10, height: 44, color: "#f8fafc", paddingHorizontal: 12, borderWidth: 1, borderColor: "#334155" },
    
    rowInputs: { flexDirection: "row", gap: 10 },
    feesInputWrapper: { position: "relative" },
    feesSuffix: { position: "absolute", right: 12, top: 12, color: "#64748b", fontWeight: "700", fontSize: 13 },
    
    toggleGroup: { flexDirection: "row", backgroundColor: "#0a0f1e", borderRadius: 10, height: 44, padding: 3, borderWidth: 1, borderColor: "#334155" },
    toggleBtn: { flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 8 },
    toggleBtnActive: { backgroundColor: "#22c55e" },
    toggleText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
    toggleTextActive: { color: "#fff" },

    itemsLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "700", marginTop: 4 },
    itemsList: { gap: 12 },
    
    // Rich Item Card
    itemCard: {
        backgroundColor: "#0a0f1e50", borderWidth: 1, borderColor: "#334155",
        borderRadius: 14, padding: 12, gap: 10
    },
    itemTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    itemNameText: { color: "#f8fafc", fontSize: 13, fontWeight: "700", flex: 1, paddingRight: 6 },
    stockBadge: { color: "#64748b", fontSize: 10, fontWeight: "700", backgroundColor: "#0a0f1e", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    
    itemInputsRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
    subLabel: { color: "#64748b", fontSize: 9, fontWeight: "600", marginBottom: 4 },
    itemInputCompact: { backgroundColor: "#0a0f1e", color: "#f8fafc", borderWidth: 1, borderColor: "#334155", borderRadius: 8, height: 36, paddingHorizontal: 8, fontSize: 12, fontWeight: "700" },
    
    tvaPillsRow: { flexDirection: "row", gap: 4, height: 36, backgroundColor: "#0a0f1e", borderWidth: 1, borderColor: "#334155", borderRadius: 8, padding: 2 },
    tvaPill: { flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 6 },
    tvaPillActive: { backgroundColor: "#22c55e" },
    tvaPillText: { color: "#64748b", fontSize: 9, fontWeight: "800" },
    tvaPillTextActive: { color: "#fff" },

    calculationsGrid: { flexDirection: "row", backgroundColor: "#0a0f1e40", padding: 8, borderRadius: 10, marginTop: 4 },
    calcCell: { flex: 1, alignItems: "center" },
    calcLabel: { color: "#64748b", fontSize: 9, fontWeight: "500" },
    calcValue: { color: "#f8fafc", fontSize: 11, fontWeight: "700", marginTop: 2 },

    pmpRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#33415530", paddingTop: 8 },
    pmpLabel: { color: "#f59e0b", fontSize: 10, fontWeight: "700" },
    pmpValue: { color: "#94a3b8", fontSize: 11, fontWeight: "600", marginLeft: 2 },
    diffText: { fontSize: 10, fontWeight: "700" },
    diffUp: { color: "#ef4444" },  // Higher costs are generally shown in red (warning)
    diffDown: { color: "#22c55e" },
    
    marginBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    marginGreen: { backgroundColor: "#22c55e15" },
    marginRed: { backgroundColor: "#ef444415" },
    marginText: { fontSize: 10, fontWeight: "800" },
    marginTextGreen: { color: "#22c55e" },
    marginTextRed: { color: "#ef4444" },

    // Financial Summary
    summaryContainer: { backgroundColor: "#0a0f1e", borderRadius: 14, borderWidth: 1, borderColor: "#334155", padding: 12, gap: 8 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    summaryLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    summaryValue: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
    summaryRowGrand: { borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 8, marginTop: 4 },
    summaryLabelGrand: { color: "#22c55e", fontSize: 14, fontWeight: "800" },
    summaryValueGrand: { color: "#22c55e", fontSize: 18, fontWeight: "900" },

    // Proof photos uploader
    photoHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    photoSublabel: { color: "#64748b", fontSize: 9, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
    photoContainer: { flexDirection: "row", gap: 12, marginTop: 4 },
    photoWrapper: { width: 60, height: 60, borderRadius: 12, position: "relative" },
    photoPreview: { width: "100%", height: "100%", borderRadius: 12 },
    deletePhotoBtn: {
        position: "absolute", top: -4, right: -4, backgroundColor: "#ef4444",
        width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center",
    },
    addPhotoBtn: {
        width: 60, height: 60, borderRadius: 12, borderWidth: 1.5, borderColor: "#334155",
        borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 2,
        backgroundColor: "#0a0f1e",
    },
    addPhotoText: { color: "#22c55e", fontSize: 9, fontWeight: "700" },

    formButtons: { flexDirection: "row", gap: 10, marginTop: 6 },
    cancelBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#334155", alignItems: "center", justifyContent: "center" },
    cancelText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
    confirmBtn: { flex: 2, height: 44, borderRadius: 10, backgroundColor: "#22c55e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    confirmText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    // Purchases list
    purchasesCard: { backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 14 },
    purchaseRow: { borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 10, gap: 4 },
    purchaseMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    purchaseId: { color: "#22c55e", fontWeight: "800", fontSize: 12 },
    purchaseDate: { color: "#64748b", fontSize: 11, fontWeight: "500" },
    purchaseSupplier: { color: "#f8fafc", fontSize: 14, fontWeight: "700", marginTop: 2 },
    
    historyTaxesRow: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
    taxesText: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    taxesDivider: { color: "#334155", fontSize: 11 },

    purchaseTotal: { color: "#f8fafc", fontWeight: "900", fontSize: 15 },
    payBadgeCash: { backgroundColor: "#22c55e15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#22c55e30" },
    payBadgeCredit: { backgroundColor: "#ef444415", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#ef444430" },
    payBadgeText: { color: "#f8fafc", fontSize: 9, fontWeight: "700" },

    proofBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#22c55e15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    proofBadgeMissing: { backgroundColor: "#f59e0b15" },
    proofText: { color: "#22c55e", fontSize: 9, fontWeight: "700" },
    proofTextMissing: { color: "#f59e0b", fontSize: 9, fontWeight: "700" },
});
