"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"
import { logAudit } from "./audit-log"
import cacheMonitor from "@/lib/cache-monitor"
import { SalesOrderType, SalesOrderStatus, PaymentMethod } from "@prisma/client"

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
    items: { productId: string; quantity: number; unitPrice: number; tvaRate: number; priceHt: number; serialNumber?: string }[]
    total: number
    receiptNumber?: string
    relatedSalesOrderId?: string
    createdAt?: Date
}) => {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId
        if (!tenantId) throw new Error("Tenant ID missing")

        const receiptNumber = await generateReceiptNumber(data.type, tenantId)

        const salesOrder = await db.$transaction(async (tx) => {
            const customer = await tx.customer.findFirst({ where: { id: data.customerId, tenantId } });
            if (!customer) throw new Error("Client introuvable ou non autorisé");

            const order = await tx.salesOrder.create({
                data: {
                    tenantId,
                    userId: session.user.id,
                    customerId: data.customerId,
                    type: data.type as SalesOrderType,
                    status: data.status as SalesOrderStatus,
                    paymentMethod: data.paymentMethod as PaymentMethod,
                    subtotal: data.subtotal,
                    tvaAmount: data.tvaAmount,
                    stampTax: data.stampTax,
                    total: data.total,
                    receiptNumber,
                    relatedSalesOrderId: data.relatedSalesOrderId || undefined,
                    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            tvaRate: item.tvaRate,
                            priceHt: item.priceHt,
                            serialNumber: item.serialNumber || null
                        }))
                    }
                }
            })

            const isCreditNote = data.type === "CREDIT_NOTE"
            const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;

            // Fetch stocks before updates to record stockBefore and stockAfter
            const productIds = data.items.map(i => i.productId);
            const productsWithStock = await tx.product.findMany({
                where: { id: { in: productIds } },
                include: { storeProducts: { where: { storeId: storeId || "" } } }
            });
            const stockMap = new Map(productsWithStock.map(p => {
                const sp = p.storeProducts[0];
                return [
                    p.id,
                    sp?.stock !== undefined && sp?.stock !== null ? sp.stock : 0
                ];
            }));

            // Credit Note: RETURN stock (add back)
            if (isCreditNote && STOCK_STATUSES.includes(data.status)) {
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

                await Promise.all(
                    data.items.map(item =>
                        tx.product.updateMany({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        })
                    )
                );

                // Track running stock per product to handle duplicates
                const runningStockMapCN = new Map<string, number>();
                data.items.forEach(item => {
                    if (!runningStockMapCN.has(item.productId)) {
                        runningStockMapCN.set(item.productId, stockMap.get(item.productId) || 0);
                    }
                });

                await tx.stockMovement.createMany({
                    data: data.items.map(item => {
                        const stockBefore = runningStockMapCN.get(item.productId) || 0;
                        const stockAfter = stockBefore + item.quantity;
                        runningStockMapCN.set(item.productId, stockAfter);
                        return {
                            productId: item.productId,
                            type: "RETURN",
                            quantity: item.quantity,
                            stockBefore,
                            stockAfter,
                            referenceId: order.id,
                            reason: `Avoir N° ${receiptNumber}`,
                            userId: session.user.id,
                            tenantId,
                            storeId,
                            createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                        };
                    })
                });
            }

            // Deduct stock for BON DE LIVRAISON (ORDER) or INVOICE validated/paid
            const shouldDeductStock =
                !isCreditNote &&
                (data.type === "ORDER" || data.type === "INVOICE") &&
                STOCK_STATUSES.includes(data.status)

            if (shouldDeductStock) {
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

                await Promise.all(
                    data.items.map(item =>
                        tx.product.updateMany({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } }
                        })
                    )
                );

                // Track running stock per product to handle duplicates
                const runningStockMapSale = new Map<string, number>();
                data.items.forEach(item => {
                    if (!runningStockMapSale.has(item.productId)) {
                        runningStockMapSale.set(item.productId, stockMap.get(item.productId) || 0);
                    }
                });

                await tx.stockMovement.createMany({
                    data: data.items.map(item => {
                        const stockBefore = runningStockMapSale.get(item.productId) || 0;
                        const stockAfter = stockBefore - item.quantity;
                        runningStockMapSale.set(item.productId, stockAfter);
                        return {
                            productId: item.productId,
                            type: "SALE",
                            quantity: -item.quantity,
                            stockBefore,
                            stockAfter,
                            referenceId: order.id,
                            reason: `Vente N° ${receiptNumber}`,
                            userId: session.user.id,
                            tenantId,
                            storeId,
                            createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                        };
                    })
                });
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
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        logAudit({ action: "CREATE", entity: "SALES_ORDER", entityId: salesOrder.id, description: `${data.type} créé: ${receiptNumber} — ${data.total} DA`, after: { receiptNumber, type: data.type, total: data.total } }).catch(() => null)
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
    to?: string,
    status?: string,
    customerId?: string
) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const where: any = { tenantId }

        if (type && type !== "ALL") {
            where.type = type as SalesOrderType
        }

        if (status && status !== "ALL") {
            where.status = status as SalesOrderStatus
        }

        if (search) {
            where.OR = [
                { receiptNumber: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } }
            ]
        }

        if (customerId && customerId !== "ALL") {
            where.customerId = customerId
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

        const [salesOrders, totalCount, stats, itemsStats] = await Promise.all([
            db.salesOrder.findMany({
                where,
                include: { customer: true, items: { include: { product: true } } },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            db.salesOrder.count({ where }),
            db.salesOrder.aggregate({
                where,
                _sum: {
                    total: true,
                    amountPaid: true,
                }
            }),
            db.salesOrderItem.aggregate({
                where: {
                    salesOrder: where
                },
                _sum: {
                    quantity: true
                }
            })
        ])

        const totalSalesAmount = Number(stats._sum.total) || 0
        const totalPaidAmount = Number(stats._sum.amountPaid) || 0
        const totalUnpaidAmount = Math.max(0, totalSalesAmount - totalPaidAmount)
        const totalItemsSold = Number(itemsStats._sum.quantity) || 0

        return {
            salesOrders: JSON.parse(JSON.stringify(salesOrders)),
            totalCount,
            summary: {
                totalSalesAmount,
                totalPaidAmount,
                totalUnpaidAmount,
                totalItemsSold
            }
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
        const tenantId = session.user.tenantId

        const salesOrder = await db.salesOrder.findFirst({
            where: { id, tenantId },
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
            where: { receiptNumber, tenantId, status: { not: "CANCELLED" } },
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
                type: type as SalesOrderType,
                status: { not: "CANCELLED" },
                OR: [
                    { receiptNumber: { contains: query, mode: "insensitive" } },
                    { customer: { name: { contains: query, mode: "insensitive" } } }
                ]
            },
            include: {
                customer: true,
                items: { include: { product: { include: { barcodes: true } } } }
            },
            orderBy: { createdAt: "desc" },
            take: 100
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
    items: { productId: string; quantity: number; unitPrice: number; tvaRate: number; priceHt: number; serialNumber?: string }[]
    total: number
    createdAt?: Date
}) => {
    await checkSubscription();
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const tenantId = session.user.tenantId

        const existing = await db.salesOrder.findFirst({ where: { id, tenantId }, include: { items: true } })
        if (!existing) return { error: "Bon introuvable" }

        const newDate = data.createdAt ? new Date(data.createdAt) : undefined

        if (existing.status !== "DRAFT") {
            // ONLY modify the date!
            if (!newDate) {
                return { error: "Seuls les brouillons peuvent être modifiés" }
            }
            await db.$transaction(async (tx) => {
                await tx.salesOrder.update({
                    where: { id },
                    data: { createdAt: newDate }
                })
                await tx.treasuryTransaction.updateMany({
                    where: { referenceId: id, source: "SALE", tenantId },
                    data: {
                        date: newDate,
                        createdAt: newDate
                    }
                })
                await tx.stockMovement.updateMany({
                    where: { referenceId: id },
                    data: {
                        createdAt: newDate
                    }
                })
            })
            revalidatePath("/(dashboard)/sales")
            return { success: "Date mise à jour avec succès" }
        }

        await db.$transaction(async (tx) => {
            const customer = await tx.customer.findFirst({ where: { id: data.customerId, tenantId } });
            if (!customer) throw new Error("Client introuvable ou non autorisé");

            await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } })
            
            const updateData: any = {
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
                        priceHt: item.priceHt,
                        serialNumber: item.serialNumber || null
                    }))
                }
            }
            
            if (newDate) {
                updateData.createdAt = newDate
            }

            await tx.salesOrder.update({
                where: { id },
                data: updateData
            })

            if (newDate) {
                await tx.treasuryTransaction.updateMany({
                    where: { referenceId: id, source: "SALE", tenantId },
                    data: {
                        date: newDate,
                        createdAt: newDate
                    }
                })
                await tx.stockMovement.updateMany({
                    where: { referenceId: id },
                    data: {
                        createdAt: newDate
                    }
                })
            }
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

        const salesOrder = await db.salesOrder.findFirst({
            where: { id, tenantId },
            include: { items: true }
        })
        if (!salesOrder) throw new Error("Bon introuvable")

        const prevStatus = salesOrder.status
        const total = Number(salesOrder.total)

        await db.$transaction(async (tx) => {
            await tx.salesOrder.update({ where: { id }, data: { status: newStatus as SalesOrderStatus } })

            // Stock: deduct when going to VALIDATED/PAID (and not already deducted)
            const hadStock = STOCK_STATUSES.includes(prevStatus)
            const getsStock = STOCK_STATUSES.includes(newStatus)
            const isStockType = salesOrder.type === "ORDER" || salesOrder.type === "INVOICE"

            const isCreditNote = salesOrder.type === "CREDIT_NOTE"

            if (!hadStock && getsStock && (isStockType || isCreditNote)) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                
                // Fetch stocks before updating
                const productIds = salesOrder.items.map(i => i.productId);
                const productsWithStock = await tx.product.findMany({
                    where: { id: { in: productIds } },
                    include: { storeProducts: { where: { storeId: storeId || "" } } }
                });
                const stockMap = new Map(productsWithStock.map(p => {
                    const sp = p.storeProducts[0];
                    return [
                        p.id,
                        sp?.stock !== undefined && sp?.stock !== null ? sp.stock : 0
                    ];
                }));

                if (storeId) {
                    await Promise.all(
                        salesOrder.items.map(item =>
                            tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: isCreditNote ? { increment: item.quantity } : { decrement: item.quantity } }
                            })
                        )
                    );
                }

                await Promise.all(
                    salesOrder.items.map(item =>
                        tx.product.updateMany({
                            where: { id: item.productId },
                            data: { stock: isCreditNote ? { increment: item.quantity } : { decrement: item.quantity } }
                        })
                    )
                );

                // Track running stock per product to handle duplicates
                const runningStockMapStatus = new Map<string, number>();
                salesOrder.items.forEach(item => {
                    if (!runningStockMapStatus.has(item.productId)) {
                        runningStockMapStatus.set(item.productId, stockMap.get(item.productId) || 0);
                    }
                });

                await tx.stockMovement.createMany({
                    data: salesOrder.items.map(item => {
                        const stockBefore = runningStockMapStatus.get(item.productId) || 0;
                        const change = isCreditNote ? item.quantity : -item.quantity;
                        const stockAfter = stockBefore + change;
                        runningStockMapStatus.set(item.productId, stockAfter);
                        return {
                            productId: item.productId,
                            type: isCreditNote ? "RETURN" : "SALE",
                            quantity: change,
                            stockBefore,
                            stockAfter,
                            referenceId: id,
                            reason: `${isCreditNote ? "Avoir" : "Vente"} N° ${salesOrder.receiptNumber}`,
                            userId: session.user.id,
                            tenantId,
                            storeId
                        };
                    })
                });
            }

            // Restore stock if cancelling
            if (hadStock && newStatus === "CANCELLED" && (isStockType || isCreditNote)) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                if (storeId) {
                    await Promise.all(
                        salesOrder.items.map(item =>
                            tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: isCreditNote ? { decrement: item.quantity } : { increment: item.quantity } }
                            })
                        )
                    );
                }

                await Promise.all(
                    salesOrder.items.map(item =>
                        tx.product.updateMany({
                            where: { id: item.productId },
                            data: { stock: isCreditNote ? { decrement: item.quantity } : { increment: item.quantity } }
                        })
                    )
                );

                // Also delete related stock movements
                let linkedOrderIds = [id];
                if (salesOrder.receiptNumber) {
                    const timeMin = new Date(salesOrder.createdAt.getTime() - 60000);
                    const timeMax = new Date(salesOrder.createdAt.getTime() + 60000);
                    const linkedOrders = await tx.order.findMany({
                        where: {
                            tenantId,
                            total: salesOrder.total,
                            OR: [
                                { customerId: salesOrder.customerId },
                                { customerId: null }
                            ],
                            createdAt: { gte: timeMin, lte: timeMax }
                        },
                        select: { id: true }
                    });
                    linkedOrderIds.push(...linkedOrders.map(o => o.id));
                }

                await tx.stockMovement.deleteMany({
                    where: { referenceId: { in: linkedOrderIds } }
                });
            }

            // Revert and delete all treasury transactions directly linked to this SalesOrder
            if (newStatus === "CANCELLED") {
                const linkedSalesOrderTxs = await tx.treasuryTransaction.findMany({
                    where: { referenceId: id, source: "SALE", tenantId }
                });

                for (const t of linkedSalesOrderTxs) {
                    const amount = Number(t.amount);
                    if (amount > 0) {
                        await tx.treasuryAccount.update({
                            where: { id: t.accountId },
                            data: { balance: { decrement: amount } }
                        });
                    }
                }

                await tx.treasuryTransaction.deleteMany({
                    where: { referenceId: id, source: "SALE", tenantId }
                });

                // Revert associated POS Order, order items, and Treasury Transactions if receiptNumber exists
                if (salesOrder.receiptNumber) {
                    let linkedOrder = null;
                    const linkedTx = await tx.treasuryTransaction.findFirst({
                        where: { description: { contains: salesOrder.receiptNumber }, source: "SALE", tenantId }
                    });

                    if (linkedTx && linkedTx.referenceId) {
                        linkedOrder = await tx.order.findFirst({ where: { id: linkedTx.referenceId, tenantId } });
                    } else {
                        const timeMin = new Date(salesOrder.createdAt.getTime() - 60000);
                        const timeMax = new Date(salesOrder.createdAt.getTime() + 60000);
                        linkedOrder = await tx.order.findFirst({
                            where: {
                                tenantId,
                                total: salesOrder.total,
                                OR: [
                                    { customerId: salesOrder.customerId },
                                    { customerId: null }
                                ],
                                createdAt: { gte: timeMin, lte: timeMax }
                            }
                        });
                    }

                    if (linkedOrder) {
                        const oldPaidAmount = Number(linkedOrder.paidAmount);

                        // Revert treasury balance
                        if (oldPaidAmount > 0 && linkedOrder.accountId) {
                            await tx.treasuryAccount.update({
                                where: { id: linkedOrder.accountId },
                                data: { balance: { decrement: oldPaidAmount } }
                            });
                            await tx.treasuryTransaction.deleteMany({
                                where: { referenceId: linkedOrder.id, source: "SALE", tenantId }
                            });
                        }

                        // Delete the POS order items and the order
                        await tx.orderItem.deleteMany({ where: { orderId: linkedOrder.id } });
                        await tx.order.delete({ where: { id: linkedOrder.id } });
                    }
                }
            }

            // Customer balance:
            // VALIDATED → add to balance (they owe us) or decrement if CREDIT_NOTE
            if (DEBT_STATUSES.includes(newStatus) && !DEBT_STATUSES.includes(prevStatus)) {
                await tx.customer.update({
                    where: { id: salesOrder.customerId },
                    data: { balance: isCreditNote ? { decrement: total } : { increment: total } }
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
                    data: { balance: isCreditNote ? { increment: total } : { decrement: total } }
                })
            }

            // CANCELLED from VALIDATED → clear balance
            if (newStatus === "CANCELLED" && DEBT_STATUSES.includes(prevStatus)) {
                const decrementAmount = salesOrder.source === "POS"
                    ? Number(salesOrder.total) - Number(salesOrder.amountPaid)
                    : Number(salesOrder.total);
                if (decrementAmount !== 0) {
                    await tx.customer.update({
                        where: { id: salesOrder.customerId },
                        data: { balance: isCreditNote ? { increment: total } : { decrement: decrementAmount } }
                    });
                }
            }
        })

        revalidatePath("/(dashboard)/sales")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        logAudit({ action: "UPDATE", entity: "SALES_ORDER", entityId: id, description: `Statut ${salesOrder.receiptNumber || id}: ${prevStatus} → ${newStatus}`, before: { status: prevStatus }, after: { status: newStatus } }).catch(() => null)
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

        let deletedOrderInfo: any = null;

        await db.$transaction(async (tx) => {
            const order = await tx.salesOrder.findFirst({
                where: { id, tenantId },
                include: { items: true }
            });

            if (!order) throw new Error("Not found");
            deletedOrderInfo = order;

            // Find linked POS order early if receiptNumber exists
            let linkedOrder = null;
            if (order.receiptNumber) {
                const linkedTx = await tx.treasuryTransaction.findFirst({
                    where: { description: { contains: order.receiptNumber }, source: "SALE" }
                });

                if (linkedTx && linkedTx.referenceId) {
                    linkedOrder = await tx.order.findUnique({ where: { id: linkedTx.referenceId } });
                } else {
                    const timeMin = new Date(order.createdAt.getTime() - 60000);
                    const timeMax = new Date(order.createdAt.getTime() + 60000);
                    linkedOrder = await tx.order.findFirst({
                        where: { 
                            tenantId, 
                            total: order.total,
                            OR: [
                                { customerId: order.customerId },
                                { customerId: null }
                            ],
                            createdAt: { gte: timeMin, lte: timeMax } 
                        }
                    });
                }
            }

            const linkedOrderIds = [id];
            if (linkedOrder) {
                linkedOrderIds.push(linkedOrder.id);
            }

            // DGI Compliance: Invoices/BLs with receipt numbers must be VOIDED, not deleted
            // This preserves the numbering sequence required by fiscal authorities
            const hasReceiptNumber = !!order.receiptNumber
            const isNumberedDocument = (order.type === "INVOICE" || order.type === "ORDER" || order.type === "CREDIT_NOTE") && hasReceiptNumber

            // If order was validated or paid, stock was decremented (or incremented if Credit Note), so we must restore it
            const STOCK_STATUSES = ["VALIDATED", "PAID"];
            const isStockType = order.type === "ORDER" || order.type === "INVOICE";
            const isCreditNote = order.type === "CREDIT_NOTE";
            
            if (STOCK_STATUSES.includes(order.status) && (isStockType || isCreditNote)) {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                
                await Promise.all(
                    order.items.map(async (item) => {
                        if (storeId) {
                            await tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: isCreditNote ? { decrement: item.quantity } : { increment: item.quantity } }
                            });
                        }
                        await tx.product.updateMany({
                            where: { id: item.productId },
                            data: { stock: isCreditNote ? { decrement: item.quantity } : { increment: item.quantity } }
                        });
                        
                        // Delete related stock movements
                        await tx.stockMovement.deleteMany({
                            where: { referenceId: { in: linkedOrderIds }, productId: item.productId }
                        });
                    })
                );
            }

            // Restore customer balance if they owed money
            const DEBT_STATUSES = ["VALIDATED"];
            if (DEBT_STATUSES.includes(order.status)) {
                // If it's a POS order, the customer balance was only incremented by total - amountPaid (debt)
                const decrementAmount = order.source === "POS"
                    ? Number(order.total) - Number(order.amountPaid)
                    : Number(order.total);
                if (decrementAmount !== 0) {
                    await tx.customer.update({
                        where: { id: order.customerId },
                        data: { balance: { decrement: decrementAmount } }
                    });
                }
            }

            // Revert and delete all treasury transactions directly linked to this SalesOrder (e.g. for payments received)
            const linkedSalesOrderTxs = await tx.treasuryTransaction.findMany({
                where: { referenceId: id, source: "SALE" }
            });

            for (const t of linkedSalesOrderTxs) {
                const amount = Number(t.amount);
                if (amount > 0) {
                    await tx.treasuryAccount.update({
                        where: { id: t.accountId },
                        data: { balance: { decrement: amount } }
                    });
                }
            }

            await tx.treasuryTransaction.deleteMany({
                where: { referenceId: id, source: "SALE" }
            });

            // Revert associated POS Order, order items, and Treasury Transactions if receiptNumber exists
            if (order.receiptNumber) {
                if (linkedOrder) {
                    const oldPaidAmount = Number(linkedOrder.paidAmount);

                    // Revert treasury balance
                    if (oldPaidAmount > 0 && linkedOrder.accountId) {
                        await tx.treasuryAccount.update({
                            where: { id: linkedOrder.accountId },
                            data: { balance: { decrement: oldPaidAmount } }
                        });
                        await tx.treasuryTransaction.deleteMany({
                            where: { referenceId: linkedOrder.id, source: "SALE" }
                        });
                    }

                    // Delete the POS order items and the order
                    await tx.orderItem.deleteMany({ where: { orderId: linkedOrder.id } });
                    await tx.order.delete({ where: { id: linkedOrder.id } });
                }
            }

            if (isNumberedDocument) {
                // Void the document instead of deleting — keeps receipt number in the chain
                await tx.salesOrder.update({
                    where: { id },
                    data: { status: "CANCELLED" }
                });
            } else {
                // DRAFT or QUOTE without receipt number — safe to delete
                await tx.salesOrder.delete({ where: { id, tenantId } });
            }
        });

        if (!process.env.AUDIT_TENANT_ID) {
            revalidatePath("/(dashboard)/sales")
        }
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        logAudit({ 
            action: "DELETE", 
            entity: "SALES_ORDER", 
            entityId: id, 
            description: `Document ${deletedOrderInfo?.type || ""} ${deletedOrderInfo?.receiptNumber || ""} annulé/supprimé`,
            before: deletedOrderInfo
        }).catch(() => null)
        return { success: "Document annulé et stock restauré" }
    } catch { return { error: "Erreur lors de la suppression" } }
}
