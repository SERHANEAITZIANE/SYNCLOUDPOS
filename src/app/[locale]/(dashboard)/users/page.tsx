import { getTenantUsers } from "@/actions/get-tenant-users"
import { getStores } from "@/actions/stores"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { UsersClient } from "@/components/users/users-client"

export default async function UsersPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
        redirect("/dashboard")
    }

    const [users, stores, tenant] = await Promise.all([
        getTenantUsers(),
        getStores(),
        db.tenant.findUnique({
            where: { id: session.user.tenantId },
            select: { customRolePermissions: true }
        })
    ])

    const initialPermissions = (tenant?.customRolePermissions as Record<string, any>) || {}

    return (
        <div className="w-full flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6 w-full">
                <UsersClient
                    users={users as any}
                    stores={stores as any}
                    currentStoreId={session.user.defaultStoreId}
                    initialPermissions={initialPermissions}
                />
            </div>
        </div>
    )
}
