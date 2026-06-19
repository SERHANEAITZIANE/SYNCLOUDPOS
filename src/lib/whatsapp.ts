// src/lib/whatsapp.ts
import { db } from "@/lib/db";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "YOUR_GLOBAL_API_KEY"; // Change in prod

/**
 * Generates a wa.me link for the FREE mode.
 */
export function generateWaMeLink(phone: string, text: string): string {
    // Format phone number to international format, assuming Algeria (213)
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
        formattedPhone = "213" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("213")) {
        // Fallback or guess
        formattedPhone = "213" + formattedPhone;
    }
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Checks if the Evolution API instance exists, if not, creates it.
 * Returns the instance connection state and QR code if needed.
 */
export async function getEvolutionInstanceStatus(tenantId: string) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Tenant not found");

    const instanceName = tenant.whatsappInstanceId || `tenant_${tenantId}`;

    // If it's not saved yet, save it
    if (!tenant.whatsappInstanceId) {
        await db.tenant.update({
            where: { id: tenantId },
            data: { whatsappInstanceId: instanceName }
        });
    }

    try {
        // 1. Check if instance exists in Evolution API
        const checkRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { "apikey": EVOLUTION_API_KEY }
        });

        if (checkRes.status === 404 || !checkRes.ok) {
            // Instance doesn't exist, create it
            const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
                body: JSON.stringify({
                    instanceName,
                    qrcode: true,
                    webhook: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook` : undefined,
                    webhook_by_events: false,
                    events: ["QRCODE_UPDATED", "CONNECTION_UPDATE"]
                })
            });

            if (!createRes.ok) throw new Error("Failed to create WhatsApp instance");
            const createData = await createRes.json();
            
            // It might return the QR code directly
            if (createData.qrcode && createData.qrcode.base64) {
                return { status: "QR_READY", qrcode: createData.qrcode.base64 };
            }
            return { status: "DISCONNECTED", qrcode: null };
        }

        const stateData = await checkRes.json();
        const state = stateData?.instance?.state || "disconnected";

        if (state === "open") {
            return { status: "CONNECTED", qrcode: null };
        } else if (state === "connecting") {
            // Might be waiting for QR
            const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                headers: { "apikey": EVOLUTION_API_KEY }
            });
            const qrData = await qrRes.json();
            if (qrData.base64) {
                return { status: "QR_READY", qrcode: qrData.base64 };
            }
            return { status: "DISCONNECTED", qrcode: null };
        } else {
            // Disconnected, trigger connect to get QR
            const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                headers: { "apikey": EVOLUTION_API_KEY }
            });
            const qrData = await qrRes.json();
            if (qrData.base64) {
                return { status: "QR_READY", qrcode: qrData.base64 };
            }
            return { status: "DISCONNECTED", qrcode: null };
        }
    } catch (error) {
        console.error("Evolution API Error:", error);
        // Fallback for development if Evolution API is not running
        if (process.env.NODE_ENV === "development") {
            console.log("Mocking Evolution API response for development");
            return { 
                status: "QR_READY", 
                qrcode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                mocked: true
            };
        }
        return { status: "ERROR", message: "Impossible de se connecter au service WhatsApp" };
    }
}

/**
 * Logs out and deletes the instance.
 */
export async function logoutEvolutionInstance(tenantId: string) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    const instanceName = tenant?.whatsappInstanceId;
    if (!instanceName) return;

    try {
        await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
            method: "DELETE",
            headers: { "apikey": EVOLUTION_API_KEY }
        });
        
        await db.tenant.update({
            where: { id: tenantId },
            data: { whatsappStatus: "DISCONNECTED" }
        });
    } catch (error) {
        console.error("Error logging out WhatsApp:", error);
    }
}

/**
 * Sends a message via Evolution API.
 */
export async function sendEvolutionMessage(tenantId: string, phone: string, text: string, mediaBuffer?: Buffer, mediaName?: string) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.whatsappMode !== "AUTOMATIC" || !tenant.whatsappInstanceId) {
        throw new Error("WhatsApp non configuré en mode automatique");
    }

    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "213" + formattedPhone.substring(1);
    else if (!formattedPhone.startsWith("213")) formattedPhone = "213" + formattedPhone;

    try {
        if (mediaBuffer && mediaName) {
            // Send Media (PDF/Image)
            const base64Media = mediaBuffer.toString('base64');
            // Assuming pdf for now based on mediaName ending in .pdf
            const mimetype = mediaName.endsWith('.pdf') ? "application/pdf" : "image/jpeg";
            
            await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${tenant.whatsappInstanceId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
                body: JSON.stringify({
                    number: formattedPhone,
                    options: { delay: 1200 },
                    mediaMessage: {
                        mediatype: "document",
                        caption: text,
                        media: base64Media,
                        fileName: mediaName
                    }
                })
            });
        } else {
            // Send Text
            await fetch(`${EVOLUTION_API_URL}/message/sendText/${tenant.whatsappInstanceId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
                body: JSON.stringify({
                    number: formattedPhone,
                    options: { delay: 1200 },
                    textMessage: { text }
                })
            });
        }
        return true;
    } catch (error) {
        console.error("Error sending Evolution message:", error);
        if (process.env.NODE_ENV === "development") {
            console.log(`Mock sent message to ${formattedPhone}`);
            return true;
        }
        return false;
    }
}
