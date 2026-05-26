import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UnifiedSettingsClient } from "./components/unified-settings-client";
import { getEnvDatabaseUrl } from "@/actions/system-settings";

export default async function SettingsPage() {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN" && !(session?.user as any)?.isSuperadmin) {
        redirect("/dashboard");
    }

    const tenantId = await getActiveTenantId();
    if (!tenantId) redirect("/dashboard");

    const store = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!store) redirect("/dashboard");

    const rawAccounts = await db.treasuryAccount.findMany({
        where: { tenantId },
        select: { id: true, name: true, type: true, balance: true }
    });

    const accounts = rawAccounts.map(a => ({
        ...a,
        balance: Number(a.balance)
    }));

    const databaseUrl = await getEnvDatabaseUrl();

    return (
        <div className="flex-col">
            <div className="flex-1 p-4 md:p-8 pt-6">
                <UnifiedSettingsClient
                    tenant={{
                        name: store.name,
                        ownerName: store.ownerName,
                        activity: store.activity,
                        address: store.address,
                        wilaya: store.wilaya,
                        commune: store.commune,
                        phone: store.phone,
                        fax: store.fax,
                        email: store.email,
                        nif: store.nif,
                        rc: store.rc,
                        artImposition: store.artImposition,
                        nis: store.nis,
                        bankAccount: store.bankAccount,
                        logo: store.logo,
                        headerText: store.headerText,
                        blTemplate: store.blTemplate || "standard",
                        aiProvider: store.aiProvider || "GEMINI",
                        aiModel: store.aiModel || null,
                        geminiApiKey: store.geminiApiKey,
                        openaiApiKey: store.openaiApiKey,
                        anthropicApiKey: store.anthropicApiKey,
                        loyaltyPointsPerDa: store.loyaltyPointsPerDa ?? 1,
                        loyaltyDaPerPoint: store.loyaltyDaPerPoint ?? 100,
                    }}
                    accounts={accounts}
                    databaseUrl={databaseUrl || ""}
                />
            </div>
        </div>
    );
}
