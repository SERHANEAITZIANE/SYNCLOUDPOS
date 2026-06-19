"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkSubscription } from "@/lib/subscription"
import cacheMonitor from "@/lib/cache-monitor"

export interface ClientReturnParams {
    customerId: string
    productId: string
    quantity: number
    storeId?: string
    returnType: "CREDIT" | "CASH"
    accountId?: string // Caisse/Banque for refund
    reason: string
    notes?: string
}

export interface SupplierReturnParams {
    supplierId: string
    productId: string
    quantity: number
    storeId?: string
    returnType: "CREDIT" | "CASH"
    accountId?: string // Caisse/Banque for refund
    reason: string
    notes?: string
}

// ── CLIENT RETURNS ACTIONS ───────────────────────────────────────────────────

export const getClientReturns = async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé", returns: [] }
    const tenantId = session.user.tenantId

    try {
        const returns = await db.productReturn.findMany({
            where: { tenantId },
            include: {
                customer: { select: { name: true } },
                product: { select: { name: true } },
                driver: { select: { name: true } },
                salesOrder: { include: { store: true } }
            },
            orderBy: { createdAt: "desc" }
        })
        return { returns: JSON.parse(JSON.stringify(returns)) }
    } catch (error) {
        console.error("getClientReturns error:", error)
        return { error: "Erreur lors de la récupération des retours clients", returns: [] }
    }
}

export const processClientReturn = async (params: ClientReturnParams) => {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const { customerId, productId, quantity, storeId, returnType, accountId, reason, notes } = params

    if (!customerId || !productId || quantity <= 0 || !reason) {
        return { error: "Veuillez remplir tous les champs requis (Client, Produit, Quantité, Motif)" }
    }

    if (returnType === "CASH" && (!accountId || accountId === "none")) {
        return { error: "Un compte de trésorerie (Caisse/Banque) est requis pour un remboursement en espèces" }
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
            if (!customer) throw new Error("Client introuvable ou non autorisé");

            const returnId = crypto.randomUUID()

            // 1. Fetch product to get unit price and current stock details
            const product = await tx.product.findUnique({
                where: { id: productId, tenantId },
                include: { storeProducts: true }
            })
            if (!product) throw new Error("Produit introuvable")

            const unitPrice = Number(product.price)
            const totalAmount = quantity * unitPrice

            const stockStoreId = storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id

            // 2. Restock Product (Global)
            const globalStockBefore = product.stock || 0
            const globalStockAfter = globalStockBefore + quantity
            await tx.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } }
            })

            // 3. Restock Product (Store specific)
            let storeStockBefore = 0
            let storeStockAfter = 0
            if (stockStoreId) {
                const spBefore = product.storeProducts.find(sp => sp.storeId === stockStoreId)
                storeStockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : globalStockBefore
                storeStockAfter = storeStockBefore + quantity

                await tx.storeProduct.upsert({
                    where: { storeId_productId: { storeId: stockStoreId, productId } },
                    update: { stock: { increment: quantity } },
                    create: { storeId: stockStoreId, productId, stock: quantity, minStock: spBefore?.minStock || 10 }
                })
            }

            // 4. Create Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId,
                    type: "RETURN",
                    quantity,
                    stockBefore: storeStockBefore || globalStockBefore,
                    stockAfter: storeStockAfter || globalStockAfter,
                    reason: `Retour Client: ${reason}`,
                    tenantId,
                    storeId: stockStoreId || undefined,
                    userId,
                    referenceId: returnId
                }
            })

            // 5. Handle Financial Adjustment
            if (returnType === "CREDIT") {
                // Deduct customer balance (reduce their outstanding debt)
                await tx.customer.update({
                    where: { id: customerId },
                    data: { balance: { decrement: totalAmount } }
                })
            } else if (returnType === "CASH" && accountId) {
                // Refund customer in cash from our selected treasury account
                const account = await tx.treasuryAccount.findUnique({
                    where: { id: accountId, tenantId }
                })
                if (!account) throw new Error("Compte de trésorerie introuvable")
                if (Number(account.balance) < totalAmount) {
                    throw new Error("Solde insuffisant dans la caisse/banque sélectionnée pour effectuer le remboursement")
                }

                // Decrement treasury account balance
                const updatedAccount = await tx.treasuryAccount.update({
                    where: { id: accountId },
                    data: { balance: { decrement: totalAmount } }
                })

                // Create Treasury Transaction record
                await tx.treasuryTransaction.create({
                    data: {
                        accountId,
                        type: "DEBIT",
                        amount: totalAmount,
                        balanceBefore: account.balance,
                        balanceAfter: updatedAccount.balance,
                        source: "MANUAL_OUT",
                        referenceId: returnId,
                        description: `Remboursement Retour Client [CASH]: ${reason}`,
                        tenantId
                    }
                })
            }

            // 6. Create Return record in ProductReturn table
            const productReturn = await tx.productReturn.create({
                data: {
                    id: returnId,
                    tenantId,
                    customerId,
                    driverId: userId,
                    productId,
                    quantity,
                    unitPrice,
                    totalAmount,
                    reason,
                    notes: notes || null,
                    status: "COMPLETED",
                    tourStopId: null,
                    returnType: returnType
                }
            })

            return productReturn
        })

        if (!process.env.AUDIT_TENANT_ID) {
            revalidatePath("/(dashboard)/retours")
            revalidatePath("/(dashboard)/products")
            revalidatePath("/(dashboard)/customers")
            revalidatePath("/(dashboard)/treasury")
        }
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)

        return { success: "Retour client enregistré avec succès et stock réapprovisionné.", id: result.id }
    } catch (error) {
        console.error("processClientReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors du traitement" }
    }
}

