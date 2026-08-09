import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { LoginSchema } from "./schemas"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import authConfig from "./auth.config"
import { cookies } from "next/headers"


const { handlers, auth: nextAuth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            async authorize(credentials) {
                const validatedFields = LoginSchema.safeParse(credentials)

                if (validatedFields.success) {
                    const { identifier, password } = validatedFields.data

                    const lowerIdentifier = identifier.trim().toLowerCase()
                    // Allow login by email, username OR phone number (case-insensitive)
                    const user = await db.user.findFirst({
                        where: {
                            OR: [
                                { email: { equals: lowerIdentifier, mode: 'insensitive' } },
                                { username: { equals: lowerIdentifier, mode: 'insensitive' } },
                                { phone: identifier }
                            ]
                        },
                        include: {
                            tenant: true
                        }
                    })

                    if (!user || !user.password) return null

                    const passwordsMatch = await bcrypt.compare(
                        password,
                        user.password
                    )

                    if (passwordsMatch) return user
                }

                return null
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Handle Google OAuth sign-in
            if (account?.provider === "google" && user.email) {
                try {
                    // Check if user already exists
                    const existingUser = await db.user.findUnique({
                        where: { email: user.email }
                    })

                    if (!existingUser) {
                        // Auto-register: create tenant + user
                        const trialEndDate = new Date()
                        trialEndDate.setDate(trialEndDate.getDate() + 7)

                        const name = user.name || user.email.split("@")[0]

                        const newUser = await db.$transaction(async (tx) => {
                            const tenant = await tx.tenant.create({
                                data: {
                                    name: `${name}'s Shop`,
                                    subscriptionEndsAt: trialEndDate,
                                }
                            })

                            const defaultStore = await tx.store.create({
                                data: {
                                    name: "Boutique Principale",
                                    tenantId: tenant.id,
                                }
                            })

                            const randomPassword = "OAUTH_NO_PASSWORD_" + Math.random().toString(36).substring(2) + Date.now()
                            const hashedPassword = await bcrypt.hash(randomPassword, 10)

                            const createdUser = await tx.user.create({
                                data: {
                                    name,
                                    email: user.email,
                                    password: hashedPassword,
                                    tenantId: tenant.id,
                                    role: "ADMIN",
                                    defaultStoreId: defaultStore.id,
                                }
                            })

                            // Seed defaults
                            await tx.treasuryAccount.createMany({
                                data: [
                                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                                ]
                            })

                            await tx.customer.create({
                                data: { name: "DIVERS", clientType: "RETAIL", tenantId: tenant.id }
                            })

                            return createdUser
                        })

                        user.id = newUser.id
                    } else {
                        user.id = existingUser.id
                    }
                } catch (error) {
                    console.error("[GOOGLE_SIGNIN_ERROR]", error)
                    return false
                }
            }
            return true
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                // @ts-expect-error custom fields
                session.user.tenantId = token.tenantId
                // @ts-expect-error custom fields
                session.user.isSuperadmin = token.isSuperadmin
                // @ts-expect-error custom fields
                session.user.subscriptionEndsAt = token.subscriptionEndsAt
                // @ts-expect-error custom fields
                session.user.isBlocked = token.isBlocked
                // @ts-expect-error custom fields
                session.user.role = token.role
                const isAdmin = token.role === "ADMIN" || Boolean(token.isSuperadmin);
                session.user.canEdit = isAdmin ? true : Boolean(token.canEdit)
                session.user.canDelete = isAdmin ? true : Boolean(token.canDelete)
                // @ts-expect-error custom fields
                session.user.defaultStoreId = token.defaultStoreId
                // @ts-expect-error custom fields
                session.user.username = token.username
            } else if (token.sub && session.user && !token.role) {
                // Backward compatibility for users with old session cookies
                // If the token lacks a role, we fetch it dynamically from the DB
                const existingUser = await db.user.findUnique({
                    where: { id: token.sub },
                    include: { tenant: true }
                });
                if (existingUser) {
                    session.user.tenantId = existingUser.tenantId;
                    session.user.isSuperadmin = existingUser.isSuperadmin;
                    // @ts-expect-error custom fields
                    session.user.role = existingUser.role;
                    const isAdmin = existingUser.role === "ADMIN" || existingUser.isSuperadmin;
                    session.user.canEdit = isAdmin ? true : Boolean(existingUser.canEdit);
                    session.user.canDelete = isAdmin ? true : Boolean(existingUser.canDelete);
                    session.user.subscriptionEndsAt = existingUser.tenant?.subscriptionEndsAt;
                    session.user.isBlocked = existingUser.tenant?.isBlocked;
                    session.user.defaultStoreId = existingUser.defaultStoreId;
                    // @ts-expect-error custom fields
                    session.user.username = existingUser.username;
                }
            }
            // Store and tenant selection override (cookie-based, browser-session specific)
            if (session.user) {
                try {
                    const cookieStore = await cookies()
                    const selectedTenantId = cookieStore.get("selected_tenant_id")?.value
                    const allowedTenants = (token.allowedTenantIds as string[]) || [token.tenantId as string];
                    
                    let activeTenantId = (token.tenantId as string) || session.user.tenantId;
                    if (selectedTenantId && (allowedTenants.includes(selectedTenantId) || token.isSuperadmin)) {
                        activeTenantId = selectedTenantId;
                    }
                    session.user.tenantId = activeTenantId;

                    const tenantRoles = (token.tenantRoles as Record<string, string> | undefined) || {}
                    if (!token.isSuperadmin && activeTenantId !== token.tenantId) {
                        const membershipRole = tenantRoles[activeTenantId]
                        session.user.role = membershipRole === "ADMIN"
                            ? "ADMIN"
                            : membershipRole === "MANAGER"
                                ? "MANAGER"
                                : "CASHIER"
                        session.user.canEdit = membershipRole === "ADMIN" || membershipRole === "MANAGER"
                        session.user.canDelete = membershipRole === "ADMIN"
                    }

                    // Never trust a store-selection cookie without checking that
                    // the store belongs to the active tenant.
                    const selectedStoreId = cookieStore.get("selected_store_id")?.value
                    const preferredStoreIds = [
                        selectedStoreId,
                        activeTenantId === token.tenantId ? token.defaultStoreId as string | undefined : undefined,
                    ].filter((id): id is string => Boolean(id))

                    const activeTenant = await db.tenant.findUnique({
                        where: { id: activeTenantId },
                        select: { subscriptionEndsAt: true, isBlocked: true }
                    })
                    if (!activeTenant) return session

                    session.user.subscriptionEndsAt = activeTenant.subscriptionEndsAt
                    session.user.isBlocked = activeTenant.isBlocked

                    let activeStore = preferredStoreIds.length > 0
                        ? await db.store.findFirst({
                            where: { id: { in: preferredStoreIds }, tenantId: activeTenantId },
                            select: { id: true }
                        })
                        : null
                    if (!activeStore) {
                        activeStore = await db.store.findFirst({
                            where: { tenantId: activeTenantId },
                            select: { id: true },
                            orderBy: { createdAt: "asc" }
                        })
                    }
                    session.user.defaultStoreId = activeStore?.id || null
                } catch {
                    // ignore
                }
            }

            // Superadmin impersonation override (cookie-based, never touches DB)
            if (session.user?.isSuperadmin) {
                try {
                    const cookieStore = await cookies()
                    const impersonatedTenantId = cookieStore.get("impersonated_tenant_id")?.value
                    if (impersonatedTenantId) {
                        session.user.tenantId = impersonatedTenantId
                        const impersonatedStoreId = cookieStore.get("impersonated_store_id")?.value
                        if (impersonatedStoreId) {
                            session.user.defaultStoreId = impersonatedStoreId
                        }
                        // Override subscription/block status to match the impersonated tenant
                        const impersonatedTenant = await db.tenant.findUnique({
                            where: { id: impersonatedTenantId },
                            select: { subscriptionEndsAt: true, isBlocked: true }
                        })
                        if (impersonatedTenant) {
                            session.user.subscriptionEndsAt = impersonatedTenant.subscriptionEndsAt
                            session.user.isBlocked = impersonatedTenant.isBlocked
                        }
                        // @ts-expect-error custom fields
                        session.user.isImpersonating = true
                    }
                } catch {
                    // Cookies may not be available in some contexts (e.g. API routes), silently ignore
                }
            }
            return session
        },
        async jwt({ token, user, trigger, session }) {
            // 1. Initial sign-in: user object is available
            if (user) {
                const dbUser = user as any;
                let tenant = dbUser.tenant;

                // Fallback: If tenant is not included (e.g. from Google OAuth sign-in)
                if (!tenant && dbUser.tenantId) {
                    const foundUser = await db.user.findUnique({
                        where: { id: dbUser.id },
                        include: { tenant: true }
                    });
                    if (foundUser) {
                        dbUser.role = foundUser.role;
                        dbUser.isSuperadmin = foundUser.isSuperadmin;
                        dbUser.canEdit = foundUser.canEdit;
                        dbUser.canDelete = foundUser.canDelete;
                        dbUser.defaultStoreId = foundUser.defaultStoreId;
                        dbUser.username = foundUser.username;
                        tenant = foundUser.tenant;
                    }
                }

                token.tenantId = dbUser.tenantId;
                token.isSuperadmin = dbUser.isSuperadmin;
                token.role = dbUser.role;
                const isAdmin = dbUser.role === "ADMIN" || Boolean(dbUser.isSuperadmin);
                token.canEdit = isAdmin ? true : Boolean(dbUser.canEdit);
                token.canDelete = isAdmin ? true : Boolean(dbUser.canDelete);
                token.subscriptionEndsAt = tenant?.subscriptionEndsAt;
                token.isBlocked = tenant?.isBlocked;
                token.defaultStoreId = dbUser.defaultStoreId;
                token.username = dbUser.username;

                // Load all allowed tenant IDs for this user
                const allowedTenantIds = [dbUser.tenantId];
                if (dbUser.id) {
                    const memberships = await db.tenantUser.findMany({
                        where: { userId: dbUser.id },
                        select: { tenantId: true, role: true }
                    });
                    const tenantRoles: Record<string, string> = {};
                    memberships.forEach((m: { tenantId: string, role: string }) => {
                        if (!allowedTenantIds.includes(m.tenantId)) {
                            allowedTenantIds.push(m.tenantId);
                        }
                        tenantRoles[m.tenantId] = m.role;
                    });
                    token.tenantRoles = tenantRoles;
                }
                token.allowedTenantIds = allowedTenantIds;
            }

            // 2. Dynamic updates
            if (trigger === "update" && session) {
                if (session.defaultStoreId !== undefined) {
                    token.defaultStoreId = session.defaultStoreId;
                }
                if (session.isBlocked !== undefined) {
                    token.isBlocked = session.isBlocked;
                }
                if (session.subscriptionEndsAt !== undefined) {
                    token.subscriptionEndsAt = session.subscriptionEndsAt;
                }
                if (session.username !== undefined) {
                    token.username = session.username;
                }
            }

            // 2.5 Periodic user & tenant sync: refresh role, permissions, subscription, and block status from DB
            if (token.sub) {
                const currentUser = await db.user.findUnique({
                    where: { id: token.sub },
                    select: {
                        role: true,
                        isSuperadmin: true,
                        canEdit: true,
                        canDelete: true,
                        tenant: { select: { subscriptionEndsAt: true, isBlocked: true } },
                        tenantUsers: { select: { tenantId: true, role: true } }
                    }
                });
                if (currentUser) {
                    token.role = currentUser.role;
                    token.isSuperadmin = currentUser.isSuperadmin;
                    const isAdmin = currentUser.role === "ADMIN" || Boolean(currentUser.isSuperadmin);
                    token.canEdit = isAdmin ? true : Boolean(currentUser.canEdit);
                    token.canDelete = isAdmin ? true : Boolean(currentUser.canDelete);
                    token.subscriptionEndsAt = currentUser.tenant?.subscriptionEndsAt;
                    token.isBlocked = currentUser.tenant?.isBlocked;
                    token.allowedTenantIds = [
                        token.tenantId as string,
                        ...currentUser.tenantUsers.map(m => m.tenantId)
                    ].filter((id, index, ids) => Boolean(id) && ids.indexOf(id) === index);
                    token.tenantRoles = Object.fromEntries(
                        currentUser.tenantUsers.map(m => [m.tenantId, m.role])
                    );
                }
            }

            // 3. Fallback for legacy tokens if they lack tenantId
            if ((!token.tenantId || !token.allowedTenantIds) && token.sub) {
                const foundUser = await db.user.findUnique({
                    where: { id: token.sub },
                    include: { tenant: true }
                });
                if (foundUser) {
                    token.tenantId = foundUser.tenantId;
                    token.isSuperadmin = foundUser.isSuperadmin;
                    token.role = foundUser.role;
                    token.canEdit = foundUser.role === "ADMIN" ? true : foundUser.canEdit;
                    token.canDelete = foundUser.role === "ADMIN" ? true : foundUser.canDelete;
                    token.subscriptionEndsAt = foundUser.tenant?.subscriptionEndsAt;
                    token.isBlocked = foundUser.tenant?.isBlocked;
                    token.defaultStoreId = foundUser.defaultStoreId;
                    token.username = foundUser.username;

                    const allowedTenantIds = [foundUser.tenantId];
                    const memberships = await db.tenantUser.findMany({
                        where: { userId: foundUser.id },
                        select: { tenantId: true, role: true }
                    });
                    const tenantRoles: Record<string, string> = {};
                    memberships.forEach((m: { tenantId: string, role: string }) => {
                        if (!allowedTenantIds.includes(m.tenantId)) {
                            allowedTenantIds.push(m.tenantId);
                        }
                        tenantRoles[m.tenantId] = m.role;
                    });
                    token.tenantRoles = tenantRoles;
                    token.allowedTenantIds = allowedTenantIds;
                    token.tenantRoles = tenantRoles;
                }
            }

            return token;
        }
    },
})

export { handlers, signIn, signOut }

export const auth = async (...args: any[]) => {
    if (process.env.NODE_ENV === "test" && process.env.AUDIT_TENANT_ID) {
        return {
            user: {
                id: process.env.AUDIT_USER_ID || "mock-user-id",
                tenantId: process.env.AUDIT_TENANT_ID,
                role: "ADMIN",
                name: "Audit Runner",
                isSuperadmin: true,
                defaultStoreId: process.env.AUDIT_STORE_ID || "mock-store-id"
            }
        } as any
    }
    return (nextAuth as any)(...args)
}
