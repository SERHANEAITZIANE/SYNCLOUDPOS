
import { format } from "date-fns"
import { PurchasesClient } from "@/components/purchases/client"
import { PurchaseOrderColumn } from "@/components/purchases/types"
import { getPurchaseOrders } from "@/actions/purchase-orders"
import { formatter } from "@/lib/utils"
import { db } from "@/lib/db"
import { auth } from "@/auth"

export default async function PurchasesPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string, limit?: string, search?: string, status?: string, from?: string, to?: string, supplierId?: string }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const limit = Number(params.limit) || 20
    const search = params.search || ""
    const status = params.status || "ALL"
    const from = params.from || undefined
    const to = params.to || undefined
    const supplierId = params.supplierId || "ALL"

    const session = await auth()
    const tenantId = session?.user?.tenantId

    const [ordersResult, suppliers] = await Promise.all([
        getPurchaseOrders(page, limit, search, status, from, to, supplierId),
        tenantId ? db.supplier.findMany({
            where: { tenantId },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        }) : Promise.resolve([])
    ])

    const { purchaseOrders, totalCount } = ordersResult as { purchaseOrders: any[], totalCount: number }

    const formattedOrders: PurchaseOrderColumn[] = ((purchaseOrders as any) || []).map((item: any) => {
        const productCount = item.items?.length || 0
        const totalQuantity = (item.items || []).reduce((acc: number, current: any) => acc + Number(current.quantity), 0)

        return {
            id: item.id,
            supplier: item.supplier?.name || "",
            total: formatter.format(Number(item.total)),
            status: item.status,
            createdAt: format(new Date(item.createdAt), "dd/MM/yyyy"),
            rawDate: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
            productCount,
            totalQuantity,
            purchaseNumber: item.purchaseNumber,
            imageUrl1: item.imageUrl1,
            imageUrl2: item.imageUrl2,
            imageUrl3: item.imageUrl3,
            accountId: item.accountId,
            accountName: item.account?.name || null,
            accountType: item.account?.type || null,
        }
    })

    const pageCount = Math.ceil((totalCount || 0) / limit)

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PurchasesClient 
                    data={formattedOrders} 
                    totalCount={totalCount || 0}
                    pageCount={pageCount}
                    currentPage={page}
                    suppliers={suppliers}
                />
            </div>
        </div>
    )
}
