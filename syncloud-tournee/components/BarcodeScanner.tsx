import React, { useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Modal, Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useLangStore } from "../lib/i18n";

interface BarcodeScannerProps {
    visible: boolean;
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ visible, onScan, onClose }: BarcodeScannerProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const { t } = useLangStore();

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        Vibration.vibrate(100);
        onScan(data);
        setTimeout(() => setScanned(false), 2000);
    };

    if (!visible) return null;

    if (!permission?.granted) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.permissionContainer}>
                    <Ionicons name="camera-outline" size={64} color="#64748b" />
                    <Text style={styles.permissionTitle}>{t("cameraAccess")}</Text>
                    <Text style={styles.permissionDesc}>{t("cameraDesc")}</Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>{t("allowCamera")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>{t("cancel")}</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{
                        barcodeTypes: [
                            "ean13", "ean8", "upc_a", "upc_e",
                            "code128", "code39", "code93",
                            "itf14", "codabar", "qr",
                        ],
                    }}
                    onBarcodeScanned={handleBarCodeScanned}
                >
                    {/* Overlay */}
                    <View style={styles.overlay}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{t("scanBarcode")}</Text>
                            <View style={styles.headerBtn} />
                        </View>

                        {/* Scan frame */}
                        <View style={styles.scanArea}>
                            <View style={styles.scanFrame}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                            </View>
                            <Text style={styles.scanHint}>{t("alignBarcode")}</Text>
                        </View>

                        {scanned && (
                            <View style={styles.scannedBadge}>
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                <Text style={styles.scannedText}>{t("codeScanned")}</Text>
                            </View>
                        )}
                    </View>
                </CameraView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    camera: { flex: 1 },

    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },

    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 16, paddingTop: 50,
    },
    headerBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },

    scanArea: { flex: 1, justifyContent: "center", alignItems: "center" },
    scanFrame: {
        width: 260, height: 160,
        borderWidth: 0, position: "relative",
    },
    corner: {
        position: "absolute", width: 30, height: 30,
        borderColor: "#3b82f6", borderWidth: 3,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

    scanHint: { color: "#94a3b8", fontSize: 13, marginTop: 20, textAlign: "center" },

    scannedBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#0f172a", padding: 12, paddingHorizontal: 20,
        borderRadius: 12, alignSelf: "center", marginBottom: 40,
    },
    scannedText: { color: "#22c55e", fontSize: 14, fontWeight: "700" },

    // Permission screen
    permissionContainer: {
        flex: 1, backgroundColor: "#0f172a", justifyContent: "center",
        alignItems: "center", padding: 32,
    },
    permissionTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "800", marginTop: 16 },
    permissionDesc: { color: "#64748b", fontSize: 14, textAlign: "center", marginTop: 8 },
    permissionBtn: {
        backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: 14, marginTop: 24,
    },
    permissionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    closeBtn: { marginTop: 16, padding: 12 },
    closeBtnText: { color: "#64748b", fontSize: 15 },
});
