"use server"

import { db } from "@/lib/db"

const PLATFORM_WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PLATFORM_WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export const sendWhatsAppOTP = async (phone: string) => {
    if (!phone || phone.length < 9) {
        return { error: "Numéro de téléphone invalide" }
    }

    // Normalize phone: add +213 if Algerian format (0XXXXXXXXX)
    let normalizedPhone = phone.replace(/\s/g, "")
    if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "+213" + normalizedPhone.slice(1)
    } else if (!normalizedPhone.startsWith("+")) {
        normalizedPhone = "+" + normalizedPhone
    }

    // Check for existing valid OTP (rate limiting: 1 per minute)
    const recentOtp = await db.otpCode.findFirst({
        where: {
            phone: normalizedPhone,
            used: false,
            expiresAt: { gt: new Date() },
            createdAt: { gt: new Date(Date.now() - 60 * 1000) } // Last 1 min
        }
    })
    if (recentOtp) {
        return { error: "Veuillez attendre 1 minute avant de renvoyé le code" }
    }

    // Invalidate old OTPs for this phone
    await db.otpCode.updateMany({
        where: { phone: normalizedPhone, used: false },
        data: { used: true }
    })

    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    await db.otpCode.create({
        data: { phone: normalizedPhone, code, expiresAt }
    })

    // Send via WhatsApp Cloud API (if credentials are configured)
    if (PLATFORM_WHATSAPP_TOKEN && PLATFORM_WHATSAPP_PHONE_ID) {
        try {
            const res = await fetch(
                `https://graph.facebook.com/v18.0/${PLATFORM_WHATSAPP_PHONE_ID}/messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${PLATFORM_WHATSAPP_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        to: normalizedPhone,
                        type: "text",
                        text: {
                            body: `🔐 Votre code de vérification SyncCloud POS : *${code}*\n\nCe code expire dans 5 minutes. Ne le partagez jamais.`
                        }
                    })
                }
            )
            if (!res.ok) {
                const errBody = await res.text()
                console.error("[WHATSAPP_OTP_SEND_ERROR]", errBody)
                return { error: "Erreur d'envoi WhatsApp. Vérifiez votre numéro." }
            }
        } catch (err) {
            console.error("[WHATSAPP_OTP_SEND_ERROR]", err)
            return { error: "Erreur réseau lors de l'envoi du code." }
        }
    } else {
        // Dev mode: log to console
        console.log(`[DEV] OTP for ${normalizedPhone}: ${code}`)
    }

    return { success: true, phone: normalizedPhone }
}

export const verifyWhatsAppOTP = async (phone: string, code: string) => {
    // Normalize phone
    let normalizedPhone = phone.replace(/\s/g, "")
    if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "+213" + normalizedPhone.slice(1)
    } else if (!normalizedPhone.startsWith("+")) {
        normalizedPhone = "+" + normalizedPhone
    }

    const otpRecord = await db.otpCode.findFirst({
        where: {
            phone: normalizedPhone,
            code,
            used: false,
            expiresAt: { gt: new Date() }
        }
    })

    if (!otpRecord) {
        return { error: "Code invalide ou expiré. Réessayez." }
    }

    // Mark as used
    await db.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true }
    })

    return { success: true }
}
