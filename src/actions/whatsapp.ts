"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import logger from "@/lib/logger"
import { checkRateLimit, RateLimitResult } from "@/lib/rate-limiter"
import { handleAppError, IntegrationError, ValidationError, AuthenticationError } from "@/lib/errors"

// WhatsApp API rate limit configuration
// WhatsApp Business API limits: typically 250 messages per second per phone number
// But we'll use a more conservative limit for individual tenants
const WHATSAPP_RATE_LIMIT_CONFIG = {
  limit: 30,  // 30 messages per hour per tenant
  window: 60 * 60 * 1000,  // 1 hour
  prefix: "whatsapp"
}

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
    if (!tenantId) {
        throw new AuthenticationError()
    }

    // Apply rate limiting based on tenant and recipient phone number
    const rateLimitKey = `${tenantId}:${to}`
    const rateLimitResult = checkRateLimit(rateLimitKey, WHATSAPP_RATE_LIMIT_CONFIG)

    if (!rateLimitResult.allowed) {
        const resetInMinutes = Math.ceil((rateLimitResult.resetTime - Date.now()) / (60 * 1000))
        logger.warn("WhatsApp message rate limited", {
            tenantId,
            to,
            rateLimitResult
        })
        return {
            error: `Too many messages sent. Please wait ${resetInMinutes} minutes before sending another message.`
        }
    }

    try {
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { whatsappToken: true, whatsappPhoneId: true }
        })

        if (!tenant?.whatsappToken || !tenant?.whatsappPhoneId) {
            return { error: "WhatsApp not configured. Please add your API credentials in Settings." }
        }

        // Validate WhatsApp API credentials
        if (!isValidWhatsAppToken(tenant.whatsappToken)) {
            throw new ValidationError("Invalid WhatsApp token format. Please check your API credentials.")
        }

        if (!isValidWhatsAppPhoneId(tenant.whatsappPhoneId)) {
            throw new ValidationError("Invalid WhatsApp Business ID format. Please check your API credentials.")
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
            logger.error("WhatsApp API error", { responseStatus: response.status, responseData: data })

            // Extract error message from response if available
            const errorMessage = data?.error?.message || "WhatsApp API error. Check credentials."

            throw new IntegrationError("WhatsApp", errorMessage, {
              status: response.status,
              data: data?.error
            })
        }

        return { success: "Message sent successfully!" }
    } catch (error) {
        logger.error("sendWhatsAppMessage error", { error })

        // Transform the error using the unified error handler
        const appError = handleAppError(error, "sendWhatsAppMessage")

        return { error: appError.message }
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
    if (!tenantId) {
        throw new AuthenticationError()
    }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true }
    })

    const message = `🏪 *${tenant?.name || "Notre magasin"}*\n\nBonjour ${customerName},\n\nNous vous rappelons que vous avez un solde dû de *${Math.abs(balance).toLocaleString("fr-DZ")} ${currency}* .\n\nMerci de régulariser votre situation dès que possible .\n\n_Merci pour votre fidélité_ 🙏`

    const result = await sendWhatsAppMessage({ to: phone, message })

    if (result.error) {
        logger.warn("Failed to send debt reminder", {
            customerName,
            phone,
            balance,
            error: result.error
        })
    }

    return result
}

/**
 * Get WhatsApp settings for a tenant
 */
export async function getWhatsAppSettings() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) {
        throw new AuthenticationError()
    }

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
    if (!tenantId) {
        throw new AuthenticationError()
    }

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
        logger.error("saveWhatsAppSettings error", { error: e instanceof Error ? { message: e.message, stack: e.stack } : e })
        return { error: "Failed to save WhatsApp settings." }
    }
}

/**
 * Validates WhatsApp token format
 * WhatsApp tokens typically start with 'EA' followed by alphanumeric characters
 */
function isValidWhatsAppToken(token: string): boolean {
  return typeof token === 'string' && /^EA[A-Za-z0-9]{11,130}$/.test(token)
}

/**
 * Validates WhatsApp Business Phone ID format
 * Phone IDs are typically 15-18 digit numbers
 */
function isValidWhatsAppPhoneId(phoneId: string): boolean {
  return typeof phoneId === 'string' && /^\d{15,18}$/.test(phoneId)
}