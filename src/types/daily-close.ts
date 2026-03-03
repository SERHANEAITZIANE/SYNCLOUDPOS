// Shared types for DailyClose feature (can be imported in both client and server)
export type DailyCloseData = {
    totalRevenue: number
    cashRevenue: number
    transferRevenue: number
    checkRevenue: number
    termRevenue: number
    totalExpenses: number
    netCash: number
    ordersCount: number
    salesCount: number
    periodStart: Date
    periodEnd: Date
}
