import { create } from "zustand";
import { login as apiLogin, clearTokens, getCachedUser, loadTokens, apiFetch, saveTokens } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string;
    tenantId: string;
    tenant: {
        name: string;
        logo?: string;
        phone?: string;
        address?: string;
    };
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, deviceName?: string) => Promise<void>;
    logout: () => Promise<void>;
    loadSession: () => Promise<void>;
    switchTenant: (tenantId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (email, password, deviceName) => {
        const data = await apiLogin(email, password, deviceName);
        set({ user: data.user, isAuthenticated: true });
    },

    logout: async () => {
        await clearTokens();
        set({ user: null, isAuthenticated: false });
    },

    switchTenant: async (tenantId: string) => {
        const data = await apiFetch("/auth/switch", {
            method: "POST",
            body: JSON.stringify({ tenantId }),
        });
        await saveTokens(data.accessToken, data.refreshToken);
        await AsyncStorage.setItem("user_data", JSON.stringify(data.user));
        set({ user: data.user });
    },

    loadSession: async () => {
        try {
            const tokens = await loadTokens();
            if (tokens.accessToken) {
                const user = await getCachedUser();
                if (user) {
                    set({ user, isAuthenticated: true, isLoading: false });
                    return;
                }
            }
        } catch { /* ignore */ }
        set({ isLoading: false });
    },
}));
