
import { format } from "date-fns"
import { PurchasesClient } from "@/components/purchases/client"
import { PurchaseOrderColumn } from "@/components/purchases/types"
import { getPurchaseOrders } from "@/actions/purchase-orders"
import { formatter } from "@/lib/utils"

export default async function PurchasesPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string, limit?: string, search?: string }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const limit = Number(params.limit) || 20
    const search = params.search || ""

    const { purchaseOrders, totalCount } = await getPurchaseOrders(page, limit, search) as { purchaseOrders: any[], totalCount: number }

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
                />
            </div>
        </div>
    )
}
