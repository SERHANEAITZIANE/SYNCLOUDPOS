"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useTranslations } from "next-intl"
import { format } from "date-fns"

interface AnalyticsClientProps {
  data: {
    salesData: { date: string; sales: number }[]
    customerData: { date: string; customers: number }[]
    inventoryData: { date: string; balance: number }[]
    financialData: { date: string; profit: number }[]
  }
}

// Types for data transforms
type DailyComparison = {
  current: number
  previous: number
  change: number
}

// Helper to get day of week
function getDayName(date: Date): string {
  return format(date, 'EEEE')
}

// Helper to calculate change percentage
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function calculateChange() should be at the beginning

export const AnalyticsClient = ({ data }: AnalyticsClientProps) => {
  const t = useTranslations("AnalyticsClient")

  // Transform data into useful metrics
  const totalRevenue = data.salesData.reduce((sum, day) => sum + day.sales, 0)
  const totalCustomers = data.customerData.reduce((sum, day) => sum + day.customers, 0)
  const lowStockItems = data.inventoryData.filter(item => item.balance < 10).length

  // Get yesterday's data for comparison
  const yesterday = data.salesData[data.salesData.length - 1]
  const dayBeforeYesterday = data.salesData[data.salesData.length - 2]
  const customerYesterday = data.customerData[data.customerData.length -1]
  const customerDayBefore = data.customerData[data.customerData.length -2]

  // Calculate comparison values
  const salesComparison: DailyComparison = {
    current: yesterday?.sales || 0,
    previous: dayBeforeYesterday?.sales || 0,
    change: calculateChange(yesterday?.sales || 0, dayBeforeYesterday?.sales || 0)
  }

  const customerComparison: DailyComparison = {
    current: customerYesterday?.customers || 0,
    previous: customerDayBefore?.customers || 0,
    change: calculateChange(customerYesterday?.customers || 0, customerDayBefore?.customers || 0)
  }

  return (
    <div className="space-y-6">
      {/* Priority 1: Immediate Actions (Red indicators and warnings) */}
      <Card className="border-l-4 border-l-red-500 border-red-100 dark:border-red-900/40">
        <CardHeader>
          <CardTitle className="text-red-500 dark:text-red-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="10.36 2 14.64 2 19 7.39 19 16.61 14.64 22 9.36 22 5 16.61 5 7.39 10.36 2"/><circle cx="12" cy="12" r="3"/></svg>
            {t("immediateActions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockItems > 0 && (
            <div className="bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                <span className="font-medium text-sm text-red-700 dark:text-red-400">{t("lowStockItems", { count: lowStockItems })}</span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300">{t("lowStockMessage")}</p>
            </div>
          )}
          {/* Add more warning indicators as needed - e.g. overdue invoices, expired subscriptions, etc. */}
        </CardContent>
      </Card>

      {/* Priority 2: Daily Insights (Orange indicators) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              {t("dailySales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <div className="font-bold text-2xl">{new Intl.NumberFormat("fr-FR").format(salesComparison.current)}</div>
              <span className="text-sm text-gray-500 ml-2">{t("yesterday")}</span>
              {salesComparison.change > 0 ? (
                <span className="text-sm text-green-500 ml-2">
                  ↓ {Math.abs(salesComparison.change).toFixed(1)}%
                </span>
              ) : salesComparison.change < 0 ? (
                <span className="text-sm text-red-500 ml-2">
                  ↑ {Math.abs(salesComparison.change).toFixed(1)}%
                </span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t("trendComparedToPrevDay")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="23"></line><line x2="15" y2="13"></line><line x1="23" x2="23" y2="13"></line><line x1="15" y1="13" y2="13"></line></svg>
              {t("dailyCustomers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <div className="font-bold text-2xl">{customerComparison.current}</div>
              <span className="text-sm text-gray-500 ml-2">{t("yesterday")}</span>
              {customerComparison.change > 0 ? (
                <span className="text-sm text-green-500 ml-2">
                  ↓ {Math.abs(customerComparison.change).toFixed(1)}%
                </span>
              ) : customerComparison.change < 0 ? (
                <span className="text-sm text-red-500 ml-2">
                  ↑ {Math.abs(customerComparison.change).toFixed(1)}%
                </span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t("trendComparedToPrevDay")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority 3: Strategic Overview with better layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 17 10 7 16 13 21 8"></polyline><line x1="2" x2="2" y1="17" y2="21"></line><line x1="14" x2="14" y1="1" y2="7"></line><line x1="18" x2="18" y1="3" y2="9"></line></svg>
              {t("30DayRevenueTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.salesData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Line strokeWidth={2.5} dataKey="sales" stroke="currentColor" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4V21"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 0-8 0"></path></svg>
              {t("30DayCustomerTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.customerData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Line strokeWidth={2.5} dataKey="customers" stroke="currentColor" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Strategy areas can be added here as needed - e.g. inventory turnover, profit margins, etc. */}
      </div>
    </div>
  )
}