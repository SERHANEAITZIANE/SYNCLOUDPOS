import { createHmac } from "crypto"
import { db } from "@/lib/db"

/**
 * Webhook Dispatcher — Sends event notifications to external systems.
 * 
 * Tenants configure webhook URLs and subscribe to events like:
 * - order.created, order.updated
 * - product.created, product.updated, product.deleted
 * - stock.low, stock.movement
 * - customer.created, payment.received
 * - invoice.created, purchase.created
 * 
 * Each webhook payload is signed with HMAC-SHA256 for verification.
 * Dispatching is fire-and-forget to avoid blocking the main transaction.
 */

export type WebhookEvent =
    | "order.created"
    | "order.updated"
    | "salesorder.created"
    | "salesorder.updated"
    | "product.created"
    | "product.updated"
    | "product.deleted"
    | "stock.low"
    | "stock.movement"
    | "customer.created"
    | "customer.updated"
    | "payment.received"
    | "invoice.created"
    | "purchase.created"
    | "purchase.updated"
    | "expense.created"
    | "daily_close.created"

interface WebhookPayload {
    event: WebhookEvent
    data: Record<string, any>
    timestamp: string
    tenantId: string
}

/**
 * Dispatch a webhook event to all registered listeners for a tenant.
 * This is fire-and-forget — errors are logged but don't block the caller.
 * 
 * Usage:
 *   await dispatchWebhook(tenantId, "order.created", { orderId, total, items });
 */
export async function dispatchWebhook(
    tenantId: string,
    event: WebhookEvent,
    data: Record<string, any>
): Promise<void> {
    try {
        // Find all active webhooks for this tenant that subscribe to this event
        // Note: This requires the Webhook model (see schema addition below)
        // For now, we'll check if the model exists to avoid crashes before migration
        const webhooks = await (db as any).webhook?.findMany?.({
            where: {
                tenantId,
                isActive: true,
            }
        }).catch(() => null)

        if (!webhooks || webhooks.length === 0) return

        // Filter webhooks that subscribe to this event
        const matching = webhooks.filter((w: any) =>
            w.events && Array.isArray(w.events) && w.events.includes(event)
        )

        if (matching.length === 0) return

        const payload: WebhookPayload = {
            event,
            data,
            timestamp: new Date().toISOString(),
            tenantId,
        }

        const body = JSON.stringify(payload)

        // Fire all webhooks concurrently (fire-and-forget)
        const promises = matching.map(async (webhook: any) => {
            try {
                const signature = createHmac("sha256", webhook.secret || "")
                    .update(body)
                    .digest("hex")

                const response = await fetch(webhook.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": `sha256=${signature}`,
                        "X-Webhook-Event": event,
                        "X-Webhook-Id": webhook.id,
                        "User-Agent": "SyncloudPOS-Webhook/1.0",
                    },
                    body,
                    signal: AbortSignal.timeout(10000), // 10 second timeout
                })

                if (!response.ok) {
                    console.error(`[Webhook] ${webhook.id} returned ${response.status} for event ${event}`)
                }
            } catch (err) {
                console.error(`[Webhook] ${webhook.id} failed for event ${event}:`, err)
            }
        })

        // Don't await — let them run in background
        Promise.allSettled(promises).catch(() => null)
    } catch (err) {
        // Never let webhook errors affect the main flow
        console.error("[Webhook] Dispatch error:", err)
    }
}

/**
 * Helper: Generate a secure webhook secret.
 */
export function generateWebhookSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = "whsec_"
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * Verify a webhook signature (for receiving webhooks from external systems).
 * Usage on the receiving end:
 *   const isValid = verifyWebhookSignature(body, signature, secret);
 */
export function verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
): boolean {
    const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
    return signature === expected
}
