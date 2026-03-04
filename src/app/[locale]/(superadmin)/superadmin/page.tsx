import { getTenantsForSuperadmin } from "@/actions/superadmin";
import { SuperAdminClient } from "./components/client";

export default async function SuperadminPage() {
    const tenants = await getTenantsForSuperadmin();

    const formattedTenants = tenants.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        subscriptionEndsAt: t.subscriptionEndsAt,
        isBlocked: t.isBlocked,
        createdAt: t.createdAt,
        ownerDetails: t.ownerDetails,
        users: t.users,
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
