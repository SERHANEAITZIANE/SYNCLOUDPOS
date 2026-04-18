import { create } from "zustand";
import { login as apiLogin, clearTokens, getCachedUser, loadTokens } from "./api";

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
