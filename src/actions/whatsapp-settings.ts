"use server"

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/** Cloud-API credentials for the current tenant. Returns null if unauthorised. */
export async function getWhatsAppSettings(): Promise<
    { whatsappToken: string | null; whatsappPhoneId: string | null; whatsappPhone: string | null } | null
> {
    const session = await auth();
    if (!session?.user?.id) return null;
    const tenantId = session.user.tenantId;

    const { hasPermission } = await import("@/lib/rbac");
    if (!(await hasPermission("settings:read"))) return null;

    return db.tenant.findUnique({
        where: { id: tenantId },
        select: { whatsappToken: true, whatsappPhoneId: true, whatsappPhone: true },
    });
}

export async function saveWhatsAppSettings(data: {
    whatsappToken: string;
    whatsappPhoneId: string;
    whatsappPhone: string;
}): Promise<{ success?: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };
    const tenantId = session.user.tenantId;

    const { hasPermission } = await import("@/lib/rbac");
    if (!(await hasPermission("settings:update"))) return { error: "Accès refusé" };

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: {
                whatsappToken: data.whatsappToken || null,
                whatsappPhoneId: data.whatsappPhoneId || null,
                whatsappPhone: data.whatsappPhone || null,
            },
        });
        revalidatePath("/[locale]/(dashboard)/settings", "page");
        return { success: true };
    } catch (error) {
        console.error("Failed to save WhatsApp settings:", error);
        return { error: "Échec de l'enregistrement des paramètres WhatsApp" };
    }
}

export async function updateWhatsappSettings(data: {
    whatsappMode: "NONE" | "FREE" | "AUTOMATIC";
    whatsappAutoReceipt: boolean;
    whatsappAutoInvoice: boolean;
    whatsappPaymentReminder: boolean;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const tenantId = session.user.tenantId;

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: {
                whatsappMode: data.whatsappMode,
                whatsappAutoReceipt: data.whatsappAutoReceipt,
                whatsappAutoInvoice: data.whatsappAutoInvoice,
                whatsappPaymentReminder: data.whatsappPaymentReminder,
            }
        });

        revalidatePath("/[locale]/(dashboard)/settings/whatsapp", "page");
        return { success: true };
    } catch (error) {
        console.error("Failed to update WhatsApp settings:", error);
        return { error: "Failed to update settings" };
    }
}