// ── SUPPLIER RETURNS ACTIONS ─────────────────────────────────────────────────

export const getSupplierReturns = async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé", returns: [] }
    const tenantId = session.user.tenantId

    try {
        const returns = await db.supplierReturn.findMany({
            where: { tenantId },
            include: {
                supplier: { select: { name: true } },
                product: { select: { name: true } },
                user: { select: { name: true } },
                purchaseOrder: { include: { store: true } }
            },
            orderBy: { createdAt: "desc" }
        })
        const mapped = returns.map(r => ({
            ...r,
            supplierName: r.supplier?.name || "Inconnu",
            productName: r.product?.name || "Inconnu",
            userName: r.user?.name || "Inconnu"
        }))
        return { returns: JSON.parse(JSON.stringify(mapped)) }
    } catch (error) {
        console.error("getSupplierReturns error:", error)
        return { error: "Erreur lors de la récupération des retours fournisseurs", returns: [] }
    }
}

export const processSupplierReturn = async (params: SupplierReturnParams) => {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const { supplierId, productId, quantity, storeId, returnType, accountId, reason, notes } = params

    if (!supplierId || !productId || quantity <= 0 || !reason) {
        return { error: "Veuillez remplir tous les champs requis (Fournisseur, Produit, Quantité, Motif)" }
    }

    if (returnType === "CASH" && (!accountId || accountId === "none")) {
        return { error: "Un compte de trésorerie (Caisse/Banque) est requis pour recevoir un remboursement" }
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const returnId = crypto.randomUUID()

            // 1. Fetch supplier info
            const supplier = await tx.supplier.findFirst({
                where: { id: supplierId, tenantId }
            })
            if (!supplier) throw new Error("Fournisseur introuvable ou non autorisé")

            // 2. Fetch product info to get cost price and stock details
            const product = await tx.product.findUnique({
                where: { id: productId, tenantId },
                include: { storeProducts: true }
            })
            if (!product) throw new Error("Produit introuvable")

            const costPrice = Number(product.cost ?? product.price)
            const totalAmount = quantity * costPrice

            const stockStoreId = storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id

            // 3. Deduct Stock (Global)
            const globalStockBefore = product.stock || 0
            const globalStockAfter = globalStockBefore - quantity
            await tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } }
            })

            // 4. Deduct Stock (Store specific)
            let storeStockBefore = 0
            let storeStockAfter = 0
            if (stockStoreId) {
                const spBefore = product.storeProducts.find(sp => sp.storeId === stockStoreId)
                storeStockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : 0
                storeStockAfter = storeStockBefore - quantity

                await tx.storeProduct.upsert({
                    where: { storeId_productId: { storeId: stockStoreId, productId } },
                    update: { stock: { decrement: quantity } },
                    create: { storeId: stockStoreId, productId, stock: -quantity }
                })
            }

            // 5. Create Stock Movement (Negative quantity for deduction)
            await tx.stockMovement.create({
                data: {
                    productId,
                    type: "SUPPLIER_RETURN",
                    quantity: -quantity,
                    stockBefore: storeStockBefore || globalStockBefore,
                    stockAfter: storeStockAfter || globalStockAfter,
                    reason: `Retour Fournisseur: ${supplier.name} - ${reason}`,
                    tenantId,
                    storeId: stockStoreId || undefined,
                    userId,
                    referenceId: returnId
                }
            })

            // 6. Handle Financial Adjustment
            if (returnType === "CREDIT") {
                // Deduct supplier balance (we owe them less)
                await tx.supplier.update({
                    where: { id: supplierId },
                    data: { balance: { decrement: totalAmount } }
                })
            } else if (returnType === "CASH" && accountId) {
                // Supplier pays us back in cash: credit treasury account
                const account = await tx.treasuryAccount.findUnique({
                    where: { id: accountId, tenantId }
                })
                if (!account) throw new Error("Compte de trésorerie introuvable")

                // Increment treasury account balance
                const updatedAccount = await tx.treasuryAccount.update({
                    where: { id: accountId },
                    data: { balance: { increment: totalAmount } }
                })

                // Create Treasury Transaction record
                await tx.treasuryTransaction.create({
                    data: {
                        accountId,
                        type: "CREDIT",
                        amount: totalAmount,
                        balanceBefore: account.balance,
                        balanceAfter: updatedAccount.balance,
                        source: "MANUAL_IN",
                        referenceId: returnId,
                        description: `Remboursement Retour Fournisseur [CASH]: ${supplier.name} - ${reason}`,
                        tenantId
                    }
                })
            }

            // 7. Create SupplierReturn record
            const supplierReturn = await tx.supplierReturn.create({
                data: {
                    id: returnId,
                    tenantId,
                    supplierId,
                    userId,
                    productId,
                    quantity,
                    unitPrice: costPrice,
                    totalAmount,
                    reason,
                    notes: notes || null,
                    status: "COMPLETED",
                    returnType: returnType
                }
            })

            return supplierReturn
        })

        if (!process.env.AUDIT_TENANT_ID) {
            revalidatePath("/(dashboard)/retours")
            revalidatePath("/(dashboard)/products")
            revalidatePath("/(dashboard)/suppliers")
            revalidatePath("/(dashboard)/treasury")
        }
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)

        return { success: "Retour fournisseur enregistré avec succès et stock déduit.", id: result.id }
    } catch (error) {
        console.error("processSupplierReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors du traitement" }
    }
}

