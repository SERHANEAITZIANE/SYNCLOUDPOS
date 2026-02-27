import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { LoginSchema } from "./schemas"
import { getUserById } from "@/data/user"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"


export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            async authorize(credentials) {
                const validatedFields = LoginSchema.safeParse(credentials)

                if (validatedFields.success) {
                    const { email, password } = validatedFields.data

                    const user = await db.user.findUnique({
                        where: { email }
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
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    callbacks: {
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
            } else if (token.sub && session.user && !token.role) {
                // Backward compatibility for users with old session cookies
                // If the token lacks a role, we fetch it dynamically from the DB
                const existingUser = await db.user.findUnique({
                    where: { id: token.sub },
                    include: { tenant: true }
                });
                if (existingUser) {
                    // @ts-expect-error custom fields
                    session.user.tenantId = existingUser.tenantId;
                    // @ts-expect-error custom fields
                    session.user.isSuperadmin = existingUser.isSuperadmin;
                    // @ts-expect-error custom fields
                    session.user.role = existingUser.role;
                    // @ts-expect-error custom fields
                    session.user.subscriptionEndsAt = existingUser.tenant?.subscriptionEndsAt;
                    // @ts-expect-error custom fields
                    session.user.isBlocked = existingUser.tenant?.isBlocked;
                }
            }
            return session
        },
        async jwt({ token }) {
            if (!token.sub) return token;

            const existingUser = await db.user.findUnique({
                where: { id: token.sub },
                include: { tenant: true }
            });

            if (!existingUser) return token;

            token.tenantId = existingUser.tenantId;
            token.isSuperadmin = existingUser.isSuperadmin;
            token.role = existingUser.role;
            token.subscriptionEndsAt = existingUser.tenant.subscriptionEndsAt;
            token.isBlocked = existingUser.tenant.isBlocked;
            return token
        }
    },
    session: { strategy: "jwt" },
})
