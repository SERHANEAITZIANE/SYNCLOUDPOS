
import { format } from "date-fns"
import { PurchasesClient } from "@/components/purchases/client"
import { PurchaseOrderColumn } from "@/components/purchases/types"
import { getPurchaseOrders } from "@/actions/purchase-orders"
import { formatter } from "@/lib/utils"

export default async function PurchasesPage() {
    const { purchaseOrders } = await getPurchaseOrders()

    const formattedOrders: PurchaseOrderColumn[] = ((purchaseOrders as any) || []).map((item: any) => ({
        id: item.id,
        supplier: item.supplier?.name || "",
        total: formatter.format(Number(item.total)),
        status: item.status,
        createdAt: format(new Date(item.createdAt), "dd/MM/yyyy"),
        imageUrl1: item.imageUrl1,
        imageUrl2: item.imageUrl2,
        imageUrl3: item.imageUrl3,
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PurchasesClient data={formattedOrders} />
            </div>
        </div>
    )
}
