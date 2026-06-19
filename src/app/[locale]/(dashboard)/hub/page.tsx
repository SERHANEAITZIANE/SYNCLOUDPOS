import { getActiveTenantId } from "@/actions/get-active-tenant";
import { redirect } from "next/navigation";
import { HubClient } from "./components/hub-client";

export default async function HubPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen">
            <HubClient />
        </div>
    );
}
