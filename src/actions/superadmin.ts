"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

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

        // Use groupBy to aggregate all tenant revenues in 2 queries instead of 2×N
        const [orderRevenues, salesRevenues] = await Promise.all([
            db.order.groupBy({
                by: ['tenantId'],
                where: { status: "COMPLETED" },
                _sum: { total: true }
            }),
            db.salesOrder.groupBy({
                by: ['tenantId'],
                where: { status: "PAID" },
                _sum: { total: true }
            })
        ])

        const revenueMap = new Map<string, number>()
        for (const r of orderRevenues) {
            revenueMap.set(r.tenantId, Number(r._sum.total || 0))
        }
        for (const r of salesRevenues) {
            revenueMap.set(r.tenantId, (revenueMap.get(r.tenantId) || 0) + Number(r._sum.total || 0))
        }

        return tenants.map(tenant => ({
            ...tenant,
            ownerDetails: tenant.users[0] || null,
            usageStats: {
                users: tenant._count.users,
                products: tenant._count.products,
                orders: tenant._count.orders,
                totalRevenue: revenueMap.get(tenant.id) || 0
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
        revalidatePath("/superadmin")
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
        revalidatePath("/superadmin")
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

// Impersonate a tenant (cookie-based — never mutates the DB)
export const impersonateTenant = async (tenantId: string) => {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Unauthorized" }

        // Verify tenant exists
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true }
        })
        if (!tenant) return { error: "Tenant not found" }

        // Find first store of the target tenant (for defaultStoreId override)
        const firstStore = await db.store.findFirst({
            where: { tenantId },
            select: { id: true }
        })

        // Set impersonation cookies (no DB changes)
        const cookieStore = await cookies()
        cookieStore.set("impersonated_tenant_id", tenantId, { path: "/", httpOnly: true, sameSite: "lax" })
        cookieStore.set("impersonated_store_id", firstStore?.id || "", { path: "/", httpOnly: true, sameSite: "lax" })
        // Keep original_tenant_id for the banner detection in layout.tsx
        cookieStore.set("original_tenant_id", session.user.tenantId || "", { path: "/", httpOnly: true, sameSite: "lax" })

        revalidatePath("/")
        return { success: "Impersonation started" }
    } catch (error) {
        console.error("Impersonation failed:", error)
        return { error: "Failed to impersonate" }
    }
}

// Stop impersonating (cookie-based — never mutates the DB)
export const stopImpersonation = async () => {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        const cookieStore = await cookies()
        const isImpersonating = cookieStore.has("impersonated_tenant_id") || cookieStore.has("original_tenant_id")
        if (!isImpersonating) {
            return { error: "Not currently impersonating" }
        }

        // Clear all impersonation cookies
        cookieStore.delete("impersonated_tenant_id")
        cookieStore.delete("impersonated_store_id")
        cookieStore.delete("original_tenant_id")

        revalidatePath("/")
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

        const result = await db.$transaction(async (tx) => {
            // Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    ownerName,
                    phone,
                    email,
                    subscriptionEndsAt: subEndDate
                }
            })

            // Create Default Store
            const defaultStore = await tx.store.create({
                data: {
                    name: "Boutique Principale",
                    tenantId: tenant.id
                }
            })

            // Create Admin User
            const newUser = await tx.user.create({
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
            await tx.tenantUser.create({
                data: {
                    userId: newUser.id,
                    tenantId: tenant.id,
                    role: "ADMIN"
                }
            })

            // Seed Treasury and Customer
            await tx.treasuryAccount.createMany({
                data: [
                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                ]
            })
            await tx.customer.create({
                data: {
                    name: "DIVERS",
                    clientType: "RETAIL",
                    tenantId: tenant.id
                }
            })
            return tenant
        })

        revalidatePath("/superadmin")
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
    role: "ADMIN" | "CASHIER" | "MANAGER" | "STOCK_MANAGER" | "ACCOUNTANT" | "VENDEUR" | "PURCHASE_MANAGER" | "SALES_MANAGER"
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

        // Ensure user has a TenantUser record for their current tenant (prevent eclipse)
        if (user.tenantId) {
            const currentLink = await db.tenantUser.findUnique({
                where: {
                    userId_tenantId: {
                        userId: user.id,
                        tenantId: user.tenantId
                    }
                }
            })
            if (!currentLink) {
                await db.tenantUser.create({
                    data: {
                        userId: user.id,
                        tenantId: user.tenantId,
                        role: user.role === "ADMIN" ? "ADMIN" : "USER"
                    }
                })
            }
        }

        // Add user to the target TenantUser (link only — don't overwrite their active tenant/role)
        const tenantRole = role === "ADMIN" ? "ADMIN" : "USER"
        await db.tenantUser.create({
            data: {
                userId: user.id,
                tenantId,
                role: tenantRole
            }
        })

        revalidatePath("/superadmin")
        return { success: `Successfully linked ${email} to the store. The user can switch to it from their store selector.` }
    } catch (error: any) {
        console.error("Failed to link user:", error)
        return { error: "Failed to link user: " + error.message }
    }
}