export interface BulkClientReturnItem {
    productId: string
    quantity: number
    unitPrice: number
}

export interface BulkClientReturnParams {
    customerId: string
    salesOrderId: string
    items: BulkClientReturnItem[]
    storeId?: string
    refundCash: boolean
    accountId?: string
    reason: string
    notes?: string
}

export async function getCustomerSalesOrders(customerId: string) {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = session.user.tenantId

    try {
        const orders = await db.salesOrder.findMany({
            where: {
                tenantId,
                customerId,
                type: "ORDER",
                status: { in: ["VALIDATED", "PAID"] }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                cost: true,
                                stock: true,
                                barcodes: { select: { value: true } }
                            }
                        }
                    }
                },
                productReturns: {
                    select: {
                        productId: true,
                        quantity: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })
        return JSON.parse(JSON.stringify(orders))
    } catch (error) {
        console.error("getCustomerSalesOrders error:", error)
        return []
    }
}

export async function processBulkClientReturn(params: BulkClientReturnParams) {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const { customerId, salesOrderId, items, storeId, refundCash, accountId, reason, notes } = params

    if (!customerId || !salesOrderId || !items || items.length === 0 || !reason) {
        return { error: "Veuillez remplir tous les champs requis" }
    }

    const validItems = items.filter(item => item.quantity > 0)
    if (validItems.length === 0) {
        return { error: "Veuillez spécifier au moins une quantité à retourner supérieure à 0" }
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
            if (!customer) throw new Error("Client introuvable ou non autorisé");

            // 1. Fetch sales order (BL) details
            const salesOrder = await tx.salesOrder.findFirst({
                where: { id: salesOrderId, tenantId, customerId }
            })
            if (!salesOrder) throw new Error("Bon de livraison introuvable")

            const returnTotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

            // Calculate refund capacity: amountPaid - (total - returnTotal)
            const amountPaid = Number(salesOrder.amountPaid)
            const total = Number(salesOrder.total)
            const totalRefundCapacity = Math.max(0, amountPaid - (total - returnTotal))

            let refundCashAmount = 0
            let treasuryAccount = null
            let currentAccountBalance = 0
            if (refundCash && accountId) {
                refundCashAmount = Math.min(totalRefundCapacity, returnTotal)
                if (refundCashAmount > 0) {
                    treasuryAccount = await tx.treasuryAccount.findUnique({
                        where: { id: accountId, tenantId }
                    })
                    if (!treasuryAccount) throw new Error("Compte de trésorerie introuvable")
                    if (Number(treasuryAccount.balance) < refundCashAmount) {
                        throw new Error("Solde de caisse insuffisant pour effectuer le remboursement")
                    }
                    currentAccountBalance = Number(treasuryAccount.balance)
                }
            }

            const stockStoreId = storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id
            let remainingRefundCash = refundCashAmount

            // Process each item
            for (const item of validItems) {
                const returnId = crypto.randomUUID()
                const product = await tx.product.findUnique({
                    where: { id: item.productId, tenantId },
                    include: { storeProducts: true }
                })
                if (!product) throw new Error(`Produit introuvable: ${item.productId}`)

                // Restock Product (Global)
                const globalStockBefore = product.stock || 0
                const globalStockAfter = globalStockBefore + item.quantity
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                })

                // Restock Product (Store specific)
                let storeStockBefore = 0
                let storeStockAfter = 0
                if (stockStoreId) {
                    const spBefore = product.storeProducts.find(sp => sp.storeId === stockStoreId)
                    storeStockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : globalStockBefore
                    storeStockAfter = storeStockBefore + item.quantity

                    await tx.storeProduct.upsert({
                        where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                        update: { stock: { increment: item.quantity } },
                        create: { storeId: stockStoreId, productId: item.productId, stock: item.quantity, minStock: spBefore?.minStock || 10 }
                    })
                }

                // Create Stock Movement
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: "RETURN",
                        quantity: item.quantity,
                        stockBefore: storeStockBefore || globalStockBefore,
                        stockAfter: storeStockAfter || globalStockAfter,
                        reason: `Retour Client sur BL N°: ${salesOrder.receiptNumber || 'N/A'}. Motif: ${reason}`,
                        tenantId,
                        storeId: stockStoreId || undefined,
                        userId,
                        referenceId: returnId
                    }
                })

                const itemTotal = item.quantity * item.unitPrice
                const itemCashRefund = Math.min(remainingRefundCash, itemTotal)
                remainingRefundCash -= itemCashRefund

                if (itemCashRefund > 0 && accountId) {
                    // Decrement treasury account balance
                    await tx.treasuryAccount.update({
                        where: { id: accountId },
                        data: { balance: { decrement: itemCashRefund } }
                    })

                    // Create Treasury Transaction record
                    await tx.treasuryTransaction.create({
                        data: {
                            accountId,
                            type: "DEBIT",
                            amount: itemCashRefund,
                            balanceBefore: currentAccountBalance,
                            balanceAfter: currentAccountBalance - itemCashRefund,
                            source: "MANUAL_OUT",
                            referenceId: returnId,
                            description: `Remboursement Retour Client (BL N°: ${salesOrder.receiptNumber || 'N/A'}): ${reason}`,
                            tenantId
                        }
                    })

                    currentAccountBalance -= itemCashRefund
                }

                // Create ProductReturn record
                await tx.productReturn.create({
                    data: {
                        id: returnId,
                        tenantId,
                        customerId,
                        driverId: userId,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalAmount: itemTotal,
                        reason: `${reason} (BL N°: ${salesOrder.receiptNumber || 'N/A'})`,
                        notes: notes || null,
                        status: "COMPLETED",
                        salesOrderId: salesOrder.id,
                        returnType: refundCash ? "CASH" : "CREDIT"
                    }
                })
            }

            // Adjust Customer Balance: decrement by returnTotal - refundCashAmount
            const balanceDecrement = returnTotal - refundCashAmount
            if (balanceDecrement > 0) {
                await tx.customer.update({
                    where: { id: customerId },
                    data: { balance: { decrement: balanceDecrement } }
                })
            }

            return { success: true }
        })

        if (!process.env.AUDIT_TENANT_ID) {
            revalidatePath("/(dashboard)/retours")
            revalidatePath("/(dashboard)/products")
            revalidatePath("/(dashboard)/customers")
            revalidatePath("/(dashboard)/treasury")
        }
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)

        return { success: "Retour client enregistré avec succès et stock réapprovisionné." }
    } catch (error) {
        console.error("processBulkClientReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors du traitement" }
    }
}

