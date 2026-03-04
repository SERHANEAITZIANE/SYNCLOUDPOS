"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export const getTenantsForSuperadmin = async () => {
    try {
        const tenants = await db.tenant.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        isSuperadmin: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        products: true,
                        orders: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

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
        if (currentEndDate < new Date()) currentEndDate = new Date();
        currentEndDate.setMonth(currentEndDate.getMonth() + additionalMonths);

        await db.tenant.update({ where: { id: tenantId }, data: { subscriptionEndsAt: currentEndDate } });
        revalidatePath("/[locale]/(dashboard)/superadmin", "page")
        return { success: "Subscription extended successfully!" };
    } catch {
        return { error: "Failed to update subscription" };
    }
}

export const toggleTenantBlock = async (tenantId: string, isBlocked: boolean) => {
    try {
        await db.tenant.update({ where: { id: tenantId }, data: { isBlocked } });
        revalidatePath("/[locale]/(dashboard)/superadmin", "page")
        return { success: `Tenant ${isBlocked ? 'blocked' : 'unblocked'} successfully.` };
    } catch {
        return { error: "Failed to update tenant status" };
    }
}

// Reset any user's password (superadmin only)
export const resetUserPassword = async (userId: string, newPassword: string) => {
    const session = await auth()
    if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }
    if (newPassword.length < 6) return { error: "Minimum 6 characters" }
    const hashed = await bcrypt.hash(newPassword, 10)
    await db.user.update({ where: { id: userId }, data: { password: hashed } })
    return { success: "Mot de passe réinitialisé" }
}

// Change own password (any logged-in user)
export const changeMyPassword = async (currentPassword: string, newPassword: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    if (newPassword.length < 6) return { error: "Minimum 6 caractères requis" }

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { error: "Utilisateur introuvable" }

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return { error: "Mot de passe actuel incorrect" }

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.user.update({ where: { id: user.id }, data: { password: hashed } })
    return { success: "Mot de passe modifié avec succès" }
}