export async function getStoresForTenant(tenantId: string) {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Non autorisé" }

        const stores = await db.store.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        })
        return { success: true, stores }
    } catch (error: any) {
        console.error("getStoresForTenant error:", error)
        return { error: error.message || "Erreur interne" }
    }
}

export async function createStoreForTenant(tenantId: string, name: string, address?: string) {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Non autorisé" }

        if (!name.trim()) return { error: "Le nom du magasin est requis" }

        const store = await db.$transaction(async (tx) => {
            const newStore = await tx.store.create({
                data: {
                    name: name.trim(),
                    address: address?.trim() || null,
                    tenantId
                }
            })

            // For all existing products of this tenant, create a StoreProduct entry with 0 stock
            const products = await tx.product.findMany({
                where: { tenantId },
                select: { id: true }
            })

            if (products.length > 0) {
                await tx.storeProduct.createMany({
                    data: products.map(p => ({
                        id: randomUUID(),
                        storeId: newStore.id,
                        productId: p.id,
                        stock: 0,
                        minStock: 0
                    }))
                })
            }

            return newStore
        })

        return { success: true, store }
    } catch (error: any) {
        console.error("createStoreForTenant error:", error)
        return { error: error.message || "Erreur lors de la création" }
    }
}

export async function updateStoreForTenant(storeId: string, name: string, address?: string) {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Non autorisé" }

        if (!name.trim()) return { error: "Le nom du magasin est requis" }

        const store = await db.store.update({
            where: { id: storeId },
            data: {
                name: name.trim(),
                address: address?.trim() || null
            }
        })
        return { success: true, store }
    } catch (error: any) {
        console.error("updateStoreForTenant error:", error)
        return { error: error.message || "Erreur lors de la modification" }
    }
}

export async function deleteStoreForTenant(storeId: string, tenantId?: string) {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Non autorisé" }

        // Prevent deleting if it's the last store of the tenant
        const store = await db.store.findUnique({
            where: { id: storeId },
            select: { tenantId: true }
        })

        if (!store) {
            return { error: "Magasin introuvable" }
        }

        // Verify the store belongs to the expected tenant (prevent cross-tenant deletion)
        if (tenantId && store.tenantId !== tenantId) {
            return { error: "Ce magasin n'appartient pas au tenant spécifié." }
        }

        if (store) {
            const count = await db.store.count({
                where: { tenantId: store.tenantId }
            })
            if (count <= 1) {
                return { error: "Impossible de supprimer le seul magasin d'un tenant. Il doit en rester au moins un." }
            }
        }

        await db.store.delete({
            where: { id: storeId }
        })
        return { success: true }
    } catch (error: any) {
        console.error("deleteStoreForTenant error:", error)
        return { error: error.message || "Erreur lors de la suppression (le magasin contient peut-être des données liées)" }
    }
}

export async function updateTenantDirect(
    tenantId: string,
    values: {
        name: string
        ownerName?: string
        activity?: string
        phone?: string
        email?: string
        address?: string
        wilaya?: string
        commune?: string
        nif?: string
        rc?: string
        nis?: string
    }
) {
    try {
        const session = await auth()
        if (!session?.user?.isSuperadmin) return { error: "Non autorisé" }

        if (!values.name.trim()) return { error: "Le nom de l'espace est requis" }

        const updated = await db.tenant.update({
            where: { id: tenantId },
            data: {
                name: values.name.trim(),
                ownerName: values.ownerName?.trim() || null,
                activity: values.activity?.trim() || null,
                phone: values.phone?.trim() || null,
                email: values.email?.trim() || null,
                address: values.address?.trim() || null,
                wilaya: values.wilaya?.trim() || null,
                commune: values.commune?.trim() || null,
                nif: values.nif?.trim() || null,
                rc: values.rc?.trim() || null,
                nis: values.nis?.trim() || null,
            }
        })

        revalidatePath("/superadmin")
        return { success: "Espace mis à jour avec succès !", tenant: updated }
    } catch (error: any) {
        console.error("updateTenantDirect error:", error)
        return { error: error.message || "Erreur lors de la mise à jour" }
    }
}

