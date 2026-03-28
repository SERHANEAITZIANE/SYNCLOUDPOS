/**
 * Offline Sales Queue — IndexedDB queue for pending offline orders
 * Stores orders locally when network is unavailable and syncs them when back online.
 */
import { get, set } from 'idb-keyval';

const QUEUE_KEY = 'pos_offline_queue';
const COUNTER_KEY = 'pos_offline_counter';

export interface OfflineOrder {
  id: string;
  timestamp: number;
  receiptNumber: string;
  orderData: {
    storeId: string;
    items: {
      productId: string;
      quantity: number;
      price: number;
      tvaRate?: number;
      priceHt?: number;
    }[];
    total: number;
    subtotal: number;
    tvaAmount: number;
    stampTax: number;
    paymentMethod: string;
    paidAmount: number;
    customerId: string | null;
    accountId?: string;
    status: string;
    originalOrderId?: string | null;
    discountAmount: number;
    loyaltyPointsUsed: number;
  };
  synced: boolean;
}

/**
 * Generate a unique offline receipt number
 */
async function generateOfflineReceipt(): Promise<string> {
  const counter = ((await get<number>(COUNTER_KEY)) || 0) + 1;
  await set(COUNTER_KEY, counter);
  return `OFFLINE-${String(counter).padStart(4, '0')}`;
}

/**
 * Enqueue an order for later sync
 */
export async function enqueueOrder(orderData: OfflineOrder['orderData']): Promise<OfflineOrder> {
  const queue = (await get<OfflineOrder[]>(QUEUE_KEY)) || [];
  const receiptNumber = await generateOfflineReceipt();

  const order: OfflineOrder = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    receiptNumber,
    orderData,
    synced: false,
  };

  queue.push(order);
  await set(QUEUE_KEY, queue);

  console.log(`[OfflineQueue] Order ${receiptNumber} queued for sync`);
  return order;
}

/**
 * Get all pending (unsynced) orders
 */
export async function getPendingOrders(): Promise<OfflineOrder[]> {
  const queue = (await get<OfflineOrder[]>(QUEUE_KEY)) || [];
  return queue.filter((o) => !o.synced);
}

/**
 * Mark an order as synced (remove it from the queue)
 */
export async function markSynced(orderId: string): Promise<void> {
  const queue = (await get<OfflineOrder[]>(QUEUE_KEY)) || [];
  const updated = queue.filter((o) => o.id !== orderId);
  await set(QUEUE_KEY, updated);
}

/**
 * Get the count of pending orders
 */
export async function getPendingCount(): Promise<number> {
  const queue = (await get<OfflineOrder[]>(QUEUE_KEY)) || [];
  return queue.filter((o) => !o.synced).length;
}

/**
 * Clear all orders from the queue (both synced and unsynced)
 */
export async function clearQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}