export interface BulkSupplierReturnItem {
    productId: string
    quantity: number
    unitCostPrice: number
}

export interface BulkSupplierReturnParams {
    supplierId: string
    purchaseOrderId: string
    items: BulkSupplierReturnItem[]
    storeId?: string
    refundCash: boolean
    accountId?: string
    reason: string
    notes?: string
}

export async function getSupplierPurchaseOrders(supplierId: string) {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = session.user.tenantId

    try {
        const orders = await db.purchaseOrder.findMany({
            where: {
                tenantId,
                supplierId,
                status: { in: ["BON_LIVRAISON", "FACTURE", "COMPLETED"] }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                cost: true,
                                stock: true,
                                barcodes: { select: { value: true } }
                            }
                        }
                    }
                },
                supplierReturns: {
                    select: {
                        productId: true,
                        quantity: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        const orderIds = orders.map(o => o.id)
        const transactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                source: "PURCHASE",
                referenceId: { in: orderIds },
                type: "DEBIT"
            }
        })

        const ordersWithPaid = orders.map(o => {
            const orderTransactions = transactions.filter(t => t.referenceId === o.id)
            const amountPaid = o.status === "COMPLETED"
                ? Number(o.total)
                : orderTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
            return {
                ...o,
                amountPaid
            }
        })

        return JSON.parse(JSON.stringify(ordersWithPaid))
    } catch (error) {
        console.error("getSupplierPurchaseOrders error:", error)
        return []
    }
}

