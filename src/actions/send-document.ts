"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { generateSalesOrderPDF } from "@/lib/pdf-generator"
import nodemailer from "nodemailer"
import { sendEvolutionMessage, generateWaMeLink } from "@/lib/whatsapp"

// ─── Helper: fetch full sales order + store data ─────────────────────────────

async function fetchSalesOrderForPDF(salesOrderId: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) throw new Error("Unauthorized")

    const salesOrder = await db.salesOrder.findFirst({
        where: { id: salesOrderId, tenantId },
        include: {
            customer: true,
            items: { include: { product: true } },
            store: true,
        },
    })
    if (!salesOrder) throw new Error("Document introuvable")

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            name: true, activity: true, address: true, phone: true, fax: true,
            name: true, activity: true, address: true, phone: true, fax: true,
            email: true, nif: true, rc: true, nis: true, artImposition: true,
            bankAccount: true, logo: true, headerText: true,
            whatsappMode: true, whatsappInstanceId: true, whatsappStatus: true,
            smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFrom: true,
        },
    })

    const store = {
        name: salesOrder.store?.name || tenant?.name,
        activity: tenant?.activity,
        address: salesOrder.store?.address || tenant?.address,
        phone: tenant?.phone,
        fax: tenant?.fax,
        email: tenant?.email,
        nif: tenant?.nif,
        rc: tenant?.rc,
        nis: tenant?.nis,
        artImposition: tenant?.artImposition,
        bankAccount: tenant?.bankAccount,
        logo: tenant?.logo,
        headerText: tenant?.headerText,
    }

    return { salesOrder, store, tenant }
}

// ─── Document type labels ────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    INVOICE: "Facture",
    ORDER: "Bon de Livraison",
    QUOTE: "Devis / Proforma",
    CREDIT_NOTE: "Avoir",
}

// ─── Send via WhatsApp ───────────────────────────────────────────────────────

export async function sendDocumentViaWhatsApp(
    salesOrderId: string
): Promise<{ success?: string; error?: string; waUrl?: string }> {
    try {
        const { salesOrder, store, tenant } = await fetchSalesOrderForPDF(salesOrderId)
        const mode = tenant?.whatsappMode || "FREE"

        const phone = salesOrder.customer.phone?.replace(/\D/g, "")
        if (!phone) {
            return { error: "Ce client n'a pas de numéro de téléphone." }
        }

        const docLabel = TYPE_LABELS[salesOrder.type] || "Document"
        const companyName = store.name || "SYNCLOUDPOS"
        
        // Build receipt text
        const itemLines = salesOrder.items
            .map(i => `  • ${i.product.name} ×${i.quantity} — ${(Number(i.unitPrice) * Number(i.quantity)).toLocaleString("fr-DZ")} DA`)
            .join("\n")

        const body = [
            `📄 *${docLabel}* — ${companyName}`,
            `N° ${salesOrder.receiptNumber || salesOrder.id.slice(-8)}`,
            ``,
            itemLines,
            ``,
            `💰 *Total : ${Number(salesOrder.total).toLocaleString("fr-DZ")} DA*`,
            ``,
            `Merci pour votre confiance ! 🙏`
        ].join("\n")

        if (mode === "FREE") {
            const waUrl = generateWaMeLink(phone, body)
            return { waUrl }
        } else if (mode === "AUTOMATIC") {
            if (tenant?.whatsappStatus !== "CONNECTED") {
                return { error: "WhatsApp (Automatique) n'est pas connecté. Veuillez vérifier les paramètres." }
            }

            // Generate PDF for automatic mode
            const pdfBuffer = await generateSalesOrderPDF(
                {
                    id: salesOrder.id,
                    receiptNumber: salesOrder.receiptNumber,
                    type: salesOrder.type,
                    status: salesOrder.status,
                    paymentMethod: salesOrder.paymentMethod,
                    subtotal: Number(salesOrder.subtotal),
                    tvaAmount: Number(salesOrder.tvaAmount),
                    stampTax: Number(salesOrder.stampTax),
                    total: Number(salesOrder.total),
                    createdAt: salesOrder.createdAt,
                    customer: { ...salesOrder.customer, balance: Number(salesOrder.customer.balance) },
                    items: salesOrder.items.map(item => ({
                        product: { name: item.product.name },
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice),
                        tvaRate: Number(item.tvaRate),
                        priceHt: Number(item.priceHt),
                    })),
                },
                store
            )

            const filename = `${salesOrder.receiptNumber || salesOrder.id.slice(-8)}.pdf`

            // Pass the pdfBuffer and filename to sendEvolutionMessage to attach the document
            const sent = await sendEvolutionMessage(tenant.id, phone, body, pdfBuffer as Buffer, filename)
            if (!sent) {
                return { error: "Erreur lors de l'envoi WhatsApp via Evolution API." }
            }

            return { success: `${docLabel} envoyé par WhatsApp à ${salesOrder.customer.name}` }
        }

        return { error: "Mode WhatsApp non reconnu." }
    } catch (e) {
        console.error("[SEND_WHATSAPP_DOC]", e)
        return { error: "Erreur lors de l'envoi WhatsApp." }
    }
}

