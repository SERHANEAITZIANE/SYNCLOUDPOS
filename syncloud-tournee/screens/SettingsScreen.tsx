import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Switch, Alert, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../lib/store";
import { useLangStore } from "../lib/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
    const { user, logout } = useAuthStore();
    const { t, lang, setLang } = useLangStore();
    const [mapsProvider, setMapsProvider] = useState("google");
    const [gpsSource, setGpsSource] = useState("phone");
    const [gpsTracking, setGpsTracking] = useState(true);
    const [autoSync, setAutoSync] = useState(true);

    // Load saved settings on mount
    useEffect(() => {
        (async () => {
            try {
                const mp = await AsyncStorage.getItem("setting_mapsProvider");
                if (mp) setMapsProvider(mp);
                const gs = await AsyncStorage.getItem("setting_gpsSource");
                if (gs) setGpsSource(gs);
                const gt = await AsyncStorage.getItem("setting_gpsTracking");
                if (gt !== null) setGpsTracking(gt !== "false");
                const as2 = await AsyncStorage.getItem("setting_autoSync");
                if (as2 !== null) setAutoSync(as2 !== "false");
            } catch { /* silent */ }
        })();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            t("logout"),
            t("logoutConfirm"),
            [
                { text: t("cancel"), style: "cancel" },
                { text: t("disconnect"), style: "destructive", onPress: logout },
            ]
        );
    };

    const saveSetting = async (key: string, value: string) => {
        await AsyncStorage.setItem(`setting_${key}`, value);
    };

    const handleLangChange = async (newLang: "fr" | "ar") => {
        await setLang(newLang);
        Alert.alert(
            newLang === "ar" ? "تم تغيير اللغة" : "Langue modifiée",
            newLang === "ar" ? "أعد تشغيل التطبيق لتطبيق الاتجاه RTL" : "Redémarrez l'application pour appliquer le changement de direction",
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* User profile */}
            <View style={styles.profileCard}>
                <View style={styles.avatarLarge}>
                    <Ionicons name="person" size={32} color="#94a3b8" />
                </View>
                <Text style={styles.userName}>{user?.name || "Livreur"}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user?.role || "DRIVER"}</Text>
                </View>
                <Text style={styles.tenantName}>{user?.tenant?.name}</Text>
            </View>

            {/* Language */}
            <Text style={styles.sectionLabel}>{t("language")}</Text>
            <View style={styles.settingCard}>
                <Text style={styles.settingTitle}>{t("langLabel")}</Text>
                <View style={styles.optionsRow}>
                    <TouchableOpacity
                        style={[styles.optionBtn, lang === "fr" && styles.optionBtnActive]}
                        onPress={() => handleLangChange("fr")}
                    >
                        <Text style={{ fontSize: 18 }}>🇫🇷</Text>
                        <Text style={[styles.optionText, lang === "fr" && styles.optionTextActive]}>
                            {t("french")}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionBtn, lang === "ar" && styles.optionBtnActive]}
                        onPress={() => handleLangChange("ar")}
                    >
                        <Text style={{ fontSize: 18 }}>🇩🇿</Text>
                        <Text style={[styles.optionText, lang === "ar" && styles.optionTextActive]}>
                            {t("arabic")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Maps Provider */}
            <Text style={styles.sectionLabel}>{t("gpsNavigation")}</Text>
            <View style={styles.settingCard}>
                <Text style={styles.settingTitle}>{t("navApp")}</Text>
                <View style={styles.optionsRow}>
                    {[
                        { key: "google", label: t("googleMaps"), icon: "map" },
                        { key: "waze", label: t("waze"), icon: "navigate" },
                        { key: "osm", label: t("osm"), icon: "globe" },
                    ].map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.optionBtn, mapsProvider === opt.key && styles.optionBtnActive]}
                            onPress={() => {
                                setMapsProvider(opt.key);
                                saveSetting("mapsProvider", opt.key);
                            }}
                        >
                            <Ionicons
                                name={opt.icon as any}
                                size={20}
                                color={mapsProvider === opt.key ? "#fff" : "#64748b"}
                            />
                            <Text style={[styles.optionText, mapsProvider === opt.key && styles.optionTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* GPS Source */}
            <View style={styles.settingCard}>
                <Text style={styles.settingTitle}>{t("gpsSource")}</Text>
                <Text style={styles.settingDesc}>{t("gpsSourceDesc")}</Text>
                <View style={styles.optionsRow}>
                    <TouchableOpacity
                        style={[styles.optionBtn, styles.optionBtnWide, gpsSource === "phone" && styles.optionBtnActive]}
                        onPress={() => { setGpsSource("phone"); saveSetting("gpsSource", "phone"); }}
                    >
                        <Ionicons name="phone-portrait" size={22} color={gpsSource === "phone" ? "#fff" : "#64748b"} />
                        <Text style={[styles.optionText, gpsSource === "phone" && styles.optionTextActive]}>
                            {t("phoneGPS")}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionBtn, styles.optionBtnWide, gpsSource === "tracker" && styles.optionBtnActive]}
                        onPress={() => { setGpsSource("tracker"); saveSetting("gpsSource", "tracker"); }}
                    >
                        <Ionicons name="car" size={22} color={gpsSource === "tracker" ? "#fff" : "#64748b"} />
                        <Text style={[styles.optionText, gpsSource === "tracker" && styles.optionTextActive]}>
                            {t("truckTracker")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Toggles */}
            <Text style={styles.sectionLabel}>{t("general")}</Text>
            <View style={styles.settingCard}>
                <View style={styles.toggleRow}>
                    <View>
                        <Text style={styles.settingTitle}>{t("activeGPS")}</Text>
                        <Text style={styles.settingDesc}>{t("sendPosition")}</Text>
                    </View>
                    <Switch
                        value={gpsTracking}
                        onValueChange={(val) => { setGpsTracking(val); saveSetting("gpsTracking", String(val)); }}
                        trackColor={{ false: "#334155", true: "#2563eb" }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            <View style={styles.settingCard}>
                <View style={styles.toggleRow}>
                    <View>
                        <Text style={styles.settingTitle}>{t("autoSync")}</Text>
                        <Text style={styles.settingDesc}>{t("autoSyncDesc")}</Text>
                    </View>
                    <Switch
                        value={autoSync}
                        onValueChange={(val) => { setAutoSync(val); saveSetting("autoSync", String(val)); }}
                        trackColor={{ false: "#334155", true: "#2563eb" }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Info */}
            <Text style={styles.sectionLabel}>{t("info")}</Text>
            <View style={styles.settingCard}>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>{t("server")}</Text><Text style={styles.infoValue}>SynCloudPOS</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>{t("version")}</Text><Text style={styles.infoValue}>1.0.0</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>{t("tenant")}</Text><Text style={styles.infoValue}>{user?.tenantId?.slice(-8)}</Text></View>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>{t("logout")}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },

    profileCard: {
        alignItems: "center", padding: 24,
        backgroundColor: "#1e293b", margin: 16, borderRadius: 20,
    },
    avatarLarge: {
        width: 72, height: 72, borderRadius: 20, backgroundColor: "#334155",
        justifyContent: "center", alignItems: "center", marginBottom: 12,
    },
    userName: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
    userEmail: { color: "#64748b", fontSize: 14, marginTop: 2 },
    roleBadge: {
        backgroundColor: "#2563eb20", paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 8, marginTop: 8,
    },
    roleText: { color: "#3b82f6", fontSize: 12, fontWeight: "700" },
    tenantName: { color: "#94a3b8", fontSize: 14, marginTop: 8, fontWeight: "600" },

    sectionLabel: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 20, marginBottom: 8,
    },

    settingCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 8,
        padding: 16, borderRadius: 14,
    },
    settingTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    settingDesc: { color: "#64748b", fontSize: 12, marginTop: 4 },

    optionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    optionBtn: {
        flex: 1, alignItems: "center", gap: 4, padding: 12, borderRadius: 10,
        backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155",
    },
    optionBtnWide: { flex: 1 },
    optionBtnActive: { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
    optionText: { color: "#64748b", fontSize: 11, fontWeight: "600" },
    optionTextActive: { color: "#fff" },

    toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    infoRow: {
        flexDirection: "row", justifyContent: "space-between",
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#334155",
    },
    infoLabel: { color: "#64748b", fontSize: 14 },
    infoValue: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },

    logoutBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, margin: 16, padding: 16, borderRadius: 14,
        backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#7f1d1d",
    },
    logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "700" },
});
