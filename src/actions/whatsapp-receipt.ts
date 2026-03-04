"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { format } from "date-fns"

/**
 * Sends a WhatsApp receipt message to a customer after a POS sale.
 * Uses the tenant's WhatsApp Cloud API token and phone number ID stored in settings.
 * Fire-and-forget — called after order is saved.
 */
export async function sendWhatsAppReceipt(orderId: string) {
    try {
        const session = await auth()
        if (!session?.user?.tenantId) return { error: "Unauthorized" }

        const tenantId = session.user.tenantId

        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: {
                whatsappToken: true,
                whatsappPhoneId: true,
                name: true,
            }
        })

        if (!tenant?.whatsappToken || !tenant?.whatsappPhoneId) {
            // WhatsApp not configured — silently skip
            return { skipped: true }
        }

        const order = await db.order.findUnique({
            where: { id: orderId },
            include: {
                customer: { select: { name: true, phone: true } },
                items: {
                    include: {
                        product: { select: { name: true } }
                    }
                }
            }
        })

        if (!order) return { error: "Order not found" }

        // Only send if customer has a phone number
        const phone = order.customer?.phone?.replace(/\D/g, "")
        if (!phone) return { skipped: true, reason: "no customer phone" }

        // Build WhatsApp number — add country code if not present
        const wa = phone.startsWith("213") ? phone : `213${phone.replace(/^0/, "")}`

        // Build receipt text
        const itemLines = order.items
            .map(i => `  • ${i.product.name} ×${i.quantity} — ${(Number(i.price) * Number(i.quantity)).toLocaleString("fr-DZ")} DA`)
            .join("\n")

        const body = [
            `🧾 *Reçu — ${tenant.name}*`,
            `📅 ${format(order.createdAt, "dd/MM/yyyy HH:mm")}`,
            ``,
            itemLines,
            ``,
            `💰 *Total : ${Number(order.total).toLocaleString("fr-DZ")} DA*`,
            `✅ Payé : ${Number(order.paidAmount).toLocaleString("fr-DZ")} DA`,
            ``,
            `Merci pour votre achat ! 🙏`
        ].join("\n")

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${tenant.whatsappPhoneId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tenant.whatsappToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: wa,
                    type: "text",
                    text: { body }
                })
            }
        )

        if (!response.ok) {
            const err = await response.json()
            console.error("[WHATSAPP_RECEIPT]", err)
            return { error: "WhatsApp API error", details: err }
        }

        return { success: true }
    } catch (error) {
        console.error("[WHATSAPP_RECEIPT_ERROR]", error)
        return { error: "Failed to send receipt" }
    }
}