export async function processBulkSupplierReturn(params: BulkSupplierReturnParams) {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const { supplierId, purchaseOrderId, items, storeId, refundCash, accountId, reason, notes } = params

    if (!supplierId || !purchaseOrderId || !items || items.length === 0 || !reason) {
        return { error: "Veuillez remplir tous les champs requis" }
    }

    const validItems = items.filter(item => item.quantity > 0)
    if (validItems.length === 0) {
        return { error: "Veuillez spécifier au moins une quantité à retourner supérieure à 0" }
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const supplier = await tx.supplier.findFirst({ where: { id: supplierId, tenantId } });
            if (!supplier) throw new Error("Fournisseur introuvable ou non autorisé");

            // 1. Fetch purchase order (BL/Facture) details
            const purchaseOrder = await tx.purchaseOrder.findFirst({
                where: { id: purchaseOrderId, tenantId, supplierId }
            })
            if (!purchaseOrder) throw new Error("Bon de commande/achat introuvable")

            const returnTotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unitCostPrice), 0)

            // Fetch any treasury transactions associated with the purchase order
            const transactions = await tx.treasuryTransaction.findMany({
                where: {
                    tenantId,
                    source: "PURCHASE",
                    referenceId: purchaseOrderId,
                    type: "DEBIT"
                }
            })

            const amountPaid = purchaseOrder.status === "COMPLETED" 
                ? Number(purchaseOrder.total) 
                : transactions.reduce((sum, t) => sum + Number(t.amount), 0)

            const poTotal = Number(purchaseOrder.total)
            const totalRefundCapacity = Math.max(0, amountPaid - (poTotal - returnTotal))

            let refundCashAmount = 0
            let treasuryAccount = null
            let currentAccountBalance = 0
            if (refundCash && accountId) {
                refundCashAmount = Math.min(totalRefundCapacity, returnTotal)
                if (refundCashAmount > 0) {
                    treasuryAccount = await tx.treasuryAccount.findUnique({
                        where: { id: accountId, tenantId }
                    })
                    if (!treasuryAccount) throw new Error("Compte de trésorerie introuvable")
                    currentAccountBalance = Number(treasuryAccount.balance)
                }
            }

            const stockStoreId = storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id
            let remainingRefundCash = refundCashAmount

            // Process each item
            for (const item of validItems) {
                const returnId = crypto.randomUUID()
                const product = await tx.product.findUnique({
                    where: { id: item.productId, tenantId },
                    include: { storeProducts: true }
                })
                if (!product) throw new Error(`Produit introuvable: ${item.productId}`)

                // Deduct Product Stock (Global)
                const globalStockBefore = product.stock || 0
                const globalStockAfter = globalStockBefore - item.quantity
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                })

                // Deduct Product Stock (Store specific)
                let storeStockBefore = 0
                let storeStockAfter = 0
                if (stockStoreId) {
                    const spBefore = product.storeProducts.find(sp => sp.storeId === stockStoreId)
                    storeStockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : 0
                    storeStockAfter = storeStockBefore - item.quantity

                    await tx.storeProduct.upsert({
                        where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                        update: { stock: { decrement: item.quantity } },
                        create: { storeId: stockStoreId, productId: item.productId, stock: -item.quantity }
                    })
                }

                // Create Stock Movement (negative quantity since stock is decremented)
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: "SUPPLIER_RETURN",
                        quantity: -item.quantity,
                        stockBefore: storeStockBefore || globalStockBefore,
                        stockAfter: storeStockAfter || globalStockAfter,
                        reason: `Retour Fournisseur sur Bon N°: ${purchaseOrder.reference || 'N/A'}. Motif: ${reason}`,
                        tenantId,
                        storeId: stockStoreId || undefined,
                        userId,
                        referenceId: returnId
                    }
                })

                const itemTotal = item.quantity * item.unitCostPrice
                const itemCashRefund = Math.min(remainingRefundCash, itemTotal)
                remainingRefundCash -= itemCashRefund

                if (itemCashRefund > 0 && accountId) {
                    // Supplier refunds us: credit treasury account (we receive cash)
                    await tx.treasuryAccount.update({
                        where: { id: accountId },
                        data: { balance: { increment: itemCashRefund } }
                    })

                    // Create Treasury Transaction record
                    await tx.treasuryTransaction.create({
                        data: {
                            accountId,
                            type: "CREDIT",
                            amount: itemCashRefund,
                            balanceBefore: currentAccountBalance,
                            balanceAfter: currentAccountBalance + itemCashRefund,
                            source: "MANUAL_IN",
                            referenceId: returnId,
                            description: `Remboursement Retour Fournisseur (Bon N°: ${purchaseOrder.reference || 'N/A'}): ${reason}`,
                            tenantId
                        }
                    })

                    currentAccountBalance += itemCashRefund
                }

                // Create SupplierReturn record
                await tx.supplierReturn.create({
                    data: {
                        id: returnId,
                        tenantId,
                        supplierId,
                        userId,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitCostPrice,
                        totalAmount: itemTotal,
                        reason: `${reason} (Bon N°: ${purchaseOrder.reference || 'N/A'})`,
                        notes: notes || null,
                        status: "COMPLETED",
                        returnType: refundCash ? "CASH" : "CREDIT",
                        purchaseOrderId: purchaseOrder.id
                    }
                })
            }

            // Adjust Supplier Balance: decrement by returnTotal - refundCashAmount
            const balanceDecrement = returnTotal - refundCashAmount
            if (balanceDecrement > 0) {
                await tx.supplier.update({
                    where: { id: supplierId },
                    data: { balance: { decrement: balanceDecrement } }
                })
            }

            return { success: true }
        })

        if (!process.env.AUDIT_TENANT_ID) {
            revalidatePath("/(dashboard)/retours")
            revalidatePath("/(dashboard)/products")
            revalidatePath("/(dashboard)/suppliers")
            revalidatePath("/(dashboard)/treasury")
        }
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)

        return { success: "Retour fournisseur enregistré avec succès et stock mis à jour." }
    } catch (error) {
        console.error("processBulkSupplierReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors du traitement" }
    }
}

