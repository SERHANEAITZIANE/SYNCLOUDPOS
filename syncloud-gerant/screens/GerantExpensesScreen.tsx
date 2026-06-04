import React, { useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, TextInput, Alert, Image, Dimensions,
    FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string;
    source: string;
    date: string;
    photos: string[];
}

export default function GerantExpensesScreen() {
    const [expenses, setExpenses] = useState<Expense[]>([
        {
            id: "DEP-4492",
            category: "Carburant",
            amount: 4500,
            description: "Plein gasoil camion de tournée Est",
            source: "Caisse Principale (Espèces)",
            date: "25/05/2026",
            photos: ["https://picsum.photos/id/10/300/300"]
        },
        {
            id: "DEP-4488",
            category: "Loyer & Charges",
            amount: 35000,
            description: "Facture Electricité Dépôt Central",
            source: "Compte Banque",
            date: "24/05/2026",
            photos: ["https://picsum.photos/id/20/300/300"]
        },
        {
            id: "DEP-4480",
            category: "Fournitures",
            amount: 2400,
            description: "Papier rame + stylos pour bureau comptable",
            source: "Caisse Principale (Espèces)",
            date: "22/05/2026",
            photos: []
        }
    ]);

    const categories = ["Carburant", "Loyer & Charges", "Fournitures", "Maintenance", "Salaires", "Autre"];
    const sources = ["Caisse Principale (Espèces)", "Compte Banque"];

    const scrollViewRef = React.useRef<ScrollView>(null);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    // Form states
    const [selectedCategory, setSelectedCategory] = useState("Carburant");
    const [selectedSource, setSelectedSource] = useState("Caisse Principale (Espèces)");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTakingPhoto, setIsTakingPhoto] = useState(false);

    // Mock taking a photo (max 3)
    const handleAddPhoto = () => {
        if (photos.length >= 3) {
            Alert.alert("Limite atteinte", "Vous ne pouvez pas ajouter plus de 3 photos justificatives.");
            return;
        }

        setIsTakingPhoto(true);

        // Simulate camera take after 1.2s
        setTimeout(() => {
            const randomId = Math.floor(Math.random() * 100) + 1;
            const newPhotoUrl = `https://picsum.photos/id/${randomId}/300/300`;
            setPhotos(prev => [...prev, newPhotoUrl]);
            setIsTakingPhoto(false);
            Alert.alert("✨ Photo capturée", "Justificatif ajouté avec succès !");
        }, 1200);
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditExpense = (expense: Expense) => {
        setEditingExpenseId(expense.id);
        setSelectedCategory(expense.category);
        setSelectedSource(expense.source);
        setAmount(String(expense.amount));
        setDescription(expense.description);
        setPhotos(expense.photos);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const handleCancelEdit = () => {
        setEditingExpenseId(null);
        setSelectedCategory("Carburant");
        setSelectedSource("Caisse Principale (Espèces)");
        setAmount("");
        setDescription("");
        setPhotos([]);
    };

    const handleDeleteExpense = (id: string) => {
        Alert.alert(
            "Supprimer la dépense",
            "Êtes-vous sûr de vouloir supprimer définitivement cette dépense ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => {
                        setExpenses(prev => prev.filter(exp => exp.id !== id));
                        if (editingExpenseId === id) {
                            handleCancelEdit();
                        }
                        Alert.alert("✓ Supprimé", "La dépense a été supprimée.");
                    }
                }
            ]
        );
    };

    const handleSaveExpense = () => {
        if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
            Alert.alert("Erreur", "Veuillez entrer un montant valide supérieur à 0.");
            return;
        }

        if (!description.trim()) {
            Alert.alert("Erreur", "Veuillez fournir une description/motif pour cette dépense.");
            return;
        }

        setIsSubmitting(true);

        // Simulate save delay
        setTimeout(() => {
            if (editingExpenseId) {
                setExpenses(prev => prev.map(exp => {
                    if (exp.id === editingExpenseId) {
                        return {
                            ...exp,
                            category: selectedCategory,
                            amount: Number(amount),
                            description: description.trim(),
                            source: selectedSource,
                            photos: [...photos]
                        };
                    }
                    return exp;
                }));
                setEditingExpenseId(null);
                Alert.alert("✓ Modifié", "La dépense a été mise à jour !");
            } else {
                const newExpense: Expense = {
                    id: `DEP-${Math.floor(4000 + Math.random() * 1000)}`,
                    category: selectedCategory,
                    amount: Number(amount),
                    description: description.trim(),
                    source: selectedSource,
                    date: new Date().toLocaleDateString("fr-FR"),
                    photos: [...photos]
                };
                setExpenses(prev => [newExpense, ...prev]);
                Alert.alert("✓ Succès", "La dépense a été enregistrée et la caisse a été débitée !");
            }
            
            // Reset form
            setAmount("");
            setDescription("");
            setPhotos([]);
            setIsSubmitting(false);
        }, 1000);
    };

    return (
        <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Gestion des Dépenses</Text>
                <Text style={styles.headerSubtitle}>Enregistrement rapide et traçabilité par photo justificative</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
                <View style={styles.formHeader}>
                    <Ionicons name={editingExpenseId ? "create-outline" : "add-circle"} size={22} color="#3b82f6" />
                    <Text style={styles.formTitle}>
                        {editingExpenseId ? "Modifier la Dépense" : "Nouvelle Dépense / Décaissement"}
                    </Text>
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Catégorie de Dépense</Text>
                    <View style={styles.categoryWrap}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryBadge,
                                    selectedCategory === cat && styles.categoryBadgeActive
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.categoryBadgeText,
                                        selectedCategory === cat && styles.categoryBadgeTextActive
                                    ]}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Source Selection */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Source de Financement / Caisse</Text>
                    <View style={styles.sourceWrap}>
                        {sources.map((src) => (
                            <TouchableOpacity
                                key={src}
                                style={[
                                    styles.sourceBtn,
                                    selectedSource === src && styles.sourceBtnActive
                                ]}
                                onPress={() => setSelectedSource(src)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={src.includes("Espèces") ? "wallet-outline" : "business-outline"}
                                    size={16}
                                    color={selectedSource === src ? "#fff" : "#94a3b8"}
                                />
                                <Text
                                    style={[
                                        styles.sourceBtnText,
                                        selectedSource === src && styles.sourceBtnTextActive
                                    ]}
                                >
                                    {src}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Amount and Description */}
                <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Montant (DA)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="Ex: 5000"
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description / Motif de la dépense</Text>
                    <TextInput
                        style={[styles.input, { height: 60, paddingTop: 10 }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ex: Achat carburant ou réparation camion"
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </View>

                {/* Photos Proof (Max 3) */}
                <View style={styles.inputGroup}>
                    <View style={styles.photoHeaderRow}>
                        <Text style={styles.label}>Photos justificatives ({photos.length}/3)</Text>
                        <Text style={styles.photoSublabel}>Obligatoire pour traçabilité complète</Text>
                    </View>

                    <View style={styles.photoContainer}>
                        {photos.map((photoUri, index) => (
                            <View key={index} style={styles.photoWrapper}>
                                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                                <TouchableOpacity
                                    style={styles.deletePhotoBtn}
                                    onPress={() => handleRemovePhoto(index)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {photos.length < 3 && (
                            <TouchableOpacity
                                style={styles.addPhotoBtn}
                                onPress={handleAddPhoto}
                                disabled={isTakingPhoto}
                                activeOpacity={0.8}
                            >
                                {isTakingPhoto ? (
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                ) : (
                                    <>
                                        <Ionicons name="camera-outline" size={24} color="#3b82f6" />
                                        <Text style={styles.addPhotoText}>Ajouter</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Submit button */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                    {editingExpenseId && (
                        <TouchableOpacity
                            style={styles.cancelEditBtn}
                            onPress={handleCancelEdit}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelEditText}>Annuler</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                        onPress={handleSaveExpense}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name={editingExpenseId ? "save-outline" : "checkmark-done"} size={20} color="#fff" />
                                <Text style={styles.submitBtnText}>
                                    {editingExpenseId ? "Modifier" : "Enregistrer la Dépense"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recent Expenses List */}
            <Text style={styles.sectionTitle}>HISTORIQUE DES DÉPENSES RÉCENTES</Text>
            <View style={styles.expensesCard}>
                {expenses.length === 0 ? (
                    <Text style={styles.emptyText}>Aucune dépense enregistrée récemment.</Text>
                ) : (
                    expenses.map((exp, index) => (
                        <View
                            key={exp.id}
                            style={[
                                styles.expenseRow,
                                index === expenses.length - 1 && { borderBottomWidth: 0 }
                            ]}
                        >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <View style={styles.expenseMetaRow}>
                                    <Text style={styles.expenseId}>{exp.id}</Text>
                                    <Text style={styles.expenseDate}>{exp.date}</Text>
                                    <Text style={styles.expenseSource}>{exp.source.split(" ")[0]}</Text>
                                </View>
                                <Text style={styles.expenseDesc}>{exp.description}</Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <View style={styles.expenseCategoryBadge}>
                                        <Text style={styles.expenseCategoryText}>{exp.category}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.actionIconBtn} 
                                        onPress={() => handleEditExpense(exp)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="create-outline" size={13} color="#3b82f6" />
                                        <Text style={styles.actionIconText}>Modifier</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.actionIconBtn} 
                                        onPress={() => handleDeleteExpense(exp.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={13} color="#ef4444" />
                                        <Text style={styles.actionIconTextDelete}>Supprimer</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.expenseAmount}>
                                    -{exp.amount.toLocaleString("fr-FR")} DA
                                </Text>
                                {exp.photos.length > 0 ? (
                                    <View style={styles.proofBadge}>
                                        <Ionicons name="image-outline" size={12} color="#22c55e" />
                                        <Text style={styles.proofText}>
                                            {exp.photos.length} Justif.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={[styles.proofBadge, styles.proofBadgeMissing]}>
                                        <Ionicons name="warning-outline" size={12} color="#f59e0b" />
                                        <Text style={[styles.proofText, styles.proofTextMissing]}>
                                            Sans justif
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    header: { padding: 16, paddingTop: 20 },
    headerTitle: { color: "#f8fafc", fontSize: 24, fontWeight: "900" },
    headerSubtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },

    sectionTitle: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 24, marginBottom: 10,
    },

    // Form
    formCard: {
        backgroundColor: "#1e293b", margin: 16, padding: 20, borderRadius: 20,
        borderWidth: 1, borderColor: "#334155", gap: 18,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
    },
    formHeader: {
        flexDirection: "row", alignItems: "center", gap: 8,
        borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 12
    },
    formTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
    
    inputGroup: { gap: 8 },
    label: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    
    // Category Selector
    categoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    categoryBadge: {
        backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155",
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    categoryBadgeActive: {
        backgroundColor: "#2563eb", borderColor: "#2563eb",
    },
    categoryBadgeText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    categoryBadgeTextActive: { color: "#fff" },

    // Source Selector
    sourceWrap: { flexDirection: "row", gap: 10 },
    sourceBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155",
        paddingVertical: 10, borderRadius: 12,
    },
    sourceBtnActive: {
        backgroundColor: "#22c55e", borderColor: "#22c55e",
    },
    sourceBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    sourceBtnTextActive: { color: "#fff" },

    rowInputs: { flexDirection: "row", gap: 12 },
    input: {
        backgroundColor: "#0f172a", borderRadius: 12, height: 48,
        color: "#f8fafc", paddingHorizontal: 14, borderWidth: 1, borderColor: "#334155",
        fontSize: 14,
    },

    // Photos Proof
    photoHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    photoSublabel: { color: "#ef4444", fontSize: 10, fontWeight: "600" },
    photoContainer: { flexDirection: "row", gap: 12, marginTop: 4 },
    photoWrapper: { width: 72, height: 72, borderRadius: 12, position: "relative" },
    photoPreview: { width: "100%", height: "100%", borderRadius: 12 },
    deletePhotoBtn: {
        position: "absolute", top: -4, right: -4, backgroundColor: "#ef4444",
        width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center",
    },
    addPhotoBtn: {
        width: 72, height: 72, borderRadius: 12, borderWidth: 1.5, borderColor: "#334155",
        borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 4,
        backgroundColor: "#0f172a",
    },
    addPhotoText: { color: "#3b82f6", fontSize: 10, fontWeight: "700" },

    submitBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: "#2563eb", borderRadius: 12, height: 50,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    // History Card
    expensesCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 14,
    },
    emptyText: { color: "#64748b", fontSize: 13, textAlign: "center", paddingVertical: 12 },
    expenseRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderBottomWidth: 1, borderBottomColor: "#334155/60", paddingBottom: 12,
    },
    expenseMetaRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    expenseId: { color: "#3b82f6", fontWeight: "700", fontSize: 11 },
    expenseDate: { color: "#64748b", fontSize: 11 },
    expenseSource: { color: "#94a3b8", fontSize: 10, fontWeight: "600", backgroundColor: "#0f172a", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    expenseDesc: { color: "#f8fafc", fontSize: 13, fontWeight: "600", marginTop: 6 },
    expenseCategoryBadge: {
        backgroundColor: "#3b82f615", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6,
    },
    expenseCategoryText: { color: "#3b82f6", fontSize: 10, fontWeight: "700" },
    expenseAmount: { color: "#ef4444", fontWeight: "800", fontSize: 14 },
    proofBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "#22c55e15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4,
    },
    proofBadgeMissing: { backgroundColor: "#f59e0b15" },
    proofText: { color: "#22c55e", fontSize: 9, fontWeight: "700" },
    proofTextMissing: { color: "#f59e0b" },
    actionIconBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(148,163,184,0.06)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
    },
    actionIconText: {
        color: "#3b82f6",
        fontSize: 10,
        fontWeight: "700",
    },
    actionIconTextDelete: {
        color: "#ef4444",
        fontSize: 10,
        fontWeight: "700",
    },
    cancelEditBtn: {
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.3)",
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        height: 50,
    },
    cancelEditText: {
        color: "#ef4444",
        fontSize: 14,
        fontWeight: "700",
    },
});
