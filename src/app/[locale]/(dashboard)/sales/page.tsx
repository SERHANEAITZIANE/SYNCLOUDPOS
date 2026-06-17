
import { format } from "date-fns"
import { getSalesOrders } from "@/actions/sales-orders"
import { SalesOrderClient } from "./components/client"
import { SalesOrderColumn } from "@/components/sales/types"
import { formatter } from "@/lib/utils"
import { db } from "@/lib/db"
import { auth } from "@/auth"

const SalesPage = async ({
    searchParams
}: {
    searchParams: Promise<{ page?: string, search?: string, type?: string, status?: string, from?: string, to?: string, limit?: string, customerId?: string }>
}) => {
    const params = await searchParams
    const page = Number(params.page) || 1
    const pageSize = Number(params.limit) || 20
    const search = params.search || ""
    const type = params.type || "ALL"
    const status = params.status || "ALL"
    const from = params.from || undefined
    const to = params.to || undefined
    const customerId = params.customerId || "ALL"

    const session = await auth()
    const tenantId = session?.user?.tenantId

    const [ordersResult, customers] = await Promise.all([
        getSalesOrders(page, pageSize, search, type, from, to, status, customerId),
        tenantId ? db.customer.findMany({
            where: { tenantId },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        }) : Promise.resolve([])
    ])

    const { salesOrders, totalCount, summary } = ordersResult as {
        salesOrders: any[]
        totalCount: number
        summary?: {
            totalSalesAmount: number
            totalPaidAmount: number
            totalUnpaidAmount: number
            totalItemsSold: number
        }
    }

    const formattedSalesOrders: SalesOrderColumn[] = salesOrders.map((item: any) => ({
        id: item.id,
        customer: item.customer.name,
        customerPhone: item.customer.phone || null,
        customerEmail: item.customer.email || null,
        type: item.type,
        status: item.status,
        total: formatter.format(Number(item.total)),
        amountPaid: formatter.format(Number(item.amountPaid || 0)),
        unpaid: formatter.format(Math.max(0, Number(item.total) - Number(item.amountPaid || 0))),
        receiptNumber: item.receiptNumber || "",
        createdAt: format(new Date(item.createdAt), "MMMM do, yyyy"),
        originalDate: new Date(item.createdAt).toISOString(),
        productCount: item.items?.length || 0,
        totalQuantity: (item.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0),
        itemsSummary: (item.items || []).map((i: any) => `${i.product?.name || "Produit"} (x${i.quantity})`).join(", "),
        paymentMethod: item.paymentMethod,
    }))

    const pageCount = Math.ceil(totalCount / pageSize)

    const formattedSummary = summary ? {
        totalSalesAmount: formatter.format(summary.totalSalesAmount),
        totalPaidAmount: formatter.format(summary.totalPaidAmount),
        totalUnpaidAmount: formatter.format(summary.totalUnpaidAmount),
        totalItemsSold: summary.totalItemsSold,
    } : {
        totalSalesAmount: formatter.format(0),
        totalPaidAmount: formatter.format(0),
        totalUnpaidAmount: formatter.format(0),
        totalItemsSold: 0,
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SalesOrderClient
                    data={formattedSalesOrders}
                    totalCount={totalCount}
                    pageCount={pageCount}
                    currentPage={page}
                    summary={formattedSummary}
                    customers={customers}
                />
            </div>
        </div>
    )
}

export default SalesPage
