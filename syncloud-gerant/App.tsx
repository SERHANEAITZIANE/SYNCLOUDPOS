import React, { Component, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, StyleSheet, KeyboardAvoidingView,
    Platform, Alert, StatusBar, Dimensions, Modal, Linking,
    useWindowDimensions,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "./lib/store";
import { useLangStore } from "./lib/i18n";
import { useNotificationStore } from "./lib/notificationStore";

const CURRENT_VERSION = "3.0.0";

// ─── Global Error Logger ───────────────────────────────────────────────────
if (typeof global !== "undefined" && (global as any).ErrorUtils) {
    const defaultHandler = (global as any).ErrorUtils.getGlobalHandler();
    (global as any).ErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
        try {
            await fetch("https://chirpedbeo.online/api/mobile/log-error", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: {
                        message: error?.message || "Unknown error",
                        stack: error?.stack || "No stack",
                    },
                    isFatal: isFatal ?? true,
                    app: "gerant",
                    version: CURRENT_VERSION,
                }),
            });
        } catch (e) {
            console.warn("[GlobalError] Failed to report crash to server:", e);
        }
        if (defaultHandler) {
            defaultHandler(error, isFatal);
        }
    });
}

// ─── Error Boundary ─────────────────────────────────────────────────────────
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary] Crash caught:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: "#0a0f1e", justifyContent: "center", alignItems: "center", padding: 32 }}>
                    <Ionicons name="warning" size={64} color="#ef4444" />
                    <Text style={{ color: "#f8fafc", fontSize: 20, fontWeight: "800", marginTop: 16, textAlign: "center" }}>
                        Erreur Application (Gérant)
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                        {this.state.error?.message || "Une erreur inattendue est survenue"}
                    </Text>
                    <TouchableOpacity
                        style={{ marginTop: 24, backgroundColor: "#22c55e", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 }}
                        onPress={() => this.setState({ hasError: false, error: null })}
                    >
                        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Réessayer</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}


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
import ComparativeReportScreen from "./screens/ComparativeReportScreen";
import ProductDashboardScreen from "./screens/ProductDashboardScreen";
import ClientAnalyticsScreen from "./screens/ClientAnalyticsScreen";
import NotificationCenterScreen from "./screens/NotificationCenterScreen";
import GoalsScreen from "./screens/GoalsScreen";
import ActivityHistoryScreen from "./screens/ActivityHistoryScreen";
import WeeklySummaryScreen from "./screens/WeeklySummaryScreen";

// ─── Services ───────────────────────────────────────────────────────────────
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

// ─── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen() {
    const [email, setEmail] = React.useState("xm@live.fr");
    const [password, setPassword] = React.useState("Babez@16");
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
    const unreadCount = useNotificationStore((s) => s.unreadCount);
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
                    backgroundColor: "rgba(10, 15, 30, 0.95)",
                    borderTopWidth: 1,
                    borderTopColor: "rgba(148, 163, 184, 0.08)",
                    paddingBottom: Platform.OS === "ios" ? 24 : 10,
                    paddingTop: 8,
                    height: Platform.OS === "ios" ? 88 : 68,
                    elevation: 0,
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
                options={{ 
                    title: "Accueil", 
                    headerShown: false,
                    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                    tabBarBadgeStyle: { backgroundColor: "#ef4444", color: "#fff", fontSize: 10, height: 16, minWidth: 16, borderRadius: 8, lineHeight: 14 }
                }}
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

function AppNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
    return (
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
                    <Stack.Screen name="Alerts" component={NotificationCenterScreen} options={{ headerShown: true, title: "Centre de Notifications", ...stackScreenStyle }} />
                    <Stack.Screen name="GerantPurchases" component={GerantPurchasesScreen} options={{ headerShown: true, title: "Achats Fournisseurs", ...stackScreenStyle }} />
                    <Stack.Screen name="GerantExpenses" component={GerantExpensesScreen} options={{ headerShown: true, title: "Dépenses", ...stackScreenStyle }} />
                    <Stack.Screen name="ComparativeReport" component={ComparativeReportScreen} options={{ headerShown: true, title: "Comparatif Périodes", ...stackScreenStyle }} />
                    <Stack.Screen name="ProductDashboard" component={ProductDashboardScreen} options={{ headerShown: true, title: "Tableau Produits", ...stackScreenStyle }} />
                    <Stack.Screen name="ClientAnalytics" component={ClientAnalyticsScreen} options={{ headerShown: true, title: "Analyse Clients", ...stackScreenStyle }} />
                    <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ headerShown: true, title: "Centre de Notifications", ...stackScreenStyle }} />
                    <Stack.Screen name="Goals" component={GoalsScreen} options={{ headerShown: true, title: "Objectifs & KPIs", ...stackScreenStyle }} />
                    <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} options={{ headerShown: true, title: "Historique d'Activité", ...stackScreenStyle }} />
                    <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} options={{ headerShown: true, title: "Résumé Hebdomadaire", ...stackScreenStyle }} />
                </>
            )}
        </Stack.Navigator>
    );
}

