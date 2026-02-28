import { DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
    role: "ADMIN" | "MANAGER" | "CASHIER"
    tenantId: string
    isSuperadmin: boolean
    isBlocked: boolean
    subscriptionEndsAt: Date | null
    canEdit: boolean
    canDelete: boolean
}

declare module "next-auth" {
    interface Session {
        user: ExtendedUser
    }
}