// ── NEW DELETE & EDIT ACTIONS FOR RETURNS ────────────────────────────────────

export const deleteClientReturn = async (id: string) => {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    try {
        await db.$transaction(async (tx) => {
            // 1. Fetch return record
            const productReturn = await tx.productReturn.findUnique({
                where: { id, tenantId }
            })
            if (!productReturn) throw new Error("Retour client introuvable")

            // 2. Revert stock
            const stockMovement = await tx.stockMovement.findFirst({
                where: { referenceId: id, tenantId }
            })
            if (stockMovement) {
                const qtyToAdjust = stockMovement.quantity // positive for client return
                
                // Decrement global stock
                const product = await tx.product.findUnique({
                    where: { id: productReturn.productId, tenantId }
                })
                if (product) {
                    await tx.product.update({
                        where: { id: productReturn.productId },
                        data: { stock: (product.stock || 0) - qtyToAdjust }
                    })
                }

                // Decrement store stock
                if (stockMovement.storeId) {
                    const sp = await tx.storeProduct.findUnique({
                        where: { storeId_productId: { storeId: stockMovement.storeId, productId: productReturn.productId } }
                    })
                    if (sp) {
                        await tx.storeProduct.update({
                            where: { storeId_productId: { storeId: stockMovement.storeId, productId: productReturn.productId } },
                            data: { stock: (sp.stock || 0) - qtyToAdjust }
                        })
                    }
                }
            }

            // 3. Revert financial adjustments (CASH refund / CREDIT)
            let treasuryTransaction = await tx.treasuryTransaction.findFirst({
                where: { referenceId: id, tenantId }
            })

            // Fallback for older returns where referenceId was incorrectly set to customerId
            if (!treasuryTransaction && (productReturn.returnType === "CASH" || !productReturn.returnType)) {
                const salesOrder = productReturn.salesOrderId ? await tx.salesOrder.findUnique({
                    where: { id: productReturn.salesOrderId }
                }) : null;

                const possibleTxs = await tx.treasuryTransaction.findMany({
                    where: {
                        referenceId: productReturn.customerId,
                        tenantId,
                        type: "DEBIT",
                        source: "MANUAL_OUT",
                        amount: productReturn.totalAmount
                    }
                });

                // Match by description containing "Retour Client" and the salesOrder receiptNumber (if present)
                treasuryTransaction = possibleTxs.find(t => {
                    const desc = t.description || "";
                    const matchesBL = salesOrder?.receiptNumber ? desc.includes(salesOrder.receiptNumber) : true;
                    const matchesKeyword = desc.includes("Retour Client") || desc.includes("Remboursement");
                    return matchesBL && matchesKeyword;
                }) || null;
            }

            let cashAmount = 0
            if (treasuryTransaction) {
                cashAmount = Number(treasuryTransaction.amount)
                
                // Put money back in the treasury account (since DEBIT refunded, we CREDIT it back to the account)
                await tx.treasuryAccount.update({
                    where: { id: treasuryTransaction.accountId },
                    data: { balance: { increment: cashAmount } }
                })

                // Delete treasury transaction
                await tx.treasuryTransaction.delete({
                    where: { id: treasuryTransaction.id }
                })
            }

            // The remaining amount is credit (outstanding balance reduction)
            const creditAmount = productReturn.totalAmount - cashAmount
            if (creditAmount > 0) {
                // Increment customer balance (we restore their debt since return is cancelled)
                await tx.customer.update({
                    where: { id: productReturn.customerId },
                    data: { balance: { increment: creditAmount } }
                })
            }

            // 4. Delete stock movement
            await tx.stockMovement.deleteMany({
                where: { referenceId: id, tenantId }
            })

            // 5. Delete Return record
            await tx.productReturn.delete({
                where: { id }
            })
        })

        revalidatePath("/(dashboard)/retours")
        revalidatePath("/(dashboard)/products")
        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/treasury")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)

        return { success: "Retour client supprimé avec succès, stock et finances restaurés." }
    } catch (error) {
        console.error("deleteClientReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors de la suppression" }
    }
}

