"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export async function getAnalyticsData(dateRange?: { from: Date; to: Date }) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        // @ts-expect-error tenantId
        const tenantId = session.user.tenantId

        const toDate = dateRange?.to || new Date()
        const fromDate = dateRange?.from || subDays(toDate, 30)

        // ─── 1. POS Orders (cash register) ───────────────────────────────
        const posOrders = await db.order.findMany({
            where: {
                tenantId,
                status: "COMPLETED",
                createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            include: {
                items: { include: { product: { include: { category: true } } } },
                customer: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        // ─── 2. Sales / Invoices (SalesOrder model) ───────────────────────
        const salesOrders = await db.salesOrder.findMany({
            where: {
                tenantId,
                status: "PAID",
                createdAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            },
            include: {
                items: { include: { product: { include: { category: true } } } },
                customer: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        // ─── 3. Expenses ───────────────────────────────────────────────────
        const expenses = await db.expense.findMany({
            where: {
                tenantId,
                date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) }
            }
        })

        // ─── 4. All Customers (for outstanding debt) ──────────────────────
        const customers = await db.customer.findMany({
            where: { tenantId },
            select: { id: true, name: true, balance: true },
            orderBy: { balance: "asc" } // most negative first = biggest debtors
        })

        // ─── 5. Low Stock Products ────────────────────────────────────────
        const lowStockProducts = await db.product.findMany({
            where: {
                tenantId,
                isArchived: false
            },
            select: { id: true, name: true, stock: true, minStock: true },
            orderBy: { stock: "asc" }
        })

        // ─── Calculations ─────────────────────────────────────────────────
        const posRevenue = posOrders.reduce((acc: number, o: any) => acc + Number(o.total), 0)
        const invoiceRevenue = salesOrders.reduce((acc: number, o: any) => acc + Number(o.total), 0)
        const totalRevenue = posRevenue + invoiceRevenue
        const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.amount), 0)

        // COGS = cost of goods actually sold (qty × product.cost per item)
        const calcCOGS = (orders: any[]) =>
            orders.reduce((acc: number, o: any) =>
                acc + o.items.reduce((iAcc: number, item: any) =>
                    iAcc + (item.quantity * Number(item.product?.cost ?? 0)), 0), 0)
        const totalCOGS = calcCOGS(posOrders) + calcCOGS(salesOrders)

        const netProfit = totalRevenue - totalExpenses - totalCOGS
        const ordersCount = posOrders.length
        const salesCount = salesOrders.length
        // Outstanding debt = customers with negative balance (they owe money)
        const outstandingDebt = customers
            .filter((c: any) => Number(c.balance) < 0)
            .reduce((acc: number, c: any) => acc + Math.abs(Number(c.balance)), 0)

        // ─── Revenue Over Time (POS + Invoice combined) ───────────────────
        const revenueMap = new Map<string, { revenue: number; expenses: number }>()
        posOrders.forEach((o: any) => {
            const date = format(o.createdAt as Date, "MMM dd")
            const cur = revenueMap.get(date) || { revenue: 0, expenses: 0 }
            revenueMap.set(date, { ...cur, revenue: cur.revenue + Number(o.total) })
        })
        salesOrders.forEach((o: any) => {
            const date = format(o.createdAt as Date, "MMM dd")
            const cur = revenueMap.get(date) || { revenue: 0, expenses: 0 }
            revenueMap.set(date, { ...cur, revenue: cur.revenue + Number(o.total) })
        })
        expenses.forEach((e: any) => {
            const date = format(e.date as Date, "MMM dd")
            const cur = revenueMap.get(date) || { revenue: 0, expenses: 0 }
            revenueMap.set(date, { ...cur, expenses: cur.expenses + Number(e.amount) })
        })
        const revenueOverTime = Array.from(revenueMap.entries())
            .map(([date, vals]) => ({ date, ...vals }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // ─── Top Products (combined) ──────────────────────────────────────
        const productMap = new Map<string, { quantity: number; revenue: number }>()
        const addItems = (items: any[]) => items.forEach(item => {
            const cur = productMap.get(item.product.name) || { quantity: 0, revenue: 0 }
            productMap.set(item.product.name, {
                quantity: cur.quantity + item.quantity,
                revenue: cur.revenue + (Number(item.price ?? item.unitPrice) * item.quantity)
            })
        })
        posOrders.forEach(o => addItems(o.items))
        salesOrders.forEach(o => addItems(o.items))

        const topProducts = Array.from(productMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // ─── Category Performance ─────────────────────────────────────────
        const categoryMap = new Map<string, number>()
            ; ([...posOrders, ...salesOrders] as any[]).flatMap(o => o.items).forEach((item: any) => {
                const cat = item.product.category?.name || "Sans catégorie"
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + (Number(item.price ?? item.unitPrice) * item.quantity))
            })
        const categoryPerformance = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // ─── Recent POS Orders ────────────────────────────────────────────
        const recentOrders = posOrders.slice(0, 8).map((o: any) => ({
            id: o.id,
            customerName: o.customer?.name || "Client de passage",
            total: Number(o.total),
            paidAmount: Number(o.paidAmount),
            date: format(o.createdAt as Date, "dd/MM HH:mm")
        }))

        // ─── Top Customers ────────────────────────────────────────────────
        const customerSpend = new Map<string, { name: string; spent: number }>()
        posOrders.forEach((o: any) => {
            if (!o.customer) return
            const cur = customerSpend.get(o.customer.id) || { name: o.customer.name, spent: 0 }
            customerSpend.set(o.customer.id, { ...cur, spent: cur.spent + Number(o.total) })
        })
        salesOrders.forEach((o: any) => {
            if (!o.customer) return
            const cur = customerSpend.get(o.customer.id) || { name: o.customer.name, spent: 0 }
            customerSpend.set(o.customer.id, { ...cur, spent: cur.spent + Number(o.total) })
        })
        const topCustomers = Array.from(customerSpend.values())
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5)

        // ─── Low Stock Alert ──────────────────────────────────────────────
        const lowStock = lowStockProducts
            .filter((p: any) => p.stock <= p.minStock)
            .slice(0, 8)
            .map((p: any) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock }))

        // ─── Debtors ──────────────────────────────────────────────────────
        const debtors = customers
            .filter((c: any) => Number(c.balance) < 0)
            .slice(0, 5)
            .map((c: any) => ({ id: c.id, name: c.name, balance: Math.abs(Number(c.balance)) }))

        return JSON.parse(JSON.stringify({
            totalRevenue,
            posRevenue,
            invoiceRevenue,
            totalExpenses,
            totalCOGS,
            netProfit,
            ordersCount,
            salesCount,
            outstandingDebt,
            revenueOverTime,
            topProducts,
            categoryPerformance,
            recentOrders,
            topCustomers,
            lowStock,
            debtors
        }))
    } catch (error) {
        console.error("[GET_ANALYTICS]", error)
        return {
            totalRevenue: 0, posRevenue: 0, invoiceRevenue: 0,
            totalExpenses: 0, totalCOGS: 0, netProfit: 0,
            ordersCount: 0, salesCount: 0, outstandingDebt: 0,
            revenueOverTime: [], topProducts: [], categoryPerformance: [],
            recentOrders: [], topCustomers: [], lowStock: [], debtors: []
        }
    }
}
