export type SalesOrderColumn = {
    id: string
    customer: string
    customerPhone?: string | null
    customerEmail?: string | null
    type: string
    status: string
    total: string
    receiptNumber: string
    createdAt: string
    originalDate: string
    amountPaid?: string
    unpaid?: string
    productCount?: number
    totalQuantity?: number
    itemsSummary?: string
    paymentMethod: string
}
