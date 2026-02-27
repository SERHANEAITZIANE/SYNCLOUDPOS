import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SystemSettingsClient } from "./components/client";
import { getEnvDatabaseUrl } from "@/actions/system-settings";

export default async function SettingsPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/dashboard");
    }

    const store = await db.tenant.findUnique({
        where: { id: tenantId }
    });

    if (!store) {
        redirect("/dashboard");
    }

    const currentDatabaseUrl = await getEnvDatabaseUrl();

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SystemSettingsClient initialData={{
                    blTemplate: store!.blTemplate || "standard",
                    databaseUrl: currentDatabaseUrl || ""
                }} />
            </div>
        </div>
    );
}
