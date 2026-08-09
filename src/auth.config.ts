import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { cookies } from "next/headers"

/**
 * Edge-compatible auth configuration.
 * This file must NOT import Prisma or any Node.js-only modules.
 * It's used by the middleware (Edge Runtime) for JWT session validation.
 */
export default {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            async authorize() {
                // Actual credential validation happens in auth.ts
                // This stub is needed so the provider is registered for Edge
                return null
            }
        })
    ],
    callbacks: {
        // Pass JWT custom fields into session so Edge middleware can read them
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (session.user) {
                // @ts-expect-error custom fields from JWT
                session.user.tenantId = token.tenantId
                // @ts-expect-error custom fields from JWT
                session.user.isSuperadmin = token.isSuperadmin
                // @ts-expect-error custom fields from JWT
                session.user.role = token.role
                // @ts-expect-error custom fields from JWT
                session.user.isBlocked = token.isBlocked
                const isAdminOrSuper = token.role === "ADMIN" || Boolean(token.isSuperadmin);
                session.user.canEdit = isAdminOrSuper ? true : Boolean(token.canEdit)
                session.user.canDelete = isAdminOrSuper ? true : Boolean(token.canDelete)
                // @ts-expect-error custom fields from JWT
                session.user.defaultStoreId = token.defaultStoreId
                // @ts-expect-error custom fields from JWT
                session.user.subscriptionEndsAt = token.subscriptionEndsAt

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

                    // Edge middleware cannot validate store ownership against the
                    // database. The full auth callback validates cookie selections.
                    session.user.defaultStoreId = activeTenantId === token.tenantId
                        ? token.defaultStoreId as string
                        : null
                } catch {
                    // ignore
                }
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    session: { strategy: "jwt" },
} satisfies NextAuthConfig
