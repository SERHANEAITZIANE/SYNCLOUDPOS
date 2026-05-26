import React, { useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, StyleSheet, Image, KeyboardAvoidingView,
    Platform, Alert, StatusBar, Dimensions,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "./lib/store";
import { useLangStore } from "./lib/i18n";

// ─── Screens ────────────────────────────────────────────────────────────────
import TourneeScreen from "./screens/TourneeScreen";
import ClientsScreen from "./screens/ClientsScreen";
import ClientDetailScreen from "./screens/ClientDetailScreen";
import CreateBLScreen from "./screens/CreateBLScreen";
import PaymentScreen from "./screens/PaymentScreen";
import ReturnScreen from "./screens/ReturnScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TruckLoadScreen from "./screens/TruckLoadScreen";

// ─── Services ───────────────────────────────────────────────────────────────
import { startGPSTracking, stopGPSTracking } from "./lib/gps-tracking";
import { fullSync } from "./lib/offline-sync";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Theme ──────────────────────────────────────────────────────────────────
const AppTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: "#2563eb",
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
                    <Text style={styles.logoSubtitle}>TOURNÉE</Text>
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

                <Text style={styles.versionText}>v1.0.0 — SynCloudPOS</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Tab Navigator (Main App) ────────────────────────────────────────────────
function MainTabs() {
    const { t } = useLangStore();
    return (
        <Tab.Navigator
            id="MainTabs"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === "Tournée") iconName = focused ? "map" : "map-outline";
                    else if (route.name === "Clients") iconName = focused ? "people" : "people-outline";
                    else if (route.name === "Dashboard") iconName = focused ? "stats-chart" : "stats-chart-outline";
                    else if (route.name === "Paramètres") iconName = focused ? "settings" : "settings-outline";
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: "#3b82f6",
                tabBarInactiveTintColor: "#64748b",
                tabBarStyle: {
                    backgroundColor: "#1e293b",
                    borderTopColor: "#334155",
                    paddingBottom: Platform.OS === "ios" ? 20 : 8,
                    paddingTop: 8,
                    height: Platform.OS === "ios" ? 88 : 64,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
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
                name="Tournée"
                component={TourneeScreen}
                options={{ title: t("myTour") }}
            />
            <Tab.Screen
                name="Clients"
                component={ClientsScreen}
                options={{ title: t("clients") }}
            />
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: t("today") }}
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
    const { loadLang } = useLangStore();

    useEffect(() => {
        loadLang();
        loadSession();
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

    if (isLoading) {
        return (
            <View style={styles.splashContainer}>
                <View style={styles.logoBadge}>
                    <Ionicons name="car" size={48} color="#fff" />
                </View>
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 24 }} />
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
                            component={MainTabs}
                        />
                        <Stack.Screen
                            name="ClientDetail"
                            component={ClientDetailScreen}
                            options={{
                                headerShown: true,
                                title: "Fiche Client",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="CreateBL"
                            component={CreateBLScreen}
                            options={{
                                headerShown: true,
                                title: "Nouveau BL",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="Payment"
                            component={PaymentScreen}
                            options={{
                                headerShown: true,
                                title: "Encaissement",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="Return"
                            component={ReturnScreen}
                            options={{
                                headerShown: true,
                                title: "Retour Produit",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                        <Stack.Screen
                            name="TruckLoad"
                            component={TruckLoadScreen}
                            options={{
                                headerShown: true,
                                title: "Chargement Camion",
                                headerStyle: { backgroundColor: "#0f172a" },
                                headerTintColor: "#f8fafc",
                            }}
                        />
                    </>
                )}
            </Stack.Navigator>
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
        backgroundColor: "#2563eb",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#2563eb",
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
        color: "#3b82f6",
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
        backgroundColor: "#2563eb",
        borderRadius: 14,
        shadowColor: "#2563eb",
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
});
