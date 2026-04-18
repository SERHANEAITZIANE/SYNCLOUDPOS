import React, { useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Modal, Alert,
    Vibration,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLangStore } from "../lib/i18n";

interface DeliveryProofProps {
    visible: boolean;
    customerName: string;
    onConfirm: (photoUri?: string) => void;
    onClose: () => void;
}

export default function DeliveryProof({ visible, customerName, onConfirm, onClose }: DeliveryProofProps) {
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const { t } = useLangStore();

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(t("error"), t("cameraAccess"));
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                quality: 0.6,
                allowsEditing: false,
            });
            if (!result.canceled && result.assets[0]) {
                setPhotoUri(result.assets[0].uri);
                Vibration.vibrate(50);
            }
        } catch (e: any) {
            Alert.alert(t("error"), e.message);
        }
    };

    const handleConfirm = () => {
        Vibration.vibrate(100);
        onConfirm(photoUri || undefined);
        setPhotoUri(null);
    };

    const handleClose = () => {
        setPhotoUri(null);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Ionicons name="camera" size={28} color="#22c55e" />
                        <Text style={styles.title}>{t("deliveryProof")}</Text>
                    </View>

                    <Text style={styles.customer}>{customerName}</Text>

                    {/* Photo preview or take photo */}
                    {photoUri ? (
                        <View style={styles.previewContainer}>
                            <View style={styles.previewBadge}>
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                <Text style={styles.previewText}>{t("photoTaken")}</Text>
                            </View>
                            <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
                                <Ionicons name="camera-reverse" size={18} color="#3b82f6" />
                                <Text style={styles.retakeText}>Reprendre</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={36} color="#64748b" />
                            <Text style={styles.photoBtnText}>{t("takePhoto")}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Ionicons name="checkmark-circle" size={22} color="#fff" />
                            <Text style={styles.confirmText}>{t("confirmDelivery")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.skipBtn} onPress={() => { handleConfirm(); }}>
                            <Text style={styles.skipText}>{t("skipPhoto")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.cancelText}>{t("cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center", alignItems: "center", padding: 24,
    },
    card: {
        width: "100%", backgroundColor: "#1e293b", borderRadius: 24,
        padding: 24, maxWidth: 400,
    },
    header: {
        flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8,
    },
    title: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
    customer: { color: "#94a3b8", fontSize: 14, marginBottom: 20 },

    photoBtn: {
        alignItems: "center", gap: 8, padding: 32,
        backgroundColor: "#0f172a", borderRadius: 16,
        borderWidth: 2, borderColor: "#334155", borderStyle: "dashed",
    },
    photoBtnText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

    previewContainer: {
        alignItems: "center", gap: 12, padding: 20,
        backgroundColor: "#052e16", borderRadius: 16,
        borderWidth: 1, borderColor: "#166534",
    },
    previewBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
    previewText: { color: "#22c55e", fontSize: 15, fontWeight: "700" },
    retakeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    retakeText: { color: "#3b82f6", fontSize: 13 },

    actions: { marginTop: 20, gap: 10, alignItems: "center" },
    confirmBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: "#22c55e", padding: 16,
        borderRadius: 14, width: "100%",
    },
    confirmText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    skipBtn: { padding: 8 },
    skipText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
    cancelText: { color: "#ef4444", fontSize: 14, marginTop: 4 },
});