// ─── Root App ────────────────────────────────────────────────────────────────
function MainApp() {
    const { width, height } = useWindowDimensions();
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
        loadSession().then(() => {
            if (useAuthStore.getState().isAuthenticated) {
                useNotificationStore.getState().fetchUnreadCount().catch(() => {});
            }
        });
        checkUpdates();
    }, []);

    // Start offline sync when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            (async () => {
                // Cache data for offline use
                fullSync().catch(() => {});
                // Fetch initial notifications
                useNotificationStore.getState().fetchUnreadCount().catch(() => {});
            })();
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

    const isWeb = Platform.OS === "web";
    const isDesktop = isWeb && width >= 768;

    const handleDownloadApk = () => {
        const url = updateInfo?.apkUrl || "https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.0.apk";
        Linking.openURL(url);
    };

    const navigatorContent = (
        <>
            <AppNavigator isAuthenticated={isAuthenticated} />
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
                                 onPress={handleDownloadApk}
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
        </>
    );

    if (isDesktop) {
        return (
            <NavigationContainer theme={AppTheme}>
                <ErrorBoundary>
                    <View style={styles.desktopContainer}>
                        {/* Glowing Balls for High Aesthetics */}
                        <View style={[styles.glowBall, { top: -150, left: -150, backgroundColor: "#22c55e10" }]} />
                        <View style={[styles.glowBall, { bottom: -250, right: -150, backgroundColor: "#3b82f610" }]} />

                        {/* Left Brand Panel */}
                        <View style={styles.desktopLeftPanel}>
                            <View style={styles.desktopBrandRow}>
                                <LinearGradient colors={["#22c55e", "#10b981"]} style={styles.desktopLogoBadge}>
                                    <Ionicons name="analytics" size={32} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.desktopTitle}>SynCloud</Text>
                                    <Text style={styles.desktopSubtitle}>GÉRANT</Text>
                                </View>
                            </View>

                            <View style={styles.desktopCard}>
                                <Text style={styles.desktopCardTitle}>Console de Gestion Web</Text>
                                <Text style={styles.desktopCardText}>
                                    Accédez à l'intégralité du tableau de bord de votre commerce, suivez vos créances clients, validez vos clôtures de caisse et briefez l'IA depuis votre ordinateur.
                                </Text>
                            </View>

                            <View style={styles.desktopCard}>
                                <Text style={styles.desktopCardTitle}>Mesures Système en Direct</Text>
                                
                                <View style={styles.metricsRow}>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricVal}>99.9%</Text>
                                        <Text style={styles.metricLbl}>Uptime VPS</Text>
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricVal}>14 ms</Text>
                                        <Text style={styles.metricLbl}>Latence API</Text>
                                    </View>
                                    <View style={styles.metricItem}>
                                        <Text style={styles.metricVal}>v{CURRENT_VERSION}</Text>
                                        <Text style={styles.metricLbl}>Version Actuelle</Text>
                                    </View>
                                </View>

                                {/* Modern progress / bar graphic */}
                                <View style={styles.sysUsageBar}>
                                    <Text style={styles.sysUsageText}>Charge CPU Serveur</Text>
                                    <View style={styles.sysBarTrack}>
                                        <View style={[styles.sysBarFill, { width: "12%" }]} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.desktopCard}>
                                <Text style={styles.desktopCardTitle}>Téléchargement Mobile</Text>
                                <Text style={styles.desktopVersionBadge}>Version {CURRENT_VERSION} stable</Text>
                                <Text style={styles.desktopCardText}>
                                    Pour les livraisons et les ventes physiques sur le terrain, utilisez notre application Android native.
                                </Text>
                                <TouchableOpacity
                                    style={styles.desktopDownloadBtn}
                                    onPress={handleDownloadApk}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="logo-android" size={18} color="#fff" />
                                    <Text style={styles.downloadBtnText}>Télécharger l'APK Gérant</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.desktopCard}>
                                <Text style={styles.desktopCardTitle}>Statut Système</Text>
                                <View style={styles.statusRow}>
                                    <View style={styles.statusIndicator} />
                                    <Text style={styles.statusText}>
                                        Serveur Actif | chirpedbeo.online
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Right Mockup Phone Panel */}
                        <View style={styles.mockupContainer}>
                            <View style={phoneMockupStyle}>
                                {/* Physical side buttons on phone */}
                                <View style={[styles.phoneButton, { left: -6, top: 120, height: 50 }]} />
                                <View style={[styles.phoneButton, { left: -6, top: 180, height: 40 }]} />
                                <View style={[styles.phoneButton, { left: -6, top: 230, height: 40 }]} />
                                <View style={[styles.phoneButton, { right: -6, top: 160, height: 60 }]} />

                                <View style={styles.phoneSpeaker} />
                                <View style={styles.phoneCamera} />
                                
                                <View style={styles.phoneInner}>
                                    {/* Mock Status Bar */}
                                    <View style={styles.mockStatusBar}>
                                        <Text style={styles.mockStatusTime}>09:41</Text>
                                        <View style={styles.mockStatusIcons}>
                                            <Ionicons name="wifi" size={12} color="#f8fafc" style={{ opacity: 0.9 }} />
                                            <Ionicons name="cellular" size={12} color="#f8fafc" style={{ opacity: 0.9 }} />
                                            <Ionicons name="battery-full" size={16} color="#22c55e" />
                                        </View>
                                    </View>

                                    {navigatorContent}

                                    {/* Screen Glare reflection overlay */}
                                    <View style={styles.phoneGlare} pointerEvents="none" />
                                </View>
                            </View>
                        </View>
                    </View>
                </ErrorBoundary>
            </NavigationContainer>
        );
    }

    return (
        <NavigationContainer theme={AppTheme}>
            <ErrorBoundary>
                {navigatorContent}
            </ErrorBoundary>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <MainApp />
        </ErrorBoundary>
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
    // Desktop Responsive Mockup Styles
    desktopContainer: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#030712",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        ...Platform.select({
            web: {
                backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)",
                backgroundSize: "32px 32px",
            } as any
        })
    },
    glowBall: {
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: 300,
        opacity: 0.12,
        ...Platform.select({
            web: {
                filter: "blur(130px)",
                pointerEvents: "none",
            } as any
        })
    },
    desktopLeftPanel: {
        flex: 1,
        padding: 50,
        justifyContent: "center",
        maxWidth: 550,
        zIndex: 10,
    },
    desktopBrandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 30,
    },
    desktopLogoBadge: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    desktopTitle: {
        fontSize: 32,
        fontWeight: "900",
        color: "#f8fafc",
        letterSpacing: -1,
    },
    desktopSubtitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#22c55e",
        letterSpacing: 4,
        marginTop: 1,
    },
    desktopCard: {
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.08)",
        borderRadius: 20,
        padding: 22,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        ...Platform.select({
            web: {
                backdropFilter: "blur(24px)",
            } as any
        })
    },
    desktopCardTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#f8fafc",
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    desktopCardText: {
        fontSize: 12.5,
        color: "#94a3b8",
        lineHeight: 19,
        fontWeight: "500",
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
        marginBottom: 16,
        gap: 12,
    },
    metricItem: {
        flex: 1,
        backgroundColor: "rgba(10, 15, 30, 0.45)",
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.05)",
    },
    metricVal: {
        color: "#22c55e",
        fontSize: 14,
        fontWeight: "900",
    },
    metricLbl: {
        color: "#64748b",
        fontSize: 9,
        fontWeight: "700",
        marginTop: 2,
    },
    sysUsageBar: {
        marginTop: 4,
    },
    sysUsageText: {
        color: "#94a3b8",
        fontSize: 10,
        fontWeight: "700",
        marginBottom: 6,
    },
    sysBarTrack: {
        height: 4,
        backgroundColor: "#1e293b",
        borderRadius: 2,
        overflow: "hidden",
    },
    sysBarFill: {
        height: "100%",
        backgroundColor: "#22c55e",
        borderRadius: 2,
    },
    desktopVersionBadge: {
        alignSelf: "flex-start",
        backgroundColor: "#22c55e15",
        color: "#22c55e",
        fontSize: 10,
        fontWeight: "700",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 12,
        textTransform: "uppercase",
    },
    desktopDownloadBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: 48,
        backgroundColor: "#22c55e",
        borderRadius: 14,
        marginTop: 16,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    downloadBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#22c55e",
    },
    statusText: {
        color: "#e2e8f0",
        fontSize: 13,
        fontWeight: "600",
    },
    mockupContainer: {
        flex: 1.2,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(10, 15, 30, 0.3)",
        borderLeftWidth: 1,
        borderLeftColor: "rgba(148, 163, 184, 0.05)",
        padding: 40,
        zIndex: 10,
    },
    phoneMockup: {
        width: 420,
        height: 860,
        borderRadius: 48,
        backgroundColor: "#000",
        padding: 12,
        borderWidth: 4,
        borderColor: "#334155",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        position: "relative",
    },
    phoneButton: {
        position: "absolute",
        width: 4,
        backgroundColor: "#334155",
        borderRadius: 2,
        zIndex: 50,
    },
    phoneSpeaker: {
        position: "absolute",
        top: 24,
        left: "50%",
        transform: [{ translateX: -40 }],
        width: 80,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#1e293b",
        zIndex: 100,
    },
    phoneCamera: {
        position: "absolute",
        top: 20,
        left: "50%",
        transform: [{ translateX: 50 }],
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#1e293b",
        zIndex: 100,
    },
    phoneInner: {
        flex: 1,
        borderRadius: 38,
        overflow: "hidden",
        backgroundColor: "#0a0f1e",
        position: "relative",
    },
    phoneGlare: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100%",
        ...Platform.select({
            web: {
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 40%)",
            } as any
        }),
        zIndex: 99,
        borderRadius: 38,
    },
    mockStatusBar: {
        height: 40,
        backgroundColor: "#0a0f1e",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 12,
        zIndex: 98,
    },
    mockStatusTime: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    mockStatusIcons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
});

// ─── Styles Helper ──────────────────────────────────────────────────────────
const phoneMockupStyle = styles.phoneMockup;

