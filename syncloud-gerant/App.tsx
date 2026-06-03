import React, { useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, StyleSheet, Image, KeyboardAvoidingView,
    Platform, Alert, StatusBar, Dimensions, Modal, Linking,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "./lib/store";
import { useLangStore } from "./lib/i18n";

// ─── Screens ────────────────────────────────────────────────────────────────
import SettingsScreen from "./screens/SettingsScreen";
import GerantDashboardScreen from "./screens/GerantDashboardScreen";
import GerantPurchasesScreen from "./screens/GerantPurchasesScreen";
import GerantExpensesScreen from "./screens/GerantExpensesScreen";
import ReportsScreen from "./screens/ReportsScreen";
import SalesAnalyticsScreen from "./screens/SalesAnalyticsScreen";
import ProfitReportScreen from "./screens/ProfitReportScreen";
import ClientDebtsScreen from "./screens/ClientDebtsScreen";
import DailyCloseScreen from "./screens/DailyCloseScreen";
import SupplierLedgerScreen from "./screens/SupplierLedgerScreen";
import CashFlowScreen from "./screens/CashFlowScreen";
import DriverMonitorScreen from "./screens/DriverMonitorScreen";
import InventoryHealthScreen from "./screens/InventoryHealthScreen";
import G50TaxScreen from "./screens/G50TaxScreen";
import ChequeManagerScreen from "./screens/ChequeManagerScreen";
import CatalogScreen from "./screens/CatalogScreen";
import CreateBLScreen from "./screens/CreateBLScreen";
import AlertsScreen from "./screens/AlertsScreen";
import AiAdvisorScreen from "./screens/AiAdvisorScreen";

// ─── Services ───────────────────────────────────────────────────────────────
import { startGPSTracking, stopGPSTracking } from "./lib/gps-tracking";
import { fullSync } from "./lib/offline-sync";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Theme ──────────────────────────────────────────────────────────────────
const AppTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: "#22c55e",
        background: "#0f172a",
        card: "#1e293b",
        text: "#f8fafc",
        border: "#334155",
        notification: "#ef4444",
    },
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen() {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const login = useAuthStore((s) => s.login);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Erreur", "Veuillez remplir tous les champs");
            return;
        }
        setLoading(true);
        try {
            await login(email.trim(), password, Platform.OS);
        } catch (e: any) {
            Alert.alert("Erreur de connexion", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.loginContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar barStyle="light-content" />
            <View style={styles.loginCard}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoBadge}>
                        <Ionicons name="car" size={36} color="#fff" />
                    </View>
                    <Text style={styles.logoTitle}>SynCloud</Text>
                    <Text style={styles.logoSubtitle}>GÉRANT</Text>
                </View>

                {/* Form */}
                <View style={styles.formGroup}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#64748b"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mot de passe"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="log-in-outline" size={20} color="#fff" />
                            <Text style={styles.loginBtnText}>Se connecter</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.versionText}>v2.0.0 — SynCloudPOS</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Tab Navigator (Gérant App) ──────────────────────────────────────────────
