import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { hasPermission } from "@/lib/rbac"
import { db } from "@/lib/db"
import { getStockDashboardData, getStockEntriesAndExitsLogs } from "@/actions/stock-dashboard"
import { StockDashboardClient } from "@/components/products/stock-dashboard-client"

const StockDashboardPage = async () => {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/login")
    }

    const tenantId = session.user.tenantId

    // RBAC check: allow access if user has inventory read permission
    const isAllowed = await hasPermission("inventory:read")
    if (!isAllowed) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-red-600">Accès refusé</h3>
                    <p className="text-slate-500 text-sm">Vous n'avez pas l'autorisation d'accéder au contrôle du stock.</p>
                </div>
            </div>
        )
    }

    // Parallelize data fetching for lightning fast load times
    const [dashboardRes, movementsRes, categories, brands] = await Promise.all([
        getStockDashboardData(),
        getStockEntriesAndExitsLogs(),
        db.category.findMany({
            where: { tenantId, isArchived: false },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        }),
        db.brand.findMany({
            where: { tenantId, isArchived: false },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        })
    ])

    const stockItems = dashboardRes.items || []
    const kpi = dashboardRes.kpi || {
        totalStockCount: 0,
        totalCostValuation: 0,
        totalSalesValuation: 0,
        totalReservations: 0,
        totalAvaries: 0
    }

    const entries = movementsRes.entries || []
    const exits = movementsRes.exits || []

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Contrôle du Stock</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Valorisation financière et traçabilité des mouvements d'inventaire</p>
                    </div>
                </div>
                <StockDashboardClient
                    initialItems={stockItems}
                    initialKpi={kpi}
                    initialEntries={entries}
                    initialExits={exits}
                    categories={categories}
                    brands={brands}
                />
            </div>
        </div>
    )
}

export default StockDashboardPage
