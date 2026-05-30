import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { LoginSchema } from "./schemas"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import authConfig from "./auth.config"


export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            checks: ["none"],
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

                        const tenant = await db.tenant.create({
                            data: {
                                name: `${name}'s Shop`,
                                subscriptionEndsAt: trialEndDate,
                            }
                        })

                        const defaultStore = await db.store.create({
                            data: {
                                name: "Boutique Principale",
                                tenantId: tenant.id,
                            }
                        })

                        const newUser = await db.user.create({
                            data: {
                                name,
                                email: user.email,
                                password: "", // No password for OAuth users
                                tenantId: tenant.id,
                                role: "ADMIN",
                                defaultStoreId: defaultStore.id,
                            }
                        })

                        // Seed defaults
                        await Promise.all([
                            db.treasuryAccount.createMany({
                                data: [
                                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                                ]
                            }),
                            db.customer.create({
                                data: { name: "DIVERS", clientType: "RETAIL", tenantId: tenant.id }
                            })
                        ])

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
                // @ts-expect-error custom fields
                session.user.canEdit = token.role === "ADMIN" ? true : token.canEdit
                // @ts-expect-error custom fields
                session.user.canDelete = token.role === "ADMIN" ? true : token.canDelete
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
                    session.user.canEdit = existingUser.role === "ADMIN" ? true : existingUser.canEdit;
                    session.user.canDelete = existingUser.role === "ADMIN" ? true : existingUser.canDelete;
                    session.user.subscriptionEndsAt = existingUser.tenant?.subscriptionEndsAt;
                    session.user.isBlocked = existingUser.tenant?.isBlocked;
                    session.user.defaultStoreId = existingUser.defaultStoreId;
                    // @ts-expect-error custom fields
                    session.user.username = existingUser.username;
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
            token.subscriptionEndsAt = existingUser.tenant?.subscriptionEndsAt;
            token.isBlocked = existingUser.tenant?.isBlocked;
            token.defaultStoreId = existingUser.defaultStoreId;
            token.username = existingUser.username;
            return token
        }
    },
})