function GerantTabs() {
    const { t } = useLangStore();
    return (
        <Tab.Navigator
            id="GerantTabs"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === "Dashboard") iconName = focused ? "analytics" : "analytics-outline";
                    else if (route.name === "Alerts") iconName = focused ? "notifications" : "notifications-outline";
                    else if (route.name === "AI") iconName = focused ? "sparkles" : "sparkles-outline";
                    else if (route.name === "Rapports") iconName = focused ? "bar-chart" : "bar-chart-outline";
                    else if (route.name === "Paramètres") iconName = focused ? "settings" : "settings-outline";
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: "#22c55e",
                tabBarInactiveTintColor: "#64748b",
                tabBarStyle: {
                    backgroundColor: "#1e293b",
                    borderTopColor: "#334155",
                    paddingBottom: Platform.OS === "ios" ? 20 : 8,
                    paddingTop: 8,
                    height: Platform.OS === "ios" ? 88 : 64,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "600",
                },
                headerStyle: {
                    backgroundColor: "#0f172a",
                },
                headerTintColor: "#f8fafc",
                headerTitleStyle: {
                    fontWeight: "bold",
                },
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={GerantDashboardScreen}
                options={{ title: "Dashboard" }}
            />
            <Tab.Screen
                name="Alerts"
                component={AlertsScreen}
                options={{
                    title: "Alertes",
                    tabBarBadgeStyle: { backgroundColor: "#ef4444" },
                }}
            />
            <Tab.Screen
                name="AI"
                component={AiAdvisorScreen}
                options={{ title: "Conseiller IA" }}
            />
            <Tab.Screen
                name="Rapports"
                component={ReportsScreen}
                options={{ title: "Rapports" }}
            />
            <Tab.Screen
                name="Paramètres"
                component={SettingsScreen}
                options={{ title: t("settings") }}
            />
        </Tab.Navigator>
    );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
    const { isLoading, isAuthenticated, loadSession, user } = useAuthStore();
    const { loadLang, lang } = useLangStore();

    const [showUpdateModal, setShowUpdateModal] = React.useState(false);
    const [updateInfo, setUpdateInfo] = React.useState<any>(null);

    const checkUpdates = async () => {
        try {
            const API_BASE = "https://chirpedbeo.online/api/mobile";
            const response = await fetch(`${API_BASE}/version`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.version) {
                    const currentVersion = "1.2.1";
                    const remoteParts = data.version.split(".").map(Number);
                    const localParts = currentVersion.split(".").map(Number);
                    
                    let hasUpdate = false;
                    for (let i = 0; i < 3; i++) {
                        if ((remoteParts[i] || 0) > (localParts[i] || 0)) {
                            hasUpdate = true;
                            break;
                        } else if ((remoteParts[i] || 0) < (localParts[i] || 0)) {
                            break;
                        }
                    }

                    if (hasUpdate) {
                        setUpdateInfo(data);
                        setShowUpdateModal(true);
                    }
                }
            }
        } catch (err) {
            console.warn("Error checking for updates:", err);
        }
    };

    useEffect(() => {
        loadLang();
        loadSession();
        checkUpdates();
    }, []);

    // Start GPS tracking + offline sync when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            (async () => {
                const gpsEnabled = await AsyncStorage.getItem("setting_gpsTracking");
                if (gpsEnabled !== "false") {
                    startGPSTracking();
                }
                // Cache data for offline use
                fullSync().catch(() => {});
            })();

            return () => {
                stopGPSTracking();
            };
        }
    }, [isAuthenticated]);

    const handleUpdateNow = () => {
        if (updateInfo?.apkUrl) {
            Linking.openURL(updateInfo.apkUrl);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.splashContainer}>
                <View style={styles.logoBadge}>
                    <Ionicons name="car" size={48} color="#fff" />
                </View>
                <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 24 }} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={AppTheme}>
            <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen
                            name="Main"
                            component={GerantTabs}
                        />
                        <Stack.Screen
                            name="SalesAnalytics"
                            component={SalesAnalyticsScreen}
                            options={{
                                headerShown: true,
                                title: "Ventes & Revenus",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="ProfitReport"
                            component={ProfitReportScreen}
                            options={{
                                headerShown: true,
                                title: "Marges & Rentabilité",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="ClientDebts"
                            component={ClientDebtsScreen}
                            options={{
                                headerShown: true,
                                title: "Créances Clients",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="DailyClose"
                            component={DailyCloseScreen}
                            options={{
                                  headerShown: true,
                                  title: "Clôture de Caisse",
                                  headerStyle: { backgroundColor: "#0f172a" },
                                  headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="SupplierLedger"
                            component={SupplierLedgerScreen}
                            options={{
                                headerShown: true,
                                title: "Grand Livre Fournisseurs",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="CashFlow"
                            component={CashFlowScreen}
                            options={{
                                headerShown: true,
                                title: "Flux de Trésorerie",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="DriverMonitor"
                            component={DriverMonitorScreen}
                            options={{
                                headerShown: true,
                                title: "Performance Livreurs",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="InventoryHealth"
                            component={InventoryHealthScreen}
                            options={{
                                headerShown: true,
                                title: "Santé du Stock",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="G50Tax"
                            component={G50TaxScreen}
                            options={{
                                headerShown: true,
                                title: "Déclaration G50 TVA",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="ChequeManager"
                            component={ChequeManagerScreen}
                            options={{
                                headerShown: true,
                                title: "Gestion des Chèques",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="Catalog"
                            component={CatalogScreen}
                            options={{
                                headerShown: true,
                                title: "Catalogue & Tarifs",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="CreateBL"
                            component={CreateBLScreen}
                            options={{
                                headerShown: false,
                            }}
                        />
                    </>
                )}
            </Stack.Navigator>
            {/* Trilingual Direct APK Update Overlay */}
            <Modal
                visible={showUpdateModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {}}
            >
                <View style={styles.updateModalOverlay}>
                    <View style={styles.updateModalContent}>
                        <View style={styles.updateIconContainer}>
                            <Ionicons name="cloud-download" size={40} color="#fff" />
                        </View>
                        <Text style={styles.updateModalTitle}>Mise à jour disponible !</Text>
                        <Text style={styles.updateModalTitleAr}>تحديث جديد متوفر !</Text>
                        
                        <Text style={styles.updateVersionText}>
                             v1.1.2 ➔ v{updateInfo?.version || "1.1.2"}
                         </Text>

                        <View style={styles.releaseNotesBox}>
                            <Text style={styles.releaseNotesHeader}>Nouveautés / الجديد :</Text>
                            <Text style={styles.releaseNotesText}>
                                {lang === "ar" ? updateInfo?.releaseNotes?.ar : updateInfo?.releaseNotes?.fr}
                            </Text>
                        </View>

                         <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                             <TouchableOpacity 
                                 style={[styles.updateActionBtn, { flex: 2 }]}
                                 onPress={handleUpdateNow}
                                 activeOpacity={0.8}
                             >
                                 <Ionicons name="download-outline" size={18} color="#fff" />
                                 <Text style={[styles.updateActionText, { fontSize: 12 }]}>{lang === "ar" ? "تحديث الآن" : "Mettre à jour"}</Text>
                             </TouchableOpacity>

                             <TouchableOpacity 
                                 style={[styles.updateActionBtn, { flex: 1, backgroundColor: "#475569" }]}
                                 onPress={() => setShowUpdateModal(false)}
                                 activeOpacity={0.8}
                             >
                                 <Text style={[styles.updateActionText, { fontSize: 12 }]}>{lang === "ar" ? "لاحقاً" : "Plus tard"}</Text>
                             </TouchableOpacity>
                         </View>
                    </View>
                </View>
            </Modal>
        </NavigationContainer>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
    },
    loginContainer: {
        flex: 1,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loginCard: {
        width: "100%",
        maxWidth: 400,
        padding: 32,
        backgroundColor: "#1e293b",
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    logoBadge: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: "#22c55e",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    logoTitle: {
        fontSize: 28,
        fontWeight: "900",
        color: "#f8fafc",
        letterSpacing: -0.5,
    },
    logoSubtitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#22c55e",
        letterSpacing: 6,
        marginTop: 2,
    },
    formGroup: {
        gap: 14,
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0f172a",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#334155",
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 52,
        color: "#f8fafc",
        fontSize: 16,
    },
    loginBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 52,
        backgroundColor: "#22c55e",
        borderRadius: 14,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    loginBtnDisabled: {
        opacity: 0.7,
    },
    loginBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    versionText: {
        textAlign: "center",
        color: "#475569",
        fontSize: 12,
        marginTop: 20,
    },
    // Update Modal Styles
    updateModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    updateModalContent: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "#334155",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    updateIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: "#22c55e",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    updateModalTitle: {
        color: "#f8fafc",
        fontSize: 17,
        fontWeight: "900",
        textAlign: "center",
    },
    updateModalTitleAr: {
        color: "#f8fafc",
        fontSize: 17,
        fontWeight: "900",
        textAlign: "center",
        marginTop: 4,
    },
    updateVersionText: {
        color: "#22c55e",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 8,
        backgroundColor: "#22c55e10",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    releaseNotesBox: {
        width: "100%",
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#334155",
        borderRadius: 14,
        padding: 14,
        marginVertical: 18,
    },
    releaseNotesHeader: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "800",
        marginBottom: 6,
    },
    releaseNotesText: {
        color: "#e2e8f0",
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "500",
    },
    updateActionBtn: {
        flexDirection: "row",
        width: "100%",
        height: 48,
        backgroundColor: "#22c55e",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    updateActionText: {
        color: "#fff",
        fontSize: 13.5,
        fontWeight: "800",
    },
});
