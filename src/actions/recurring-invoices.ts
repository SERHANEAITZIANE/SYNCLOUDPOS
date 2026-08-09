"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { addMonths, addWeeks, addYears } from "date-fns"
import cacheMonitor from "@/lib/cache-monitor"
import { hasPermission } from "@/lib/rbac"
import * as z from "zod"

export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "YEARLY"

export interface RecurringInvoiceInput {
    customerId: string
    frequency: RecurringFrequency
    nextRunDate: Date
    items: {
        productId: string
        quantity: number
        unitPrice: number
    }[]
}

const RecurringInvoiceSchema = z.object({
    customerId: z.string().min(1),
    frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
    nextRunDate: z.coerce.date(),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        // Kept for backwards-compatible clients. Pricing is loaded from the DB.
        unitPrice: z.coerce.number().nonnegative(),
    })).min(1),
})

function getNextRunDate(currentDate: Date, frequency: string) {
    if (frequency === "WEEKLY") return addWeeks(currentDate, 1)
    if (frequency === "YEARLY") return addYears(currentDate, 1)
    return addMonths(currentDate, 1)
}

function getNextFutureRunDate(currentDate: Date, frequency: string, now: Date) {
    let next = getNextRunDate(currentDate, frequency)
    while (next <= now) {
        next = getNextRunDate(next, frequency)
    }
    return next
}

function getCustomerPrice(product: {
    price: unknown
    dealerPrice: unknown
    wholesalePrice: unknown
}, clientType: string) {
    if (clientType === "WHOLESALE" && product.wholesalePrice != null) {
        return Number(product.wholesalePrice)
    }
    if (clientType === "RESELLER" && product.dealerPrice != null) {
        return Number(product.dealerPrice)
    }
    return Number(product.price)
}

/** Create a tenant-scoped recurring invoice schedule with authoritative prices. */
export async function createRecurringInvoice(input: RecurringInvoiceInput) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }
    if (!(await hasPermission("recurring_invoices:create"))) {
        return { error: "Acc?s refus?" }
    }

    const parsed = RecurringInvoiceSchema.safeParse(input)
    if (!parsed.success) {
        return { error: "Donn?es de facturation r?currente invalides." }
    }

    const productIds = [...new Set(parsed.data.items.map(item => item.productId))]
    const [customer, products] = await Promise.all([
        db.customer.findFirst({
            where: { id: parsed.data.customerId, tenantId },
            select: { id: true, clientType: true }
        }),
        db.product.findMany({
            where: { id: { in: productIds }, tenantId },
            select: {
                id: true,
                price: true,
                dealerPrice: true,
                wholesalePrice: true,
                tvaRate: true,
            }
        })
    ])

    if (!customer || products.length !== productIds.length) {
        return { error: "Client ou produit introuvable pour ce tenant." }
    }

    const productMap = new Map(products.map(product => [product.id, product]))
    const authoritativeItems = parsed.data.items.map(item => {
        const product = productMap.get(item.productId)!
        const unitPrice = getCustomerPrice(product, customer.clientType)
        const subTotal = item.quantity * unitPrice
        const tax = subTotal * (Number(product.tvaRate) / 100)
        return { ...item, unitPrice, subTotal, tax }
    })
    const subTotal = authoritativeItems.reduce((sum, item) => sum + item.subTotal, 0)
    const tax = authoritativeItems.reduce((sum, item) => sum + item.tax, 0)
    const total = subTotal + tax

    try {
        const recurring = await db.recurringInvoice.create({
            data: {
                tenantId,
                customerId: customer.id,
                frequency: parsed.data.frequency,
                nextRunDate: parsed.data.nextRunDate,
                subTotal,
                tax,
                total,
                items: {
                    create: authoritativeItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        subTotal: item.subTotal
                    }))
                }
            }
        })
        revalidatePath("/[locale]/(dashboard)/recurring-invoices")
        return { data: recurring }
    } catch (error) {
        console.error("createRecurringInvoice error:", error)
        return { error: "?chec de la cr?ation de la facture r?currente." }
    }
}

export async function getRecurringInvoices() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId || !(await hasPermission("recurring_invoices:read"))) return []

    return db.recurringInvoice.findMany({
        where: { tenantId },
        include: {
            customer: { select: { name: true } },
            _count: { select: { generatedOrders: true } }
        },
        orderBy: { nextRunDate: "asc" }
    })
}

export async function toggleRecurringInvoiceStatus(id: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }
    if (!(await hasPermission("recurring_invoices:update"))) {
        return { error: "Acc?s refus?" }
    }

    const invoice = await db.recurringInvoice.findFirst({ where: { id, tenantId } })
    if (!invoice) return { error: "Not found" }

    await db.recurringInvoice.update({
        where: { id: invoice.id },
        data: { status: invoice.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }
    })

    revalidatePath("/[locale]/(dashboard)/recurring-invoices")
    return { success: true }
}

/**
 * Claim and generate due schedules atomically. The conditional schedule update
 * prevents two cron workers from producing the same billing occurrence.
 */
