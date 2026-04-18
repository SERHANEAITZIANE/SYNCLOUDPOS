import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";
import NetInfo from "@react-native-community/netinfo";

// Keys for offline storage
const KEYS = {
    CLIENTS: "offline_clients",
    PRODUCTS: "offline_products",
    PENDING_OPS: "offline_pending_ops",
    LAST_SYNC: "offline_last_sync",
};

interface PendingOperation {
    id: string;
    type: "CREATE_BL" | "PAYMENT" | "RETURN" | "UPDATE_STOP" | "LOCATION";
    endpoint: string;
    method: string;
    body: any;
    createdAt: string;
    retries: number;
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
    try {
        const state = await NetInfo.fetch();
        return state.isConnected === true;
    } catch {
        return false;
    }
}

/**
 * Cache clients for offline use
 */
export async function cacheClients(): Promise<void> {
    try {
        const data = await apiFetch("/clients?limit=500");
        await AsyncStorage.setItem(KEYS.CLIENTS, JSON.stringify(data.clients));
    } catch (e) {
        console.warn("[OFFLINE] Failed to cache clients:", e);
    }
}

/**
 * Cache products for offline use
 */
export async function cacheProducts(): Promise<void> {
    try {
        const data = await apiFetch("/products?limit=500");
        await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data.products));
    } catch (e) {
        console.warn("[OFFLINE] Failed to cache products:", e);
    }
}

/**
 * Get cached clients (for offline use)
 */
export async function getCachedClients(): Promise<any[]> {
    const stored = await AsyncStorage.getItem(KEYS.CLIENTS);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Get cached products (for offline use)
 */
export async function getCachedProducts(): Promise<any[]> {
    const stored = await AsyncStorage.getItem(KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Search cached products offline
 */
export async function searchCachedProducts(query: string): Promise<any[]> {
    const products = await getCachedProducts();
    const q = query.toLowerCase();
    return products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.barcodes?.some((b: any) => b.code === query)
    );
}

/**
 * Add an operation to the pending queue
 */
export async function queueOperation(op: Omit<PendingOperation, "id" | "createdAt" | "retries">): Promise<void> {
    const queue = await getPendingOperations();
    queue.push({
        ...op,
        id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        retries: 0,
    });
    await AsyncStorage.setItem(KEYS.PENDING_OPS, JSON.stringify(queue));
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
    const stored = await AsyncStorage.getItem(KEYS.PENDING_OPS);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Sync all pending operations to server
 * Returns: { synced: number, failed: number }
 */
export async function syncPendingOperations(): Promise<{ synced: number; failed: number }> {
    const online = await isOnline();
    if (!online) return { synced: 0, failed: 0 };

    const queue = await getPendingOperations();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: PendingOperation[] = [];

    for (const op of queue) {
        try {
            await apiFetch(op.endpoint, {
                method: op.method,
                body: JSON.stringify(op.body),
            });
            synced++;
        } catch (error) {
            op.retries++;
            if (op.retries < 5) {
                remaining.push(op);
            } else {
                failed++; // Drop after 5 retries
            }
        }
    }

    await AsyncStorage.setItem(KEYS.PENDING_OPS, JSON.stringify(remaining));
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());

    return { synced, failed };
}

/**
 * Full sync: cache data + push pending operations
 */
export async function fullSync(): Promise<{ synced: number; failed: number; cached: boolean }> {
    const online = await isOnline();
    if (!online) return { synced: 0, failed: 0, cached: false };

    // Push pending operations first
    const { synced, failed } = await syncPendingOperations();

    // Then cache fresh data
    try {
        await Promise.all([cacheClients(), cacheProducts()]);
    } catch { /* silent */ }

    return { synced, failed, cached: true };
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_SYNC);
}

/**
 * Get pending operations count
 */
export async function getPendingCount(): Promise<number> {
    const queue = await getPendingOperations();
    return queue.length;
}
