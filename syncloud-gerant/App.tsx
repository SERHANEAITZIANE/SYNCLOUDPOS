import React, { useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, StyleSheet, KeyboardAvoidingView,
    Platform, Alert, StatusBar, Dimensions, Modal, Linking,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "./lib/store";
import { useLangStore } from "./lib/i18n";

// ─── Screens ────────────────────────────────────────────────────────────────
import GerantDashboardScreen from "./screens/GerantDashboardScreen";
import FinanceScreen from "./screens/FinanceScreen";
import AiAdvisorScreen from "./screens/AiAdvisorScreen";
import MoreScreen from "./screens/MoreScreen";
import SettingsScreen from "./screens/SettingsScreen";
import GerantPurchasesScreen from "./screens/GerantPurchasesScreen";
import GerantExpensesScreen from "./screens/GerantExpensesScreen";
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
import MorningBriefScreen from "./screens/MorningBriefScreen";

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
        background: "#0a0f1e",
        card: "#1e293b",
        text: "#f8fafc",
        border: "#1e293b",
        notification: "#ef4444",
    },
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CURRENT_VERSION = "2.2.1";

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
                    <LinearGradient
                        colors={["#22c55e", "#10b981"]}
                        style={styles.logoBadge}
                    >
                        <Ionicons name="analytics" size={36} color="#fff" />
                    </LinearGradient>
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

                <Text style={styles.versionText}>v{CURRENT_VERSION} — SynCloudPOS</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Tab Navigator (4 Tabs: Accueil, Finance, AI, Plus) ──────────────────────
function GerantTabs() {
    return (
        <Tab.Navigator
            id="GerantTabs"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === "Accueil") iconName = focused ? "home" : "home-outline";
                    else if (route.name === "Finance") iconName = focused ? "wallet" : "wallet-outline";
                    else if (route.name === "AI") iconName = focused ? "sparkles" : "sparkles-outline";
                    else if (route.name === "Plus") iconName = focused ? "grid" : "grid-outline";
                    return (
                        <View style={focused ? tabStyles.activeWrap : undefined}>
                            <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />
                            {focused && <View style={tabStyles.activeDot} />}
                        </View>
                    );
                },
                tabBarActiveTintColor: "#22c55e",
                tabBarInactiveTintColor: "#475569",
                tabBarStyle: {
                    backgroundColor: "#0f172a",
                    borderTopWidth: 0,
                    paddingBottom: Platform.OS === "ios" ? 24 : 10,
                    paddingTop: 8,
                    height: Platform.OS === "ios" ? 88 : 68,
                    elevation: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "700",
                    marginTop: 2,
                },
                headerStyle: {
                    backgroundColor: "#0a0f1e",
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTintColor: "#f8fafc",
                headerTitleStyle: {
                    fontWeight: "800",
                    fontSize: 18,
                },
            })}
        >
            <Tab.Screen
                name="Accueil"
                component={GerantDashboardScreen}
                options={{ title: "Accueil", headerShown: false }}
            />
            <Tab.Screen
                name="Finance"
                component={FinanceScreen}
                options={{ title: "Finance", headerShown: false }}
            />
            <Tab.Screen
                name="AI"
                component={AiAdvisorScreen}
                options={{ title: "IA", headerTitle: "Conseiller IA" }}
            />
            <Tab.Screen
                name="Plus"
                component={MoreScreen}
                options={{ title: "Plus", headerShown: false }}
            />
        </Tab.Navigator>
    );
}

