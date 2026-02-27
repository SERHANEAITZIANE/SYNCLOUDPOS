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
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Map the relation array into a flatter structure for the table
        return tenants.map(tenant => ({
            ...tenant,
            ownerDetails: tenant.users[0] || null
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
