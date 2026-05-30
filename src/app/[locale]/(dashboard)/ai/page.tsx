import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";
import { AiClient } from "./components/ai-client";
import { redirect } from "next/navigation";
import { getBusinessStats } from "@/actions/ai-context";

export default async function AiPage() {
    const tenantId = await getActiveTenantId();
    if (!tenantId) redirect("/dashboard");

    const [tenant, initialStats] = await Promise.all([
        db.tenant.findUnique({
            where: { id: tenantId },
            select: {
                aiProvider: true,
                aiModel: true,
                geminiApiKey: true,
                openaiApiKey: true,
                anthropicApiKey: true
            }
        }),
        getBusinessStats()
    ]);

    return (
        <AiClient
            dbProvider={tenant?.aiProvider || "GEMINI"}
            dbKeys={{
                gemini: tenant?.geminiApiKey || "",
                openai: tenant?.openaiApiKey || "",
                claude: tenant?.anthropicApiKey || "",
                kimi: ""
            }}
            initialStats={initialStats}
        />
    );
}
