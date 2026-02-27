export type CustomerColumn = {
    id: string
    name: string
    phone: string
    email: string
    address: string
    city: string
    taxId: string
    balance?: number
    clientType: "RETAIL" | "RESELLER" | "WHOLESALE"
    createdAt: string
}