export const deleteSupplierReturn = async (id: string) => {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    try {
        await db.$transaction(async (tx) => {
            // 1. Fetch return record
            const supplierReturn = await tx.supplierReturn.findUnique({
                where: { id, tenantId },
                include: { supplier: { select: { name: true } } }
            })
            if (!supplierReturn) throw new Error("Retour fournisseur introuvable")

            // 2. Revert stock
            const stockMovement = await tx.stockMovement.findFirst({
                where: { referenceId: id, tenantId }
            })
            if (stockMovement) {
                const qtyToAdjust = Math.abs(stockMovement.quantity) // negative for supplier return, we add it back
                
                // Increment global stock
                const product = await tx.product.findUnique({
                    where: { id: supplierReturn.productId, tenantId }
                })
                if (product) {
                    await tx.product.update({
                        where: { id: supplierReturn.productId },
                        data: { stock: (product.stock || 0) + qtyToAdjust }
                    })
                }

                // Increment store stock
                if (stockMovement.storeId) {
                    const sp = await tx.storeProduct.findUnique({
                        where: { storeId_productId: { storeId: stockMovement.storeId, productId: supplierReturn.productId } }
                    })
                    if (sp) {
                        await tx.storeProduct.update({
                            where: { storeId_productId: { storeId: stockMovement.storeId, productId: supplierReturn.productId } },
                            data: { stock: (sp.stock || 0) + qtyToAdjust }
                        })
                    }
                }
            }

            // 3. Revert financial adjustments (CASH refund / CREDIT)
            let treasuryTransaction = await tx.treasuryTransaction.findFirst({
                where: { referenceId: id, tenantId }
            })

            // Fallback for older returns where referenceId was incorrectly set to supplierId
            if (!treasuryTransaction && (supplierReturn.returnType === "CASH" || !supplierReturn.returnType)) {
                const purchaseOrder = supplierReturn.purchaseOrderId ? await tx.purchaseOrder.findUnique({
                    where: { id: supplierReturn.purchaseOrderId }
                }) : null;

                const possibleTxs = await tx.treasuryTransaction.findMany({
                    where: {
                        referenceId: supplierReturn.supplierId,
                        tenantId,
                        type: "CREDIT",
                        source: "MANUAL_IN",
                        amount: supplierReturn.totalAmount
                    }
                });

                // Match by description containing "Retour Fournisseur" or "Remboursement" and the purchaseOrder reference (if present)
                treasuryTransaction = possibleTxs.find(t => {
                    const desc = t.description || "";
                    const matchesPO = purchaseOrder?.reference ? desc.includes(purchaseOrder.reference) : true;
                    const matchesKeyword = desc.includes("Retour Fournisseur") || desc.includes("Remboursement");
                    return matchesPO && matchesKeyword;
                }) || null;
            }

            let cashAmount = 0
            if (treasuryTransaction) {
                cashAmount = Number(treasuryTransaction.amount)
                
                // Revert treasury account (since CREDIT received refund from supplier, we DEBIT/decrement it from the account)
                await tx.treasuryAccount.update({
                    where: { id: treasuryTransaction.accountId },
                    data: { balance: { decrement: cashAmount } }
                })

                // Delete treasury transaction
                await tx.treasuryTransaction.delete({
                    where: { id: treasuryTransaction.id }
                })
            }

            // The remaining amount is credit (dette tierce reduction)
            const creditAmount = supplierReturn.totalAmount - cashAmount
            if (creditAmount > 0) {
                // Increment supplier balance (we restore our debt to them since return is cancelled)
                await tx.supplier.update({
                    where: { id: supplierReturn.supplierId },
                    data: { balance: { increment: creditAmount } }
                })
            }

            // 4. Delete stock movement
            await tx.stockMovement.deleteMany({
                where: { referenceId: id, tenantId }
            })

            // 5. Delete Return record
            await tx.supplierReturn.delete({
                where: { id }
            })
        })

        revalidatePath("/(dashboard)/retours")
        revalidatePath("/(dashboard)/products")
        revalidatePath("/(dashboard)/suppliers")
        revalidatePath("/(dashboard)/treasury")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)

        return { success: "Retour fournisseur supprimé avec succès, stock et finances restaurés." }
    } catch (error) {
        console.error("deleteSupplierReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors de la suppression" }
    }
}

