import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/rbac"
import { RolesMatrixClient } from "@/components/settings/roles-matrix-client"

export default async function RolesSettingsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    // Admin or superadmin check
    const isAllowed = await hasPermission("users:update")
    if (!isAllowed && session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-red-600">Accès refusé</h3>
                    <p className="text-slate-500 text-sm">Seul un administrateur peut modifier la matrice des rôles et permissions.</p>
                </div>
            </div>
        )
    }

    const tenant = await db.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { customRolePermissions: true }
    })

    const initialPermissions = (tenant?.customRolePermissions as Record<string, any>) || {}

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-6 sm:p-8 pt-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Gestion des Rôles & Permissions</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personnalisez entièrement les accès et exportez/importez vos configurations.</p>
                    </div>
                </div>
                <RolesMatrixClient initialPermissions={initialPermissions} />
            </div>
        </div>
    )
}
