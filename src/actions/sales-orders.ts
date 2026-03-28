"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"

// Helper: generate receipt number
export async function generateReceiptNumber(type: string, tenantId: string) {
    const prefixMap: Record<string, string> = {
        "QUOTE": "DE",
        "ORDER": "BL",
        "INVOICE": "FA",
        "CREDIT_NOTE": "AV"
    }
    const prefix = prefixMap[type] || "XX"
    const year = new Date().getFullYear()

    // Atomic increment — no race condition possible
    const counter = await db.sequenceCounter.upsert({
        where: {
            tenantId_prefix_year: { tenantId, prefix, year }
        },
        update: {
            lastValue: { increment: 1 }
        },
        create: {
            tenantId,
            prefix,
            year,
            lastValue: 1
        }
    })

    return `${prefix}-${year}/${counter.lastValue.toString().padStart(4, "0")}`
}

// Status transitions that affect stock
const STOCK_STATUSES = ["VALIDATED", "PAID"]
// Status transitions that mean customer owes money
const DEBT_STATUSES = ["VALIDATED"]
const PAID_STATUSES = ["PAID"]

export const createSalesOrder = async (data: {
    customerId: string
    type: string
    status: string
    paymentMethod: string
    subtotal: number
    tvaAmount: number
    stampTax: number
    items: { productId: string; quantity: number; unitPrice: number; tvaRate: number; priceHt: number }[]
    total: number
    receiptNumber?: string
    relatedSalesOrderId?: string
}) => {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId
        if (!tenantId) throw new Error("Tenant ID missing")

        const receiptNumber = await generateReceiptNumber(data.type, tenantId)

        const salesOrder = await db.$transaction(async (tx) => {
            const order = await tx.salesOrder.create({
                data: {
                    tenantId,
                    customerId: data.customerId,
                    type: data.type,
                    status: data.status,
                    paymentMethod: data.paymentMethod,
                    subtotal: data.subtotal,
                    tvaAmount: data.tvaAmount,
                    stampTax: data.stampTax,
                    total: data.total,
                    receiptNumber,
                    relatedSalesOrderId: data.relatedSalesOrderId || undefined,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            tvaRate: item.tvaRate,
                            priceHt: item.priceHt
                        }))
                    }
                }
            })

            const isCreditNote = data.type === "CREDIT_NOTE"

            // Credit Note: RETURN stock (add back)
            if (isCreditNote && STOCK_STATUSES.includes(data.status)) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                if (storeId) {
                    await Promise.all(
                        data.items.map(item =>
                            tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: { increment: item.quantity } }
                            })
                        )
                    );
                }
            }

            // Deduct stock for BON DE LIVRAISON (ORDER) or INVOICE validated/paid
            const shouldDeductStock =
                !isCreditNote &&
                (data.type === "ORDER" || data.type === "INVOICE") &&
                STOCK_STATUSES.includes(data.status)

            if (shouldDeductStock) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                if (storeId) {
                    await Promise.all(
                        data.items.map(item =>
                            tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: { decrement: item.quantity } }
                            })
                        )
                    );
                }
            }

            // Credit Note: DECREMENT customer balance (we owe them)
            if (isCreditNote && DEBT_STATUSES.includes(data.status)) {
                await tx.customer.update({
                    where: { id: data.customerId },
                    data: { balance: { decrement: data.total } }
                })
            }

            // Normal order: Add to customer balance if validated (not yet paid)
            if (!isCreditNote && DEBT_STATUSES.includes(data.status)) {
                await tx.customer.update({
                    where: { id: data.customerId },
                    data: { balance: { increment: data.total } }
                })
            }

            return order
        })

        revalidatePath("/(dashboard)/sales")
        return { success: true, id: salesOrder.id }
    } catch (error) {
        console.error("[CREATE_SALES_ORDER]", error)
        throw new Error(`Erreur: ${error instanceof Error ? error.message : "Unknown"}`)
    }
}

export async function getSalesOrders(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    type?: string,
    from?: string,
    to?: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const where: any = { tenantId }

        if (type && type !== "ALL") {
            where.type = type
        }

        if (search) {
            where.OR = [
                { receiptNumber: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } }
            ]
        }

        if (from || to) {
            where.createdAt = {}
            if (from) where.createdAt.gte = new Date(from)
            if (to) {
                const toDate = new Date(to)
                toDate.setHours(23, 59, 59, 999)
                where.createdAt.lte = toDate
            }
        }

        const [salesOrders, totalCount] = await Promise.all([
            db.salesOrder.findMany({
                where,
                include: { customer: true, items: { include: { product: true } } },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            db.salesOrder.count({ where })
        ])

        return {
            salesOrders: JSON.parse(JSON.stringify(salesOrders)),
            totalCount
        }
    } catch (error) {
        console.error("[GET_SALES_ORDERS]", error)
        return { salesOrders: [], totalCount: 0 }
    }
}

export async function getSalesOrder(id: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const salesOrder = await db.salesOrder.findUnique({
            where: { id },
            include: {
                customer: true,
                items: { include: { product: { include: { barcodes: true } } } }
            }
        })

        return JSON.parse(JSON.stringify(salesOrder))
    } catch (error) {
        console.error("[GET_SALES_ORDER]", error)
        return null
    }
}

