"use server"

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getEvolutionInstanceStatus, logoutEvolutionInstance } from "@/lib/whatsapp";

export async function checkWhatsappConnection() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const tenantId = session.user.tenantId;

    return await getEvolutionInstanceStatus(tenantId);
}

export async function disconnectWhatsapp() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const tenantId = session.user.tenantId;

    await logoutEvolutionInstance(tenantId);
    return { success: true };
}

export async function sendDebtReminder({
    customerName,
    phone,
    balance,
    currency = "DA"
}: {
    customerName: string;
    phone: string;
    balance: number;
    currency?: string;
}): Promise<{ success?: string; error?: string; waUrl?: string }> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const tenantId = session.user.tenantId;

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, whatsappMode: true, whatsappInstanceId: true, whatsappStatus: true }
    });

    if (!tenant) {
        return { error: "Tenant not found" };
    }

    const mode = tenant.whatsappMode || "FREE";
    const cleanedPhone = phone.replace(/\D/g, "");
    if (!cleanedPhone) {
        return { error: "Ce client n'a pas de numéro de téléphone valide." };
    }

    const companyName = tenant.name || "Notre magasin";
    const formattedBalance = Math.abs(balance).toLocaleString("fr-DZ");
    const body = `🏪 *${companyName}*\n\nBonjour ${customerName},\n\nWe remind you that you have an outstanding balance of *${formattedBalance} ${currency}*.\n\nPlease clear your balance as soon as possible.\n\n_Thank you for your loyalty_ 🙏`;

    if (mode === "FREE") {
        const { generateWaMeLink } = await import("@/lib/whatsapp");
        const waUrl = generateWaMeLink(phone, body);
        return { waUrl };
    } else if (mode === "AUTOMATIC") {
        if (tenant.whatsappStatus !== "CONNECTED") {
            return { error: "WhatsApp (Automatique) n'est pas connecté. Veuillez vérifier les paramètres." };
        }

        const { sendEvolutionMessage } = await import("@/lib/whatsapp");
        const sent = await sendEvolutionMessage(tenantId, phone, body);
        if (!sent) {
            return { error: "Erreur lors de l'envoi WhatsApp via Evolution API." };
        }

        return { success: "Rappel de dette envoyé avec succès !" };
    }

    return { error: "L'envoi de messages WhatsApp n'est pas activé dans vos paramètres." };
}