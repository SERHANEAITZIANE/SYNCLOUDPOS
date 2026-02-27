
import { format } from "date-fns"
import { getSalesOrders } from "@/actions/sales-orders"
import { SalesOrderClient } from "./components/client"
import { SalesOrderColumn } from "@/components/sales/types"
import { formatter } from "@/lib/utils"

const SalesPage = async () => {
    const salesOrders = await getSalesOrders()

    const formattedSalesOrders: SalesOrderColumn[] = salesOrders.map((item: any) => ({
        id: item.id,
        customer: item.customer.name,
        type: item.type,
        status: item.status,
        total: formatter.format(Number(item.total)),
        receiptNumber: item.receiptNumber || "",
        createdAt: format(new Date(item.createdAt), "MMMM do, yyyy"),
        originalDate: new Date(item.createdAt).toISOString(), // Pass ISO string to avoid serialization error
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SalesOrderClient data={formattedSalesOrders} />
            </div>
        </div>
    )
}

export default SalesPage
