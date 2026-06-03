import { z } from "zod"

export const LoginSchema = z.object({
    identifier: z.string().min(1, {
        message: "Email ou numéro de téléphone requis",
    }),
    password: z.string().min(1, {
        message: "Password is required",
    }),
})

export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, {
        message: "Minimum 6 characters required",
    }),
    name: z.string().min(1, {
        message: "Name is required",
    }),
    phone: z.string().min(1, {
        message: "Phone number is required",
    }),
})

export const BrandSchema = z.object({
    name: z.string().min(1, {
        message: "Name is required",
    }),
    imageUrl: z.string().optional().nullable(),
    isArchived: z.boolean().default(false).optional(),
    commissionWholesale: z.coerce.number().min(0).default(0).optional(),
    commissionReseller: z.coerce.number().min(0).default(0).optional(),
    commissionRetail: z.coerce.number().min(0).default(0).optional(),
})

export const CategorySchema = z.object({
    name: z.string().min(1, {
        message: "Name is required",
    }),
    imageUrl: z.string().optional().nullable(),
    isArchived: z.boolean().default(false).optional(),
    commissionWholesale: z.coerce.number().min(0).default(0).optional(),
    commissionReseller: z.coerce.number().min(0).default(0).optional(),
    commissionRetail: z.coerce.number().min(0).default(0).optional(),
})

export const ProductSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    images: z.object({ url: z.string() }).array(),
    price: z.coerce.number().min(1),
    tvaRate: z.coerce.number().min(0).max(100).default(0).optional(),
    categoryId: z.string().min(1, { message: "Category is required" }),
    brandId: z.string().min(1, { message: "Brand is required" }),
    colorId: z.string().optional().nullable(),
    sizeId: z.string().optional().nullable(),
    isFeatured: z.boolean().default(false).optional(),
    isArchived: z.boolean().default(false).optional(),
    wholesalePrice: z.coerce.number().optional().nullable(),
    dealerPrice: z.coerce.number().optional().nullable(),
    cost: z.coerce.number().optional().nullable(),
    stock: z.coerce.number().min(0).default(0),
    minStock: z.coerce.number().min(0).default(0),
    barcodes: z.array(z.object({ value: z.string(), label: z.string().optional().nullable() })).optional(),
    description: z.string().optional().nullable(),
})

export const OrderSchema = z.object({
    storeId: z.string(),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.coerce.number(),
        price: z.coerce.number(),
        tvaRate: z.coerce.number().optional().default(0),
        priceHt: z.coerce.number().optional(),
        serialNumber: z.string().optional(),
    })),
    subtotal: z.coerce.number().optional().default(0),
    tvaAmount: z.coerce.number().optional().default(0),
    stampTax: z.coerce.number().optional().default(0),
    total: z.coerce.number(),
    paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "CHECK", "TERM"]).optional().default("CASH"),
    paidAmount: z.coerce.number().optional(),
    customerId: z.string().optional().nullable(),
    accountId: z.string().optional().nullable(),
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).default("COMPLETED"),
    originalOrderId: z.string().optional().nullable(),
    discountAmount: z.coerce.number().optional().default(0),
    loyaltyPointsUsed: z.coerce.number().optional().default(0)
})

export const CustomerSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    taxId: z.string().optional(),
    nif: z.string().refine(val => !val || /^\d{15}$/.test(val), "Le NIF doit comporter exactement 15 chiffres").optional(),
    nis: z.string().refine(val => !val || /^\d{15}$/.test(val), "Le NIS doit comporter exactement 15 chiffres").optional(),
    artImposition: z.string().refine(val => !val || /^\d{11}$/.test(val), "L'article d'imposition doit comporter 11 chiffres").optional(),
    rc: z.string().optional(),
    rib: z.string().optional(),
    barcode: z.string().optional(),
    notes: z.string().optional(),
    clientType: z.enum(["RETAIL", "RESELLER", "WHOLESALE"]).default("RETAIL"),
    balance: z.coerce.number().default(0).optional(),
})

export const SupplierSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    nif: z.string().refine(val => !val || /^\d{15}$/.test(val), "Le NIF doit comporter exactement 15 chiffres").optional(),
    nis: z.string().refine(val => !val || /^\d{15}$/.test(val), "Le NIS doit comporter exactement 15 chiffres").optional(),
    artImposition: z.string().refine(val => !val || /^\d{11}$/.test(val), "L'article d'imposition doit comporter 11 chiffres").optional(),
    rc: z.string().optional(),
    rib: z.string().optional(),
    balance: z.coerce.number().default(0).optional(),
    notes: z.string().optional(),
})

export const TreasuryAccountSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    type: z.enum(["CAISSE", "BANK"]),
    balance: z.coerce.number().min(0).default(0),
    rib: z.string().optional()
})

export const TreasuryTransactionSchema = z.object({
    accountId: z.string(),
    type: z.enum(["CREDIT", "DEBIT"]),
    amount: z.coerce.number().min(0),
    source: z.enum(["SALE", "PURCHASE", "EXPENSE", "MANUAL_IN", "MANUAL_OUT", "TRANSFER", "INITIAL_BALANCE"]),
    referenceId: z.string().optional(),
    description: z.string().optional()
})

export * from "./settings"
