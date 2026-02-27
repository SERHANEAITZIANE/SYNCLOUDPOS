"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getCustomerPayments(dateRange?: { from: Date; to: Date }, customerId?: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        // @ts-expect-error tenantId
        const tenantId = session.user.tenantId

        // Build where clause
        const where: any = {
            tenantId,
            source: { in: ["SALE", "MANUAL_IN"] },
            type: "CREDIT"
        }

        // Date filter
        if (dateRange?.from) {
            where.date = { gte: dateRange.from }
            if (dateRange.to) {
                where.date.lte = dateRange.to
            }
        }

        // Query transactions
        const transactions = await db.treasuryTransaction.findMany({
            where,
            include: {
                account: {
                    select: { name: true }
                }
            },
            orderBy: { date: "desc" }
        })

        // Now we need to map these to customers. 
        // For SALE, referenceId points to Order.id (or SalesOrder). 
        // For MANUAL_IN, we just updated it to point to Customer.id

        // Let's fetch the necessary Orders and Customers to resolve the names
        const orderIds = transactions.filter(t => t.source === "SALE" && t.referenceId).map(t => t.referenceId as string)
        const customerIdsFromManual = transactions.filter(t => t.source === "MANUAL_IN" && t.referenceId).map(t => t.referenceId as string)

        const orders = await db.order.findMany({
            where: { id: { in: orderIds }, tenantId },
            include: { customer: { select: { id: true, name: true } } }
        })

        // Fallback for sales that might be using SalesOrder
        const salesOrders = await db.salesOrder.findMany({
            where: { id: { in: orderIds }, tenantId },
            include: { customer: { select: { id: true, name: true } } }
        })

        const customers = await db.customer.findMany({
            where: { id: { in: customerIdsFromManual }, tenantId },
            select: { id: true, name: true }
        })

        // Map everything together
        let mappedPayments = transactions.map(t => {
            let customerName = "Client de passage"
            let foundCustomerId = undefined

            if (t.source === "SALE") {
                const order = orders.find(o => o.id === t.referenceId)
                if (order?.customer) {
                    customerName = order.customer.name
                    foundCustomerId = order.customer.id
                } else {
                    const sOrder = salesOrders.find(o => o.id === t.referenceId)
                    if (sOrder?.customer) {
                        customerName = sOrder.customer.name
                        foundCustomerId = sOrder.customer.id
                    }
                }
            } else if (t.source === "MANUAL_IN") {
                const customer = customers.find(c => c.id === t.referenceId)
                if (customer) {
                    customerName = customer.name
                    foundCustomerId = customer.id
                } else {
                    customerName = "Ancien Impayé (Non lié)"
                }
            }

            return {
                id: t.id,
                date: t.date.toISOString(),
                amount: Number(t.amount),
                source: t.source,
                description: t.description || "",
                accountName: t.account?.name || "Inconnu",
                customerName,
                customerId: foundCustomerId
            }
        })

        // Filter by customer if requested (since we map it post-query for SALES due to the relation hop)
        if (customerId && customerId !== "ALL") {
            mappedPayments = mappedPayments.filter(p => p.customerId === customerId)
        }

        return mappedPayments
    } catch (error) {
        console.error("[GET_CUSTOMER_PAYMENTS]", error)
        return []
    }
}
