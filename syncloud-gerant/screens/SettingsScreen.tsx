import React, { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Switch, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../lib/store";
import { useLangStore } from "../lib/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
    const { user, logout } = useAuthStore();
    const { t, lang, setLang } = useLangStore();

    // Manager Preferences States
    const [lowStockThreshold, setLowStockThreshold] = useState("10");
    const [defaultCaisse, setDefaultCaisse] = useState("caisse_principale");
    const [emailDailyClose, setEmailDailyClose] = useState(true);
    const [emailDebtsAlert, setEmailDebtsAlert] = useState(true);
    const [emailStockAlert, setEmailStockAlert] = useState(true);
    const [autoSync, setAutoSync] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load saved preferences on mount
    useEffect(() => {
        (async () => {
            try {
                const threshold = await AsyncStorage.getItem("setting_lowStockThreshold");
                if (threshold) setLowStockThreshold(threshold);

                const caisse = await AsyncStorage.getItem("setting_defaultCaisse");
                if (caisse) setDefaultCaisse(caisse);

                const edc = await AsyncStorage.getItem("setting_emailDailyClose");
                if (edc !== null) setEmailDailyClose(edc !== "false");

                const eda = await AsyncStorage.getItem("setting_emailDebtsAlert");
                if (eda !== null) setEmailDebtsAlert(eda !== "false");

                const esa = await AsyncStorage.getItem("setting_emailStockAlert");
                if (esa !== null) setEmailStockAlert(esa !== "false");

                const as2 = await AsyncStorage.getItem("setting_autoSync");
                if (as2 !== null) setAutoSync(as2 !== "false");
            } catch { /* silent */ }
        })();
    }, []);

    const saveSetting = async (key: string, value: string) => {
        try {
            await AsyncStorage.setItem(`setting_${key}`, value);
        } catch { /* silent */ }
    };

    const handleToggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
        setter(value);
        await saveSetting(key, String(value));
    };

    const handleThresholdChange = async (value: string) => {
        setLowStockThreshold(value);
        await saveSetting("lowStockThreshold", value);
    };

    const handleCaisseChange = async (value: string) => {
        setDefaultCaisse(value);
        await saveSetting("defaultCaisse", value);
    };

    const handleLangChange = async (newLang: "fr" | "ar") => {
        await setLang(newLang);
        Alert.alert(
            newLang === "ar" ? "تم تغيير اللغة" : "Langue modifiée",
            newLang === "ar" ? "أعد تشغيل التطبيق لتطبيق الاتجاه RTL" : "Redémarrez l'application pour appliquer le changement de direction",
        );
    };

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

    // Bilingual local labels
    const isAr = lang === "ar";
    const labels = {
        alertesEmail: isAr ? "إشعارات البريد الإلكتروني" : "Alertes E-mail",
        caisseDefaut: isAr ? "حساب الصندوق الافتراضي" : "Compte Caisse par Défaut",
        caisseDefautDesc: isAr ? "الصندوق الرئيسي لحساب المعاملات اليومية" : "Caisse par défaut pour comptabiliser les flux de trésorerie",
        caisseP: isAr ? "الصندوق الرئيسي" : "Principale",
        caisseB: isAr ? "حساب البنك" : "Compte Bancaire",
        seuilStock: isAr ? "حد تنبيه نقص المخزون" : "Seuil d'Alerte Stock Bas",
        seuilStockDesc: isAr ? "التنبيه باللون الأحمر عند انخفاض كمية السلعة" : "Afficher en rouge dans l'état de santé si le stock tombe sous :",
        units: isAr ? "قطع" : "unités",
        dailyCloseMail: isAr ? "تقرير الغلق اليومي" : "Rapport de Clôture Quotidien",
        dailyCloseMailDesc: isAr ? "إرسال ملخص الكاسة تلقائياً بعد غلق اليوم" : "Recevoir le bilan caisse PDF après chaque clôture de journée",
        debtsAlertMail: isAr ? "تنبيه الديون المتأخرة" : "Rapports de Créances Clients",
        debtsAlertMailDesc: isAr ? "ملخص أسبوعي بالزبائن المتأخرين عن الدفع" : "Rapport hebdomadaire des clients en retard de paiement",
        stockAlertMail: isAr ? "تنبيه السلع الناقصة" : "Alerte de Rupture de Stock",
        stockAlertMailDesc: isAr ? "تنبيه فوري عند نفاد المنتجات الأساسية" : "Alerte instantanée en cas de rupture de stock critique",
        managerPreferences: isAr ? "تفضيلات المدير" : "Préférences Gérant",
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* User profile */}
            <View style={styles.profileCard}>
                <View style={styles.avatarLarge}>
                    <Ionicons name="shield-checkmark" size={32} color="#22c55e" />
                </View>
                <Text style={styles.userName}>{user?.name || "Gérant"}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user?.role || "ADMIN"}</Text>
                </View>
                <Text style={styles.tenantName}>{user?.tenant?.name || "SynCloud ERP"}</Text>
            </View>

            {/* Language Selection */}
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

            {/* Manager Preferences */}
            <Text style={styles.sectionLabel}>{labels.managerPreferences.toUpperCase()}</Text>

            {/* Default Treasury Account */}
            <View style={styles.settingCard}>
                <Text style={styles.settingTitle}>{labels.caisseDefaut}</Text>
                <Text style={styles.settingDesc}>{labels.caisseDefautDesc}</Text>
                <View style={styles.optionsRow}>
                    <TouchableOpacity
                        style={[styles.optionBtn, styles.optionBtnWide, defaultCaisse === "caisse_principale" && styles.optionBtnActive]}
                        onPress={() => handleCaisseChange("caisse_principale")}
                    >
                        <Ionicons name="wallet-outline" size={20} color={defaultCaisse === "caisse_principale" ? "#fff" : "#64748b"} />
                        <Text style={[styles.optionText, defaultCaisse === "caisse_principale" && styles.optionTextActive]}>
                            {labels.caisseP}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionBtn, styles.optionBtnWide, defaultCaisse === "compte_bancaire" && styles.optionBtnActive]}
                        onPress={() => handleCaisseChange("compte_bancaire")}
                    >
                        <Ionicons name="business-outline" size={20} color={defaultCaisse === "compte_bancaire" ? "#fff" : "#64748b"} />
                        <Text style={[styles.optionText, defaultCaisse === "compte_bancaire" && styles.optionTextActive]}>
                            {labels.caisseB}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Low Stock Alert Threshold */}
            <View style={styles.settingCard}>
                <Text style={styles.settingTitle}>{labels.seuilStock}</Text>
                <Text style={styles.settingDesc}>{labels.seuilStockDesc}</Text>
                <View style={styles.optionsRow}>
                    {["5", "10", "20", "50"].map((threshold) => (
                        <TouchableOpacity
                            key={threshold}
                            style={[styles.optionBtn, lowStockThreshold === threshold && styles.optionBtnActive]}
                            onPress={() => handleThresholdChange(threshold)}
                        >
                            <Text style={[styles.optionText, { fontSize: 13 }, lowStockThreshold === threshold && styles.optionTextActive]}>
                                {threshold} {labels.units}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Email Alerts Section */}
            <Text style={styles.sectionLabel}>{labels.alertesEmail.toUpperCase()}</Text>

            {/* Daily Close Email Toggle */}
            <View style={styles.settingCard}>
                <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.settingTitle}>{labels.dailyCloseMail}</Text>
                        <Text style={styles.settingDesc}>{labels.dailyCloseMailDesc}</Text>
                    </View>
                    <Switch
                        value={emailDailyClose}
                        onValueChange={(val) => handleToggle("emailDailyClose", val, setEmailDailyClose)}
                        trackColor={{ false: "#334155", true: "#22c55e" }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Late Debts Email Toggle */}
            <View style={styles.settingCard}>
                <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.settingTitle}>{labels.debtsAlertMail}</Text>
                        <Text style={styles.settingDesc}>{labels.debtsAlertMailDesc}</Text>
                    </View>
                    <Switch
                        value={emailDebtsAlert}
                        onValueChange={(val) => handleToggle("emailDebtsAlert", val, setEmailDebtsAlert)}
                        trackColor={{ false: "#334155", true: "#22c55e" }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Out of Stock Email Toggle */}
            <View style={styles.settingCard}>
                <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.settingTitle}>{labels.stockAlertMail}</Text>
                        <Text style={styles.settingDesc}>{labels.stockAlertMailDesc}</Text>
                    </View>
                    <Switch
                        value={emailStockAlert}
                        onValueChange={(val) => handleToggle("emailStockAlert", val, setEmailStockAlert)}
                        trackColor={{ false: "#334155", true: "#22c55e" }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* General Preferences */}
            <Text style={styles.sectionLabel}>{t("general").toUpperCase()}</Text>

            {/* Automatic Synchronization */}
            <View style={styles.settingCard}>
                <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.settingTitle}>{t("autoSync")}</Text>
                        <Text style={styles.settingDesc}>{t("autoSyncDesc")}</Text>
                    </View>
                    <Switch
                        value={autoSync}
                        onValueChange={(val) => handleToggle("autoSync", val, setAutoSync)}
                        trackColor={{ false: "#334155", true: "#22c55e" }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Version Info */}
            <Text style={styles.sectionLabel}>{t("info").toUpperCase()}</Text>
            <View style={styles.settingCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t("server")}</Text>
                    <Text style={styles.infoValue}>SynCloudPOS ERP</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t("version")}</Text>
                    <Text style={styles.infoValue}>1.0.0 (SDK 54)</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t("tenant")}</Text>
                    <Text style={styles.infoValue}>{user?.tenantId?.slice(-8).toUpperCase() || "DEMO"}</Text>
                </View>
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
        borderWidth: 1, borderColor: "#334155",
    },
    avatarLarge: {
        width: 72, height: 72, borderRadius: 20, backgroundColor: "#22c55e15",
        justifyContent: "center", alignItems: "center", marginBottom: 12,
        borderWidth: 1, borderColor: "#22c55e30",
    },
    userName: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
    userEmail: { color: "#64748b", fontSize: 14, marginTop: 2 },
    roleBadge: {
        backgroundColor: "#22c55e20", paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 8, marginTop: 8,
    },
    roleText: { color: "#22c55e", fontSize: 12, fontWeight: "700" },
    tenantName: { color: "#94a3b8", fontSize: 14, marginTop: 8, fontWeight: "600" },

    sectionLabel: {
        color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 2,
        paddingHorizontal: 16, marginTop: 20, marginBottom: 8,
    },

    settingCard: {
        backgroundColor: "#1e293b", marginHorizontal: 16, marginBottom: 8,
        padding: 16, borderRadius: 14,
        borderWidth: 1, borderColor: "#334155",
    },
    settingTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
    settingDesc: { color: "#64748b", fontSize: 12, marginTop: 4, lineHeight: 16 },

    optionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    optionBtn: {
        flex: 1, alignItems: "center", gap: 4, padding: 12, borderRadius: 10,
        backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155",
        flexDirection: "row", justifyContent: "center",
    },
    optionBtnWide: { flex: 1 },
    optionBtnActive: { backgroundColor: "#22c55e", borderColor: "#4ade80" },
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
