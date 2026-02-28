
import { format } from "date-fns"
import { getSalesOrders } from "@/actions/sales-orders"
import { SalesOrderClient } from "./components/client"
import { SalesOrderColumn } from "@/components/sales/types"
import { formatter } from "@/lib/utils"

const SalesPage = async ({
    searchParams
}: {
    searchParams: { page?: string, search?: string, type?: string, from?: string, to?: string }
}) => {
    const page = Number(searchParams.page) || 1
    const pageSize = 20
    const search = searchParams.search || ""
    const type = searchParams.type || "ALL"
    const from = searchParams.from || undefined
    const to = searchParams.to || undefined

    const { salesOrders, totalCount } = await getSalesOrders(page, pageSize, search, type, from, to) as { salesOrders: any[], totalCount: number }

    const formattedSalesOrders: SalesOrderColumn[] = salesOrders.map((item: any) => ({
        id: item.id,
        customer: item.customer.name,
        type: item.type,
        status: item.status,
        total: formatter.format(Number(item.total)),
        receiptNumber: item.receiptNumber || "",
        createdAt: format(new Date(item.createdAt), "MMMM do, yyyy"),
        originalDate: new Date(item.createdAt).toISOString(),
    }))

    const pageCount = Math.ceil(totalCount / pageSize)

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SalesOrderClient
                    data={formattedSalesOrders}
                    totalCount={totalCount}
                    pageCount={pageCount}
                    currentPage={page}
                />
            </div>
        </div>
    )
}

export default SalesPage
