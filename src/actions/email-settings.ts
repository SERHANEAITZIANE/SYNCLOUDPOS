"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import nodemailer from "nodemailer"

/**
 * Get email/SMTP settings for a tenant
 */
export async function getEmailSettings() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return null

    return db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPass: true,
            smtpFrom: true,
        },
    })
}

/**
 * Save email/SMTP settings
 */
export async function saveEmailSettings(data: {
    smtpHost: string
    smtpPort: string
    smtpUser: string
    smtpPass: string
    smtpFrom: string
}): Promise<{ success?: string; error?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Non autorisé" }

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: {
                smtpHost: data.smtpHost || null,
                smtpPort: data.smtpPort || null,
                smtpUser: data.smtpUser || null,
                smtpPass: data.smtpPass || null,
                smtpFrom: data.smtpFrom || null,
            },
        })
        return { success: "Paramètres email sauvegardés !" }
    } catch (e) {
        console.error("saveEmailSettings error:", e)
        return { error: "Erreur lors de la sauvegarde." }
    }
}

/**
 * Test SMTP connection by sending a test email
 */
export async function testEmailConnection(): Promise<{ success?: string; error?: string }> {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Non autorisé" }

    try {
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: {
                smtpHost: true, smtpPort: true, smtpUser: true,
                smtpPass: true, smtpFrom: true, name: true, email: true,
            },
        })

        if (!tenant?.smtpHost || !tenant?.smtpUser || !tenant?.smtpPass) {
            return { error: "Veuillez d'abord sauvegarder les paramètres SMTP." }
        }

        const transporter = nodemailer.createTransport({
            host: tenant.smtpHost,
            port: parseInt(tenant.smtpPort || "587"),
            secure: tenant.smtpPort === "465",
            auth: {
                user: tenant.smtpUser,
                pass: tenant.smtpPass,
            },
        })

        // Verify connection
        await transporter.verify()

        // Send test email to the tenant's own email
        const to = tenant.email || tenant.smtpUser
        await transporter.sendMail({
            from: tenant.smtpFrom || `${tenant.name} <${tenant.smtpUser}>`,
            to,
            subject: `✅ Test SYNCLOUDPOS — Email fonctionne !`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>✅ Configuration email réussie</h2>
                    <p>Votre configuration SMTP fonctionne correctement.</p>
                    <p>Vous pouvez maintenant envoyer des factures, bons de livraison et devis par email depuis SYNCLOUDPOS.</p>
                    <br/>
                    <p style="color: #999; font-size: 12px;">— ${tenant.name || "SYNCLOUDPOS"}</p>
                </div>
            `,
        })

        return { success: `Email de test envoyé à ${to}` }
    } catch (e) {
        console.error("testEmailConnection error:", e)
        const msg = e instanceof Error ? e.message : "Erreur inconnue"
        return { error: `Échec de connexion: ${msg}` }
    }
}
