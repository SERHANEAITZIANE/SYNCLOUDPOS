export type CustomerColumn = {
    id: string
    name: string
    phone?: string | null
    email: string
    address: string
    city: string
    taxId: string
    balance?: number
    clientType: "RETAIL" | "RESELLER" | "WHOLESALE"
    createdAt: string
    barcode?: string | null
    loyaltyPoints?: number
}