export async function processDueRecurringInvoices() {
    const now = new Date()
    const dueInvoices = await db.recurringInvoice.findMany({
        where: {
            status: "ACTIVE",
            nextRunDate: { lte: now }
        },
        include: { items: true }
    })

    let processedCount = 0

    for (const invoice of dueInvoices) {
        try {
            const scheduledRunDate = new Date(invoice.nextRunDate)
            const nextRunDate = getNextFutureRunDate(scheduledRunDate, invoice.frequency, now)

            const processed = await db.$transaction(async tx => {
                const claim = await tx.recurringInvoice.updateMany({
                    where: {
                        id: invoice.id,
                        status: "ACTIVE",
                        nextRunDate: scheduledRunDate
                    },
                    data: {
                        lastRunDate: now,
                        nextRunDate
                    }
                })
                if (claim.count !== 1) return false

                const productIds = [...new Set(invoice.items.map(item => item.productId))]
                const [customer, products, store] = await Promise.all([
                    tx.customer.findFirst({
                        where: { id: invoice.customerId, tenantId: invoice.tenantId },
                        select: { id: true }
                    }),
                    tx.product.findMany({
                        where: { id: { in: productIds }, tenantId: invoice.tenantId },
                        select: {
                            id: true,
                            cost: true,
                            tvaRate: true,
                            stock: true,
                            minStock: true,
                            isService: true,
                        }
                    }),
                    tx.store.findFirst({
                        where: { tenantId: invoice.tenantId },
                        select: { id: true },
                        orderBy: { createdAt: "asc" }
                    })
                ])

                if (!customer || products.length !== productIds.length) {
                    throw new Error("Recurring invoice contains cross-tenant or missing records")
                }

                const year = now.getFullYear()
                const counter = await tx.sequenceCounter.upsert({
                    where: {
                        tenantId_prefix_year: {
                            tenantId: invoice.tenantId,
                            prefix: "BL",
                            year
                        }
                    },
                    update: { lastValue: { increment: 1 } },
                    create: {
                        tenantId: invoice.tenantId,
                        prefix: "BL",
                        year,
                        lastValue: 1
                    }
                })
                const receiptNumber = "BL-" + year + "/" + counter.lastValue.toString().padStart(4, "0")
                const idempotencyKey = "recurring:" + invoice.id + ":" + scheduledRunDate.toISOString()
                const productMap = new Map(products.map(product => [product.id, product]))

                const order = await tx.salesOrder.create({
                    data: {
                        tenantId: invoice.tenantId,
                        storeId: store?.id,
                        customerId: customer.id,
                        type: "ORDER",
                        status: "VALIDATED",
                        subtotal: invoice.subTotal,
                        tvaAmount: invoice.tax,
                        total: invoice.total,
                        receiptNumber,
                        recurringInvoiceId: invoice.id,
                        idempotencyKey,
                        paymentMethod: "TERM",
                        source: "B2B",
                        notes: "Generated from recurring invoice " + invoice.id,
                        items: {
                            create: invoice.items.map(item => {
                                const product = productMap.get(item.productId)!
                                return {
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    unitPrice: item.unitPrice,
                                    tvaRate: product.tvaRate,
                                    priceHt: item.unitPrice,
                                    costAtSale: product.cost,
                                }
                            })
                        }
                    }
                })

                if (store) {
                    for (const item of invoice.items) {
                        const product = productMap.get(item.productId)!
                        if (product.isService) continue

                        const existingStoreProduct = await tx.storeProduct.findUnique({
                            where: {
                                storeId_productId: {
                                    storeId: store.id,
                                    productId: item.productId
                                }
                            },
                            select: { stock: true, minStock: true }
                        })
                        const stockBefore = existingStoreProduct?.stock ?? product.stock

                        await tx.storeProduct.upsert({
                            where: {
                                storeId_productId: {
                                    storeId: store.id,
                                    productId: item.productId
                                }
                            },
                            update: { stock: { decrement: item.quantity } },
                            create: {
                                storeId: store.id,
                                productId: item.productId,
                                stock: stockBefore - item.quantity,
                                minStock: existingStoreProduct?.minStock ?? product.minStock
                            }
                        })
                        await tx.product.updateMany({
                            where: { id: item.productId, tenantId: invoice.tenantId },
                            data: { stock: { decrement: item.quantity } }
                        })
                        await tx.stockMovement.create({
                            data: {
                                tenantId: invoice.tenantId,
                                storeId: store.id,
                                productId: item.productId,
                                type: "SALE",
                                quantity: -item.quantity,
                                stockBefore,
                                stockAfter: stockBefore - item.quantity,
                                referenceId: order.id,
                                reason: "Facture r?currente " + receiptNumber
                            }
                        })
                    }
                }

                const customerUpdate = await tx.customer.updateMany({
                    where: { id: customer.id, tenantId: invoice.tenantId },
                    data: { balance: { increment: invoice.total } }
                })
                if (customerUpdate.count !== 1) {
                    throw new Error("Recurring invoice customer is no longer available")
                }

                return true
            })

            if (!processed) continue

            await cacheMonitor.invalidateCache("products:" + invoice.tenantId)
            await cacheMonitor.invalidateCache("pos-products:" + invoice.tenantId)
            processedCount++
        } catch (error) {
            console.error("Failed to process recurring invoice " + invoice.id + ":", error)
        }
    }

    return { processed: processedCount }
}

