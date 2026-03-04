import { getTenantsForSuperadmin } from "@/actions/superadmin";
import { SuperAdminClient } from "./components/client";
import { format } from "date-fns";

export default async function SuperadminPage() {
    const tenants = await getTenantsForSuperadmin();

    // Map to plain objects and enforce types for the client component
    const formattedTenants = tenants.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        subscriptionEndsAt: t.subscriptionEndsAt,
        isBlocked: false,
        createdAt: t.createdAt,
        ownerDetails: t.ownerDetails,
        usageStats: t.usageStats
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SuperAdminClient data={formattedTenants} />
            </div>
        </div>
    )
}
