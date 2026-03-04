"use server"

import { db } from "@/lib/db"

export const getTenantsForSuperadmin = async () => {
    try {
        const tenants = await db.tenant.findMany({
            include: {
                users: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                    },
                    take: 1
                },
                _count: {
                    select: {
                        users: true,
                        products: true,
                        orders: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Second step: get total revenue for each tenant from orders
        const revenueAggregates = await Promise.all(tenants.map(async (tenant) => {
            const revenue = await db.order.aggregate({
                where: { tenantId: tenant.id, status: "COMPLETED" },
                _sum: { total: true }
            })
            const salesInvoiceRevenue = await db.salesOrder.aggregate({
                where: { tenantId: tenant.id, status: "PAID" },
                _sum: { total: true }
            })

            return {
                id: tenant.id,
                totalRevenue: Number(revenue._sum.total || 0) + Number(salesInvoiceRevenue._sum.total || 0)
            }
        }))

        // Map the relation array into a flatter structure for the table
        return tenants.map(tenant => ({
            ...tenant,
            ownerDetails: tenant.users[0] || null,
            usageStats: {
                users: tenant._count.users,
                products: tenant._count.products,
                orders: tenant._count.orders,
                totalRevenue: revenueAggregates.find(r => r.id === tenant.id)?.totalRevenue || 0
            }
        }));
    } catch (error) {
        console.error("Failed to fetch tenants:", error)
        return []
    }
}

export const updateTenantSubscription = async (tenantId: string, additionalMonths: number) => {
    try {
        const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) return { error: "Tenant not found" };

        let currentEndDate = tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : new Date();

        // If the subscription is already expired, start strictly from today.
        if (currentEndDate < new Date()) {
            currentEndDate = new Date();
        }

        currentEndDate.setMonth(currentEndDate.getMonth() + additionalMonths);

        await db.tenant.update({
            where: { id: tenantId },
            data: { subscriptionEndsAt: currentEndDate }
        });

        return { success: "Subscription extended successfully!" };
    } catch (error) {
        return { error: "Failed to update subscription" };
    }
}

export const toggleTenantBlock = async (tenantId: string, isBlocked: boolean) => {
    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: { isBlocked }
        });

        return { success: `Tenant ${isBlocked ? 'blocked' : 'unblocked'} successfully.` };
    } catch (error) {
        return { error: "Failed to update tenant status" };
    }
}