// ─── Stack Screen Config Helper ─────────────────────────────────────────────
const stackScreenStyle = {
    headerStyle: { backgroundColor: "#0a0f1e" } as any,
    headerTintColor: "#f8fafc",
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 16 },
    headerShadowVisible: false,
};

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
                    const remoteParts = data.version.split(".").map(Number);
                    const localParts = CURRENT_VERSION.split(".").map(Number);

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
                <LinearGradient colors={["#22c55e", "#10b981"]} style={styles.logoBadge}>
                    <Ionicons name="analytics" size={48} color="#fff" />
                </LinearGradient>
                <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 24 }} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={AppTheme}>
            <Stack.Navigator
                id="RootStack"
                screenOptions={{
                    headerShown: false,
                    animation: "fade_from_bottom",
                }}
            >
                {!isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={GerantTabs} />
                        <Stack.Screen name="SalesAnalytics" component={SalesAnalyticsScreen} options={{ headerShown: true, title: "Ventes & Revenus", ...stackScreenStyle }} />
                        <Stack.Screen name="ProfitReport" component={ProfitReportScreen} options={{ headerShown: true, title: "Marges & Rentabilité", ...stackScreenStyle }} />
                        <Stack.Screen name="ClientDebts" component={ClientDebtsScreen} options={{ headerShown: true, title: "Créances Clients", ...stackScreenStyle }} />
                        <Stack.Screen name="DailyClose" component={DailyCloseScreen} options={{ headerShown: true, title: "Clôture de Caisse", ...stackScreenStyle }} />
                        <Stack.Screen name="SupplierLedger" component={SupplierLedgerScreen} options={{ headerShown: true, title: "Grand Livre Fournisseurs", ...stackScreenStyle }} />
                        <Stack.Screen name="CashFlow" component={CashFlowScreen} options={{ headerShown: true, title: "Flux de Trésorerie", ...stackScreenStyle }} />
                        <Stack.Screen name="DriverMonitor" component={DriverMonitorScreen} options={{ headerShown: true, title: "Performance Livreurs", ...stackScreenStyle }} />
                        <Stack.Screen name="InventoryHealth" component={InventoryHealthScreen} options={{ headerShown: true, title: "Santé du Stock", ...stackScreenStyle }} />
                        <Stack.Screen name="G50Tax" component={G50TaxScreen} options={{ headerShown: true, title: "Déclaration G50 TVA", ...stackScreenStyle }} />
                        <Stack.Screen name="ChequeManager" component={ChequeManagerScreen} options={{ headerShown: true, title: "Gestion des Chèques", ...stackScreenStyle }} />
                        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ headerShown: true, title: "Catalogue & Tarifs", ...stackScreenStyle }} />
                        <Stack.Screen name="CreateBL" component={CreateBLScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="MorningBrief" component={MorningBriefScreen} options={{ headerShown: true, title: "Briefing du Jour", ...stackScreenStyle }} />
                        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: "Paramètres", ...stackScreenStyle }} />
                        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ headerShown: true, title: "Alertes", ...stackScreenStyle }} />
                        <Stack.Screen name="GerantPurchases" component={GerantPurchasesScreen} options={{ headerShown: true, title: "Achats Fournisseurs", ...stackScreenStyle }} />
                        <Stack.Screen name="GerantExpenses" component={GerantExpensesScreen} options={{ headerShown: true, title: "Dépenses", ...stackScreenStyle }} />
                    </>
                )}
            </Stack.Navigator>
            {/* Update Overlay */}
            <Modal
                visible={showUpdateModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {}}
            >
                <View style={styles.updateModalOverlay}>
                    <View style={styles.updateModalContent}>
                        <LinearGradient
                            colors={["#22c55e", "#10b981"]}
                            style={styles.updateIconContainer}
                        >
                            <Ionicons name="cloud-download" size={32} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.updateModalTitle}>Mise à jour disponible !</Text>
                        <Text style={styles.updateModalTitleAr}>تحديث جديد متوفر !</Text>

                        <Text style={styles.updateVersionText}>
                             v{CURRENT_VERSION} ➔ v{updateInfo?.version || CURRENT_VERSION}
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

// ─── Tab-specific styles ─────────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
    activeWrap: {
        alignItems: "center",
    },
    activeDot: {
        width: 5, height: 5, borderRadius: 2.5,
        backgroundColor: "#22c55e", marginTop: 4,
    },
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: "#0a0f1e",
        justifyContent: "center",
        alignItems: "center",
    },
    loginContainer: {
        flex: 1,
        backgroundColor: "#0a0f1e",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loginCard: {
        width: "100%",
        maxWidth: 400,
        padding: 32,
        backgroundColor: "rgba(30,41,59,0.9)",
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 28,
        elevation: 15,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    logoBadge: {
        width: 76,
        height: 76,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 10,
    },
    logoTitle: {
        fontSize: 30,
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
        backgroundColor: "#0a0f1e",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.1)",
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
        color: "#334155",
        fontSize: 12,
        marginTop: 20,
    },
    // Update Modal Styles
    updateModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(10, 15, 30, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    updateModalContent: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "rgba(30,41,59,0.95)",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.1)",
        borderRadius: 28,
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 12,
    },
    updateIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
        backgroundColor: "#0a0f1e",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.08)",
        borderRadius: 16,
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
        borderRadius: 14,
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
