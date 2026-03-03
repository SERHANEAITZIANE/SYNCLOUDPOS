"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

/**
 * Send a WhatsApp message using Meta Cloud API
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */
export async function sendWhatsAppMessage({
    to,
    message,
}: {
    to: string   // Phone number in international format, e.g. +213554123456
    message: string
}): Promise<{ success?: string; error?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    try {
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { whatsappToken: true, whatsappPhoneId: true }
        })

        if (!tenant?.whatsappToken || !tenant?.whatsappPhoneId) {
            return { error: "WhatsApp not configured. Please add your API credentials in Settings." }
        }

        // Clean phone number: remove spaces, +, or leading zeros
        const cleaned = to.replace(/\s+/g, "").replace(/^0+/, "")
        // Ensure international format
        const phone = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned

        const response = await fetch(
            `https://graph.facebook.com/v21.0/${tenant.whatsappPhoneId}/messages`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${tenant.whatsappToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: phone,
                    type: "text",
                    text: { body: message }
                })
            }
        )

        const data = await response.json()

        if (!response.ok) {
            console.error("WhatsApp API error:", data)
            return { error: data?.error?.message || "WhatsApp API error. Check credentials." }
        }

        return { success: "Message sent successfully!" }
    } catch (e) {
        console.error("sendWhatsAppMessage error:", e)
        return { error: "Network error sending WhatsApp message." }
    }
}

/**
 * Send a debt reminder to a customer
 */
export async function sendDebtReminder({
    customerName,
    phone,
    balance,
    currency = "DA"
}: {
    customerName: string
    phone: string
    balance: number
    currency?: string
}): Promise<{ success?: string; error?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true }
    })

    const message = `🏪 *${tenant?.name || "Notre magasin"}*\n\nBonjour ${customerName},\n\nNous vous rappelons que vous avez un solde dû de *${Math.abs(balance).toLocaleString("fr-DZ")} ${currency}*.\n\nMerci de régulariser votre situation dès que possible.\n\n_Merci pour votre fidélité_ 🙏`

    return sendWhatsAppMessage({ to: phone, message })
}

/**
 * Get WhatsApp settings for a tenant
 */
export async function getWhatsAppSettings() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return null

    return db.tenant.findUnique({
        where: { id: tenantId },
        select: { whatsappToken: true, whatsappPhoneId: true, whatsappPhone: true }
    })
}

/**
 * Save WhatsApp settings
 */
export async function saveWhatsAppSettings(data: {
    whatsappToken: string
    whatsappPhoneId: string
    whatsappPhone: string
}): Promise<{ success?: string; error?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: {
                whatsappToken: data.whatsappToken || null,
                whatsappPhoneId: data.whatsappPhoneId || null,
                whatsappPhone: data.whatsappPhone || null,
            }
        })
        return { success: "WhatsApp settings saved!" }
    } catch (e) {
        console.error("saveWhatsAppSettings error:", e)
        return { error: "Failed to save WhatsApp settings." }
    }
}
