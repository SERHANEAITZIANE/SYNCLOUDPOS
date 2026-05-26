import AsyncStorage from "@react-native-async-storage/async-storage";

// Change this to your SynCloudPOS server URL
const API_BASE = __DEV__
    ? "http://192.168.0.132:3000/api/mobile"
    : "https://chirpedbeo.online/api/mobile";

interface TokenStore {
    accessToken: string | null;
    refreshToken: string | null;
}

let tokens: TokenStore = { accessToken: null, refreshToken: null };

// Load tokens from storage
export async function loadTokens() {
    const stored = await AsyncStorage.getItem("auth_tokens");
    if (stored) {
        tokens = JSON.parse(stored);
    }
    return tokens;
}

// Save tokens to storage
export async function saveTokens(accessToken: string, refreshToken: string) {
    tokens = { accessToken, refreshToken };
    await AsyncStorage.setItem("auth_tokens", JSON.stringify(tokens));
}

// Clear tokens (logout)
export async function clearTokens() {
    tokens = { accessToken: null, refreshToken: null };
    await AsyncStorage.removeItem("auth_tokens");
    await AsyncStorage.removeItem("user_data");
}

// Refresh the access token
async function refreshAccessToken(): Promise<boolean> {
    if (!tokens.refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });

        if (!res.ok) {
            await clearTokens();
            return false;
        }

        const data = await res.json();
        await saveTokens(data.accessToken, data.refreshToken);
        return true;
    } catch {
        return false;
    }
}

// Main API fetch with auto-refresh
export async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const makeRequest = async () => {
        const headers: any = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        if (tokens.accessToken) {
            headers["Authorization"] = `Bearer ${tokens.accessToken}`;
        }

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });

        return res;
    };

    let res = await makeRequest();

    // If unauthorized, try to refresh token
    if (res.status === 401 && tokens.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            res = await makeRequest();
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Erreur réseau" }));
        throw new Error(error.error || `Erreur ${res.status}`);
    }

    return res.json();
}

// Login
export async function login(email: string, password: string, deviceName?: string) {
    const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceName }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Erreur réseau" }));
        throw new Error(error.error || "Erreur de connexion");
    }

    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    await AsyncStorage.setItem("user_data", JSON.stringify(data.user));
    return data;
}

// Get cached user data
export async function getCachedUser() {
    const stored = await AsyncStorage.getItem("user_data");
    return stored ? JSON.parse(stored) : null;
}

export { API_BASE };
