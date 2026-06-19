"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { format } from "date-fns"
import { sendEvolutionMessage } from "@/lib/whatsapp"

/**
 * Sends a WhatsApp receipt message to a customer after a POS sale.
 * Uses the Evolution API.
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
                whatsappMode: true,
                whatsappAutoReceipt: true,
                whatsappInstanceId: true,
                whatsappStatus: true,
                name: true,
            }
        })

        const mode = tenant?.whatsappMode || "FREE"

        // Check if receipt sending is turned on
        if (!tenant?.whatsappAutoReceipt) {
            return { skipped: true, reason: "WhatsApp Receipts not enabled" }
        }

        if (mode === "AUTOMATIC" && tenant?.whatsappStatus !== "CONNECTED") {
            return { skipped: true, reason: "WhatsApp Automatic Mode disconnected" }
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
        if (!phone) return { skipped: true, reason: "No customer phone" }

        // Build receipt text
        const itemLines = order.items
            .map(i => `  • ${i.product.name} ×${i.quantity} — ${(Number(i.price) * Number(i.quantity)).toLocaleString("fr-DZ")} DA`)
            .join("\n")

        const body = [
            `🧾 *Reçu — ${tenant.name}*`,
            `📅 ${format(order.createdAt, "dd/MM/yyyy HH:mm")}`,
            `N° ${order.receiptNumber}`,
            ``,
            itemLines,
            ``,
            `💰 *Total : ${Number(order.total).toLocaleString("fr-DZ")} DA*`,
            `✅ Payé : ${Number(order.paidAmount).toLocaleString("fr-DZ")} DA`,
            ``,
            `Merci pour votre achat ! 🙏`
        ].join("\n")

        if (mode === "FREE") {
            // Import generateWaMeLink dynamically to avoid circular dependencies if any
            const { generateWaMeLink } = await import("@/lib/whatsapp")
            const waUrl = generateWaMeLink(phone, body)
            return { waUrl }
        }

        const sent = await sendEvolutionMessage(tenantId, phone, body)

        if (!sent) {
            return { error: "Failed to send message via Evolution API" }
        }

        return { success: true }
    } catch (error) {
        console.error("[WHATSAPP_RECEIPT_ERROR]", error)
        return { error: "Failed to send receipt" }
    }
}
