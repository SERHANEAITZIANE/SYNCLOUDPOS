/**
 * Offline Data Store — IndexedDB cache using idb-keyval
 * Caches POS data (products, categories, customers, accounts) for offline use.
 */
import { get, set, del, keys } from 'idb-keyval';

// Keys
const KEYS = {
  products: 'pos_products',
  categories: 'pos_categories',
  customers: 'pos_customers',
  accounts: 'pos_accounts',
  storeInfo: 'pos_store_info',
  lastSync: 'pos_last_sync',
} as const;

export interface OfflineStoreInfo {
  storeName: string;
  storeAddress: string;
  storePhone: string;
}

/**
 * Cache all POS data to IndexedDB for offline access
 */
export async function cachePosData(data: {
  products: any[];
  categories: any[];
  customers: any[];
  accounts: any[];
  storeInfo: OfflineStoreInfo;
}) {
  try {
    await Promise.all([
      set(KEYS.products, data.products),
      set(KEYS.categories, data.categories),
      set(KEYS.customers, data.customers),
      set(KEYS.accounts, data.accounts),
      set(KEYS.storeInfo, data.storeInfo),
      set(KEYS.lastSync, Date.now()),
    ]);
    console.log('[OfflineStore] POS data cached successfully');
  } catch (err) {
    console.error('[OfflineStore] Failed to cache POS data:', err);
  }
}

/**
 * Get all cached POS data from IndexedDB
 */
export async function getCachedPosData() {
  try {
    const [products, categories, customers, accounts, storeInfo, lastSync] = await Promise.all([
      get<any[]>(KEYS.products),
      get<any[]>(KEYS.categories),
      get<any[]>(KEYS.customers),
      get<any[]>(KEYS.accounts),
      get<OfflineStoreInfo>(KEYS.storeInfo),
      get<number>(KEYS.lastSync),
    ]);

    if (!products || !categories) return null;

    return {
      products: products || [],
      categories: categories || [],
      customers: customers || [],
      accounts: accounts || [],
      storeInfo: storeInfo || { storeName: 'SYNCLOUDPOS', storeAddress: '', storePhone: '' },
      lastSync: lastSync || 0,
    };
  } catch (err) {
    console.error('[OfflineStore] Failed to get cached POS data:', err);
    return null;
  }
}

/**
 * Check if we have cached POS data
 */
export async function hasCachedData(): Promise<boolean> {
  try {
    const products = await get<any[]>(KEYS.products);
    return !!products && products.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTime(): Promise<number> {
  try {
    return (await get<number>(KEYS.lastSync)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache() {
  try {
    await Promise.all(Object.values(KEYS).map((key) => del(key)));
    console.log('[OfflineStore] Cache cleared');
  } catch (err) {
    console.error('[OfflineStore] Failed to clear cache:', err);
  }
}
