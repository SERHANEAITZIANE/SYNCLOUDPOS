"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export const getTenantsForSuperadmin = async () => {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return []
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
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }
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
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }
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

import { cookies } from "next/headers"

// Impersonate a tenant
export const impersonateTenant = async (tenantId: string) => {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }

        // Find the first store of target tenant
        const firstStore = await db.store.findFirst({
            where: { tenantId },
            select: { id: true }
        })

        // Fetch user from DB to get their current real tenantId
        const user = await db.user.findUnique({
            where: { id: session.user.id }
        })
        if (!user) return { error: "User not found" }

        // Store the original tenantId in a cookie if not already impersonating
        const cookieStore = await cookies()
        const alreadyImpersonating = cookieStore.get("original_tenant_id")
        if (!alreadyImpersonating) {
            cookieStore.set("original_tenant_id", user.tenantId, { path: "/" })
        }

        // Switch user's active tenant and store
        await db.user.update({
            where: { id: session.user.id },
            data: {
                tenantId,
                defaultStoreId: firstStore?.id ?? null
            }
        })

        revalidatePath("/dashboard")
        return { success: "Impersonation started" }
    } catch (error) {
        console.error("Impersonation failed:", error)
        return { error: "Failed to impersonate" }
    }
}

// Stop impersonating and restore original tenant
export const stopImpersonation = async () => {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        const cookieStore = await cookies()
        const originalTenantId = cookieStore.get("original_tenant_id")?.value
        if (!originalTenantId) {
            return { error: "Not currently impersonating" }
        }

        // Find first store of original tenant
        const firstStore = await db.store.findFirst({
            where: { tenantId: originalTenantId },
            select: { id: true }
        })

        // Switch user's active tenant and store back
        await db.user.update({
            where: { id: session.user.id },
            data: {
                tenantId: originalTenantId,
                defaultStoreId: firstStore?.id ?? null
            }
        })

        // Clear cookie
        cookieStore.delete("original_tenant_id")

        revalidatePath("/dashboard")
        return { success: "Restored original session" }
    } catch (error) {
        console.error("Failed to stop impersonation:", error)
        return { error: "Failed to stop impersonation" }
    }
}

// Create a new tenant space directly (Superadmin only)
export const createTenantDirect = async (values: {
    name: string
    ownerName: string
    email: string
    phone?: string
    password?: string
    subscriptionMonths: number
}) => {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }

        const { name, ownerName, email, phone, password, subscriptionMonths } = values

        // Validation
        if (!name || !ownerName || !email) {
            return { error: "Name, owner name, and email are required" }
        }

        const existingUser = await db.user.findUnique({
            where: { email: email.trim().toLowerCase() }
        })

        if (existingUser) {
            return { error: "Email already in use!" }
        }

        const pass = password || "syncloud123456" // Default password if not provided
        const hashedPassword = await bcrypt.hash(pass, 10)

        // Calculate subscription date
        const subEndDate = new Date()
        subEndDate.setMonth(subEndDate.getMonth() + subscriptionMonths)

        // Create Tenant
        const tenant = await db.tenant.create({
            data: {
                name,
                ownerName,
                phone,
                email,
                subscriptionEndsAt: subEndDate
            }
        })

        // Create Default Store
        const defaultStore = await db.store.create({
            data: {
                name: "Boutique Principale",
                tenantId: tenant.id
            }
        })

        // Create Admin User
        const newUser = await db.user.create({
            data: {
                name: ownerName,
                email: email.trim().toLowerCase(),
                phone,
                password: hashedPassword,
                tenantId: tenant.id,
                role: "ADMIN",
                defaultStoreId: defaultStore.id
            }
        })

        // Create TenantUser relation
        await db.tenantUser.create({
            data: {
                userId: newUser.id,
                tenantId: tenant.id,
                role: "ADMIN"
            }
        })

        // Seed Treasury and Customer
        await Promise.all([
            db.treasuryAccount.createMany({
                data: [
                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                ]
            }),
            db.customer.create({
                data: {
                    name: "DIVERS",
                    clientType: "RETAIL",
                    tenantId: tenant.id
                }
            })
        ])

        revalidatePath("/[locale]/(dashboard)/superadmin", "page")
        return { success: `Client space '${name}' created successfully.` }
    } catch (error: any) {
        console.error("Failed to create tenant:", error)
        return { error: "Failed to create: " + error.message }
    }
}

// Assign an existing user to a store/tenant
export const assignUserToTenant = async (
    email: string, 
    tenantId: string, 
    role: "ADMIN" | "CASHIER" | "MANAGER" | "STOCK_MANAGER" | "ACCOUNTANT" | "VENDEUR"
) => {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }

        // Find user by email, username, or phone number
        const identifier = email.trim().toLowerCase()
        const user = await db.user.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier, mode: 'insensitive' } },
                    { username: { equals: identifier, mode: 'insensitive' } },
                    { phone: email.trim() }
                ]
            }
        })
        if (!user) return { error: "User not found with this identifier" }

        // Check if already in TenantUser
        const existing = await db.tenantUser.findUnique({
            where: {
                userId_tenantId: {
                    userId: user.id,
                    tenantId
                }
            }
        })

        if (existing) {
            return { error: "User already belongs to this store/tenant" }
        }

        // Get first store of tenant
        const firstStore = await db.store.findFirst({
            where: { tenantId },
            select: { id: true }
        })

        // Add user to TenantUser
        const tenantRole = role === "ADMIN" ? "ADMIN" : "USER"
        await db.tenantUser.create({
            data: {
                userId: user.id,
                tenantId,
                role: tenantRole
            }
        })

        // Update active tenant and store for that user
        await db.user.update({
            where: { id: user.id },
            data: {
                tenantId,
                defaultStoreId: firstStore?.id ?? user.defaultStoreId
            }
        })

        revalidatePath("/[locale]/(dashboard)/superadmin", "page")
        return { success: `Successfully linked ${email} to the store.` }
    } catch (error: any) {
        console.error("Failed to link user:", error)
        return { error: "Failed to link user: " + error.message }
    }
}
