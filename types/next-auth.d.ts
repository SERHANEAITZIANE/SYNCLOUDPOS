import { DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
    role: "ADMIN" | "MANAGER" | "CASHIER" | "STOCK_MANAGER" | "ACCOUNTANT"
    tenantId: string
    isSuperadmin: boolean
    isBlocked: boolean
    subscriptionEndsAt: Date | null
    canEdit: boolean
    canDelete: boolean
    defaultStoreId: string | null
}

declare module "next-auth" {
    interface Session {
        user: ExtendedUser
    }
}
