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
        }),
        Credentials({
            async authorize() {
                // Actual credential validation happens in auth.ts
                // This stub is needed so the provider is registered for Edge
                return null
            }
        })
    ],
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    session: { strategy: "jwt" },
} satisfies NextAuthConfig
