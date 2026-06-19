"use server"

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

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