export const editClientReturn = async (id: string, reason: string, notes?: string) => {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    if (!reason) return { error: "Le motif est obligatoire" }

    try {
        await db.$transaction(async (tx) => {
            // 1. Update Return record
            await tx.productReturn.update({
                where: { id, tenantId },
                data: {
                    reason,
                    notes: notes || null
                }
            })

            // 2. Update Stock Movement reason
            await tx.stockMovement.updateMany({
                where: { referenceId: id, tenantId },
                data: {
                    reason: `Retour Client: ${reason}`
                }
            })

            // 3. Update Treasury Transaction description
            await tx.treasuryTransaction.updateMany({
                where: { referenceId: id, tenantId },
                data: {
                    description: `Remboursement Retour Client [CASH]: ${reason}`
                }
            })
        })

        revalidatePath("/(dashboard)/retours")
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)
        return { success: "Retour client mis à jour avec succès." }
    } catch (error) {
        console.error("editClientReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors de la modification" }
    }
}

export const editSupplierReturn = async (id: string, reason: string, notes?: string) => {
    await checkSubscription()
    const session = await auth()
    if (!session?.user?.id) return { error: "Non autorisé" }
    const tenantId = session.user.tenantId

    if (!reason) return { error: "Le motif est obligatoire" }

    try {
        await db.$transaction(async (tx) => {
            // 1. Fetch to get supplier name
            const supplierReturn = await tx.supplierReturn.findUnique({
                where: { id, tenantId },
                include: { supplier: { select: { name: true } } }
            })
            if (!supplierReturn) throw new Error("Retour fournisseur introuvable")

            const supplierName = supplierReturn.supplier?.name || "Fournisseur"

            // 2. Update Return record
            await tx.supplierReturn.update({
                where: { id, tenantId },
                data: {
                    reason,
                    notes: notes || null
                }
            })

            // 3. Update Stock Movement reason
            await tx.stockMovement.updateMany({
                where: { referenceId: id, tenantId },
                data: {
                    reason: `Retour Fournisseur: ${supplierName} - ${reason}`
                }
            })

            // 4. Update Treasury Transaction description
            await tx.treasuryTransaction.updateMany({
                where: { referenceId: id, tenantId },
                data: {
                    description: `Remboursement Retour Fournisseur [CASH]: ${supplierName} - ${reason}`
                }
            })
        })

        revalidatePath("/(dashboard)/retours")
        await cacheMonitor.invalidateCache(`treasury:${tenantId}`)
        return { success: "Retour fournisseur mis à jour avec succès." }
    } catch (error) {
        console.error("editSupplierReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors de la modification" }
    }
}