export async function getSalesOrderByReceipt(receiptNumber: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const salesOrder = await db.salesOrder.findFirst({
            where: { receiptNumber, tenantId },
            include: {
                customer: true,
                items: { include: { product: { include: { barcodes: true } } } }
            }
        })

        return salesOrder ? JSON.parse(JSON.stringify(salesOrder)) : null
    } catch (error) {
        console.error("[GET_SALES_ORDER_BY_RECEIPT]", error)
        return null
    }
}

export async function searchRecentSalesOrders(query: string, type: string = "ORDER") {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const salesOrders = await db.salesOrder.findMany({
            where: {
                tenantId,
                type,
                OR: [
                    { receiptNumber: { contains: query } },
                    { customer: { name: { contains: query } } }
                ]
            },
            include: {
                customer: true,
                items: { include: { product: { include: { barcodes: true } } } }
            },
            orderBy: { createdAt: "desc" },
            take: 20
        })

        return JSON.parse(JSON.stringify(salesOrders))
    } catch (error) {
        console.error("[SEARCH_RECENT_SALES_ORDERS]", error)
        return []
    }
}

export const updateSalesOrder = async (id: string, data: {
    customerId: string
    type: string
    status: string
    paymentMethod: string
    subtotal: number
    tvaAmount: number
    stampTax: number
    items: { productId: string; quantity: number; unitPrice: number; tvaRate: number; priceHt: number }[]
    total: number
}) => {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const existing = await db.salesOrder.findUnique({ where: { id, tenantId }, include: { items: true } })
        if (!existing) return { error: "Bon introuvable" }
        if (!["DRAFT"].includes(existing.status)) return { error: "Seuls les brouillons peuvent être modifiés" }

        await db.$transaction(async (tx) => {
            await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } })
            await tx.salesOrder.update({
                where: { id },
                data: {
                    customerId: data.customerId,
                    type: data.type,
                    paymentMethod: data.paymentMethod,
                    subtotal: data.subtotal,
                    tvaAmount: data.tvaAmount,
                    stampTax: data.stampTax,
                    total: data.total,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            tvaRate: item.tvaRate,
                            priceHt: item.priceHt
                        }))
                    }
                }
            })
        })

        revalidatePath("/(dashboard)/sales")
        return { success: "Bon modifié" }
    } catch (error) {
        console.error("[UPDATE_SALES_ORDER]", error)
        return { error: "Erreur lors de la modification" }
    }
}

export const updateSalesOrderStatus = async (id: string, newStatus: string) => {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const salesOrder = await db.salesOrder.findUnique({
            where: { id, tenantId },
            include: { items: true }
        })
        if (!salesOrder) throw new Error("Bon introuvable")

        const prevStatus = salesOrder.status
        const total = Number(salesOrder.total)

        await db.$transaction(async (tx) => {
            await tx.salesOrder.update({ where: { id }, data: { status: newStatus } })

            // Stock: deduct when going to VALIDATED/PAID (and not already deducted)
            const hadStock = STOCK_STATUSES.includes(prevStatus)
            const getsStock = STOCK_STATUSES.includes(newStatus)
            const isStockType = salesOrder.type === "ORDER" || salesOrder.type === "INVOICE"

            if (!hadStock && getsStock && isStockType) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                if (storeId) {
                    await Promise.all(
                        salesOrder.items.map(item =>
                            tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: { decrement: item.quantity } }
                            })
                        )
                    );
                }
            }

            // Restore stock if cancelling
            if (hadStock && newStatus === "CANCELLED" && isStockType) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                if (storeId) {
                    await Promise.all(
                        salesOrder.items.map(item =>
                            tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: { increment: item.quantity } }
                            })
                        )
                    );
                }
            }

            // Customer balance:
            // VALIDATED → add to balance (they owe us)
            if (DEBT_STATUSES.includes(newStatus) && !DEBT_STATUSES.includes(prevStatus)) {
                await tx.customer.update({
                    where: { id: salesOrder.customerId },
                    data: { balance: { increment: total } }
                })
            }

            // PAID → clear balance they owed for this order
            if (newStatus === "PAID" && !PAID_STATUSES.includes(prevStatus) && !DEBT_STATUSES.includes(prevStatus)) {
                // Coming straight from DRAFT to PAID without previous debt record — no balance change needed
            }
            // PAID from VALIDATED → reduce balance (they paid)
            if (newStatus === "PAID" && DEBT_STATUSES.includes(prevStatus)) {
                await tx.customer.update({
                    where: { id: salesOrder.customerId },
                    data: { balance: { decrement: total } }
                })
            }

            // CANCELLED from VALIDATED → clear balance
            if (newStatus === "CANCELLED" && DEBT_STATUSES.includes(prevStatus)) {
                await tx.customer.update({
                    where: { id: salesOrder.customerId },
                    data: { balance: { decrement: total } }
                })
            }
        })

        revalidatePath("/(dashboard)/sales")
        return { success: true, id }
    } catch (error) {
        console.error("[UPDATE_SALES_ORDER_STATUS]", error)
        throw new Error("Internal Error")
    }
}

export const deleteSalesOrder = async (id: string) => {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        await db.salesOrder.delete({ where: { id, tenantId } })
        revalidatePath("/(dashboard)/sales")
        return { success: "Supprimé" }
    } catch { return { error: "Erreur" } }
}
