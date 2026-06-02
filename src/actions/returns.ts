"use server"

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
                driver: { select: { name: true } }
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
                data: { stock: globalStockAfter }
            })

            // 3. Restock Product (Store specific)
            let storeStockBefore = 0
            let storeStockAfter = 0
            if (stockStoreId) {
                const spBefore = product.storeProducts.find(sp => sp.storeId === stockStoreId)
                storeStockBefore = spBefore?.stock || 0
                storeStockAfter = storeStockBefore + quantity

                await tx.storeProduct.upsert({
                    where: { storeId_productId: { storeId: stockStoreId, productId } },
                    update: { stock: storeStockAfter },
                    create: { storeId: stockStoreId, productId, stock: storeStockAfter, minStock: spBefore?.minStock || 10 }
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
                    userId
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
                        referenceId: customerId,
                        description: `Remboursement Retour Client [CASH]: ${reason}`,
                        tenantId
                    }
                })
            }

            // 6. Create Return record in ProductReturn table
            const productReturn = await tx.productReturn.create({
                data: {
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
                    tourStopId: null
                }
            })

            return productReturn
        })

        revalidatePath("/(dashboard)/retours")
        revalidatePath("/(dashboard)/products")
        revalidatePath("/(dashboard)/customers")
        revalidatePath("/(dashboard)/treasury")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)

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
        // Since there is no SupplierReturn table in schema.prisma,
        // we fetch the stock movements of type "RETURN_SUPPLIER" or "RETURN"
        // which indicate supplier return movements (where reason starts with "Retour Fournisseur").
        const movements = await db.stockMovement.findMany({
            where: {
                tenantId,
                reason: { startsWith: "Retour Fournisseur" }
            },
            include: {
                product: { select: { name: true } },
                user: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        // Let's also fetch related transactions to get details on supplier and amounts if necessary.
        // For simple representation in the table, we'll map movements.
        const returns = movements.map(m => {
            // Parse details from the reason string "Retour Fournisseur: [SupplierName] - [Reason] (Montant: [Amount])"
            const match = m.reason?.match(/Retour Fournisseur: ([^-]+) - (.*)/)
            const supplierName = match ? match[1].trim() : "Fournisseur"
            const parsedReason = match ? match[2].trim() : (m.reason || "")

            return {
                id: m.id,
                productId: m.productId,
                productName: m.product.name,
                quantity: Math.abs(m.quantity),
                supplierName,
                reason: parsedReason,
                userName: m.user?.name || "Inconnu",
                createdAt: m.createdAt
            }
        })

        return { returns: JSON.parse(JSON.stringify(returns)) }
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
            // 1. Fetch supplier info
            const supplier = await tx.supplier.findUnique({
                where: { id: supplierId, tenantId }
            })
            if (!supplier) throw new Error("Fournisseur introuvable")

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
            const globalStockAfter = Math.max(0, globalStockBefore - quantity)
            await tx.product.update({
                where: { id: productId },
                data: { stock: globalStockAfter }
            })

            // 4. Deduct Stock (Store specific)
            let storeStockBefore = 0
            let storeStockAfter = 0
            if (stockStoreId) {
                const spBefore = product.storeProducts.find(sp => sp.storeId === stockStoreId)
                storeStockBefore = spBefore?.stock || 0
                storeStockAfter = Math.max(0, storeStockBefore - quantity)

                await tx.storeProduct.upsert({
                    where: { storeId_productId: { storeId: stockStoreId, productId } },
                    update: { stock: storeStockAfter },
                    create: { storeId: stockStoreId, productId, stock: storeStockAfter }
                })
            }

            // 5. Create Stock Movement (Negative quantity for deduction)
            const movement = await tx.stockMovement.create({
                data: {
                    productId,
                    type: "SPOILAGE", // Categorize as reduction/deduction
                    quantity: -quantity,
                    stockBefore: storeStockBefore || globalStockBefore,
                    stockAfter: storeStockAfter || globalStockAfter,
                    reason: `Retour Fournisseur: ${supplier.name} - ${reason}`,
                    tenantId,
                    storeId: stockStoreId || undefined,
                    userId
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
                        referenceId: supplierId,
                        description: `Remboursement Retour Fournisseur [CASH]: ${supplier.name} - ${reason}`,
                        tenantId
                    }
                })
            }

            return movement
        })

        revalidatePath("/(dashboard)/retours")
        revalidatePath("/(dashboard)/products")
        revalidatePath("/(dashboard)/suppliers")
        revalidatePath("/(dashboard)/treasury")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)

        return { success: "Retour fournisseur enregistré avec succès et stock déduit.", id: result.id }
    } catch (error) {
        console.error("processSupplierReturn error:", error)
        return { error: error instanceof Error ? error.message : "Erreur interne lors du traitement" }
    }
}
