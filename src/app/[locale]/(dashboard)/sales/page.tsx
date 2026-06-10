
import { format } from "date-fns"
import { getSalesOrders } from "@/actions/sales-orders"
import { SalesOrderClient } from "./components/client"
import { SalesOrderColumn } from "@/components/sales/types"
import { formatter } from "@/lib/utils"

const SalesPage = async ({
    searchParams
}: {
    searchParams: Promise<{ page?: string, search?: string, type?: string, from?: string, to?: string, limit?: string }>
}) => {
    const params = await searchParams
    const page = Number(params.page) || 1
    const pageSize = Number(params.limit) || 20
    const search = params.search || ""
    const type = params.type || "ALL"
    const from = params.from || undefined
    const to = params.to || undefined

    const { salesOrders, totalCount } = await getSalesOrders(page, pageSize, search, type, from, to) as { salesOrders: any[], totalCount: number }

    const formattedSalesOrders: SalesOrderColumn[] = salesOrders.map((item: any) => ({
        id: item.id,
        customer: item.customer.name,
        customerPhone: item.customer.phone || null,
        customerEmail: item.customer.email || null,
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
