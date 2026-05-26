import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

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
            checks: ["none"],
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
                // @ts-expect-error custom fields from JWT
                session.user.canEdit = token.canEdit
                // @ts-expect-error custom fields from JWT
                session.user.canDelete = token.canDelete
                // @ts-expect-error custom fields from JWT
                session.user.defaultStoreId = token.defaultStoreId
                // @ts-expect-error custom fields from JWT
                session.user.subscriptionEndsAt = token.subscriptionEndsAt
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
