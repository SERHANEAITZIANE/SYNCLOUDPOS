import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

interface NotificationState {
    unreadCount: number;
    setUnreadCount: (count: number) => void;
    fetchUnreadCount: () => Promise<number>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    
    setUnreadCount: (unreadCount) => set({ unreadCount }),
    
    fetchUnreadCount: async () => {
        try {
            // Fetch notifications
            const result = await apiFetch("/gerant/notifications");
            const notifications = result.notifications || [];
            
            // Fetch read IDs
            const stored = await AsyncStorage.getItem("read_notification_ids");
            const readIds: string[] = stored ? JSON.parse(stored) : [];
            
            // Calculate unread count
            const unread = notifications.filter((n: any) => !readIds.includes(n.id)).length;
            
            set({ unreadCount: unread });
            return unread;
        } catch (e) {
            console.warn("[NotificationStore] Error fetching unread count:", e);
            return 0;
        }
    }
}));
