"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfDay, endOfDay } from "date-fns"

export async function getProfitReport(dateRange?: { from: Date; to: Date }) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const tenantId = session.user.tenantId
    const toDate = dateRange?.to || endOfDay(new Date())
    const fromDate = dateRange?.from || startOfDay(new Date(new Date().setDate(1))) // Default: start of current month

    // Get all POS order items with product cost info
    const [posItems, salesItems] = await Promise.all([
        db.orderItem.findMany({
            where: {
                order: {
                    tenantId,
                    status: "COMPLETED",
                    createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
                }
            },
            include: {
                product: {
                    select: {
                        id: true, name: true, cost: true,
                        category: { select: { id: true, name: true } },
                        brand: { select: { id: true, name: true } }
                    }
                }
            }
        }),
        db.salesOrderItem.findMany({
            where: {
                salesOrder: {
                    tenantId,
                    status: "PAID",
                    createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
                }
            },
            include: {
                product: {
                    select: {
                        id: true, name: true, cost: true,
                        category: { select: { id: true, name: true } },
                        brand: { select: { id: true, name: true } }
                    }
                }
            }
        })
    ])

    // Aggregate by product
    const productMap = new Map<string, {
        name: string
        category: string
        brand: string
        qtySold: number
        revenue: number
        cost: number
    }>()

    const processItem = (item: any) => {
        const pid = item.product.id
        const existing = productMap.get(pid) || {
            name: item.product.name,
            category: item.product.category?.name || "Sans catégorie",
            brand: item.product.brand?.name || "Sans marque",
            qtySold: 0,
            revenue: 0,
            cost: 0
        }

        existing.qtySold += item.quantity
        existing.revenue += Number(item.price || item.unitPrice) * item.quantity
        existing.cost += Number(item.product.cost || 0) * item.quantity
        productMap.set(pid, existing)
    }

    posItems.forEach(processItem)
    salesItems.forEach(processItem)

    const products = Array.from(productMap.entries()).map(([id, data]) => ({
        id,
        ...data,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit)

    // Aggregate by category
    const categoryMap = new Map<string, { revenue: number; cost: number; qtySold: number }>()
    products.forEach(p => {
        const cat = p.category
        const existing = categoryMap.get(cat) || { revenue: 0, cost: 0, qtySold: 0 }
        existing.revenue += p.revenue
        existing.cost += p.cost
        existing.qtySold += p.qtySold
        categoryMap.set(cat, existing)
    })

    const byCategory = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        ...data,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit)

    // Aggregate by brand
    const brandMap = new Map<string, { revenue: number; cost: number; qtySold: number }>()
    products.forEach(p => {
        const brand = p.brand
        const existing = brandMap.get(brand) || { revenue: 0, cost: 0, qtySold: 0 }
        existing.revenue += p.revenue
        existing.cost += p.cost
        existing.qtySold += p.qtySold
        brandMap.set(brand, existing)
    })

    const byBrand = Array.from(brandMap.entries()).map(([name, data]) => ({
        name,
        ...data,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit)

    // Totals
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
    const totalCost = products.reduce((s, p) => s + p.cost, 0)
    const totalProfit = totalRevenue - totalCost
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return JSON.parse(JSON.stringify({
        products: products.slice(0, 50),
        byCategory,
        byBrand,
        totals: { totalRevenue, totalCost, totalProfit, overallMargin }
    }))
}
