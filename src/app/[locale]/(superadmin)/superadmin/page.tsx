import { getTenantsForSuperadmin } from "@/actions/superadmin";
import { SuperAdminClient } from "./components/client";
import { serializeData } from "@/lib/serialize"

export default async function SuperadminPage() {
    const tenants = await getTenantsForSuperadmin();

    const formattedTenants = serializeData((tenants.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        subscriptionEndsAt: t.subscriptionEndsAt,
        isBlocked: t.isBlocked,
        createdAt: t.createdAt,
        activity: t.activity,
        address: t.address,
        wilaya: t.wilaya,
        commune: t.commune,
        nif: t.nif,
        rc: t.rc,
        nis: t.nis,
        ownerDetails: t.ownerDetails,
        users: t.users,
        usageStats: t.usageStats
    })))) as any[];

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SuperAdminClient data={formattedTenants} />
            </div>
        </div>
    )
}