// ─── Send via Email ──────────────────────────────────────────────────────────

export async function sendDocumentViaEmail(
    salesOrderId: string
): Promise<{ success?: string; error?: string }> {
    try {
        const { salesOrder, store, tenant } = await fetchSalesOrderForPDF(salesOrderId)

        if (!tenant?.smtpHost || !tenant?.smtpUser || !tenant?.smtpPass) {
            return { error: "Email non configuré. Allez dans Paramètres → Email / SMTP." }
        }

        const customerEmail = salesOrder.customer.email
        if (!customerEmail) {
            return { error: "Ce client n'a pas d'adresse email." }
        }

        // Generate PDF
        const pdfBuffer = await generateSalesOrderPDF(
            {
                id: salesOrder.id,
                receiptNumber: salesOrder.receiptNumber,
                type: salesOrder.type,
                status: salesOrder.status,
                paymentMethod: salesOrder.paymentMethod,
                subtotal: Number(salesOrder.subtotal),
                tvaAmount: Number(salesOrder.tvaAmount),
                stampTax: Number(salesOrder.stampTax),
                total: Number(salesOrder.total),
                createdAt: salesOrder.createdAt,
                customer: { ...salesOrder.customer, balance: Number(salesOrder.customer.balance) },
                items: salesOrder.items.map(item => ({
                    product: { name: item.product.name },
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    tvaRate: Number(item.tvaRate),
                    priceHt: Number(item.priceHt),
                })),
            },
            store
        )

        const filename = `${salesOrder.receiptNumber || salesOrder.id.slice(-8)}.pdf`
        const docLabel = TYPE_LABELS[salesOrder.type] || "Document"
        const companyName = store.name || "SYNCLOUDPOS"

        // Create nodemailer transport
        const transporter = nodemailer.createTransport({
            host: tenant.smtpHost,
            port: parseInt(tenant.smtpPort || "587"),
            secure: tenant.smtpPort === "465",
            auth: {
                user: tenant.smtpUser,
                pass: tenant.smtpPass,
            },
        })

        // Send email
        await transporter.sendMail({
            from: tenant.smtpFrom || `${companyName} <${tenant.smtpUser}>`,
            to: customerEmail,
            subject: `${docLabel} ${salesOrder.receiptNumber || ""} — ${companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 24px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">${companyName}</h1>
                        ${store.activity ? `<p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">${store.activity}</p>` : ""}
                    </div>
                    <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="font-size: 16px; color: #374151;">Bonjour <strong>${salesOrder.customer.name}</strong>,</p>
                        <p style="color: #6B7280;">Veuillez trouver ci-joint votre <strong>${docLabel.toLowerCase()}</strong>.</p>

                        <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 4px 0; color: #6B7280;">Document</td>
                                    <td style="padding: 4px 0; text-align: right; font-weight: bold;">${docLabel}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; color: #6B7280;">Numéro</td>
                                    <td style="padding: 4px 0; text-align: right; font-weight: bold;">${salesOrder.receiptNumber || "—"}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; color: #6B7280;">Montant TTC</td>
                                    <td style="padding: 4px 0; text-align: right; font-weight: bold; font-size: 18px; color: #4F46E5;">
                                        ${Number(salesOrder.total).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
                            ${store.address ? `${store.address}` : ""}
                            ${store.phone ? ` | Tél: ${store.phone}` : ""}
                            ${store.nif ? ` | NIF: ${store.nif}` : ""}
                        </p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                },
            ],
        })

        return { success: `${docLabel} envoyé(e) par email à ${customerEmail}` }
    } catch (e) {
        console.error("[SEND_EMAIL_DOC]", e)
        const msg = e instanceof Error ? e.message : "Erreur inconnue"
        return { error: `Erreur envoi email: ${msg}` }
    }
}
