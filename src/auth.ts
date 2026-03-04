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
                    const { identifier, password } = validatedFields.data

                    // Allow login by email OR phone number
                    const user = await db.user.findFirst({
                        where: {
                            OR: [
                                { email: identifier },
                                { phone: identifier }
                            ]
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
                // @ts-expect-error custom fields
                session.user.canEdit = token.role === "ADMIN" ? true : token.canEdit
                // @ts-expect-error custom fields
                session.user.canDelete = token.role === "ADMIN" ? true : token.canDelete
                // @ts-expect-error custom fields
                session.user.defaultStoreId = token.defaultStoreId
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
                    session.user.canEdit = existingUser.role === "ADMIN" ? true : existingUser.canEdit;
                    session.user.canDelete = existingUser.role === "ADMIN" ? true : existingUser.canDelete;
                    session.user.subscriptionEndsAt = existingUser.tenant?.subscriptionEndsAt;
                    session.user.isBlocked = existingUser.tenant?.isBlocked;
                    session.user.defaultStoreId = existingUser.defaultStoreId;
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
            token.canEdit = existingUser.role === "ADMIN" ? true : existingUser.canEdit;
            token.canDelete = existingUser.role === "ADMIN" ? true : existingUser.canDelete;
            token.subscriptionEndsAt = existingUser.tenant.subscriptionEndsAt;
            token.isBlocked = existingUser.tenant.isBlocked;
            token.defaultStoreId = existingUser.defaultStoreId;
            return token
        }
    },
    session: { strategy: "jwt" },
})
