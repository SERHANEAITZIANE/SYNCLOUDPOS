"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkSubscription } from "@/lib/subscription"
import cacheMonitor from "@/lib/cache-monitor"

interface PurchaseOrderItemData {
    productId: string
    quantity: number
    costPrice: number
    tvaRate?: number
}

interface PurchaseOrderData {
    supplierId: string
    total: number
    status: string
    items: PurchaseOrderItemData[]
    accountId?: string
    storeId?: string
    reference?: string
    notes?: string
    imageUrl1?: string
    imageUrl2?: string
    imageUrl3?: string
}

export const getPurchaseOrders = async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const purchaseOrders = await db.purchaseOrder.findMany({
            where: { tenantId },
            include: {
                supplier: true,
                items: { include: { product: true } }
            },
            orderBy: { createdAt: "desc" }
        })
        return { purchaseOrders: JSON.parse(JSON.stringify(purchaseOrders)) }
    } catch { return { error: "Failed to fetch purchase orders" } }
}

export const getPurchaseOrder = async (id: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const purchaseOrder = await db.purchaseOrder.findFirst({
            where: { id, tenantId },
            include: {
                supplier: true,
                items: { include: { product: { include: { barcodes: true } } } }
            }
        })
        return { purchaseOrder: JSON.parse(JSON.stringify(purchaseOrder)) }
    } catch { return { error: "Failed to fetch purchase order" } }
}

export const createPurchaseOrder = async (data: PurchaseOrderData) => {
    await checkSubscription();
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const result = await db.$transaction(async (tx) => {
            // Look up supplier withholding rate for auto-calculation
            const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId }, select: { withholdingRate: true } })
            const withholdingRate = supplier?.withholdingRate ?? 0
            const withholdingAmount = withholdingRate > 0 ? data.total * (withholdingRate / 100) : 0

            const purchaseOrder = await tx.purchaseOrder.create({
                data: {
                    tenantId,
                    supplierId: data.supplierId,
                    storeId: data.storeId || undefined,
                    accountId: (data.accountId && data.accountId !== "none") ? data.accountId : undefined,
                    total: data.total,
                    withholdingAmount,
                    reference: data.reference,
                    status: data.status,
                    imageUrl1: data.imageUrl1 || undefined,
                    imageUrl2: data.imageUrl2 || undefined,
                    imageUrl3: data.imageUrl3 || undefined,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            tvaRate: item.tvaRate ?? 19
                        }))
                    }
                },
                include: { items: true }
            })

            // If BON_LIVRAISON or FACTURE or COMPLETED: add stock
            if (["BON_LIVRAISON", "FACTURE", "COMPLETED"].includes(data.status)) {
                const stockStoreId = data.storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id;

                await Promise.all(
                    data.items.map(async (item: any) => {
                        const pBefore = await tx.product.findUnique({ where: { id: item.productId }, include: { storeProducts: true } });
                        const spBefore = pBefore?.storeProducts.find(sp => sp.storeId === stockStoreId);
                        const stockBefore = spBefore?.stock || 0;
                        const stockAfter = stockBefore + item.quantity;

                        await tx.product.update({
                            where: { id: item.productId },
                            data: { 
                                cost: item.costPrice,
                                stock: { increment: item.quantity }
                            }
                        });

                        if (stockStoreId) {
                            await tx.storeProduct.upsert({
                                where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                                update: { stock: stockAfter },
                                create: { storeId: stockStoreId, productId: item.productId, stock: stockAfter, minStock: spBefore?.minStock || 10 }
                            });
                        }

                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                type: "PURCHASE",
                                quantity: item.quantity,
                                stockBefore,
                                stockAfter,
                                referenceId: purchaseOrder.id,
                                reason: `Achat Fournisseur N° ${purchaseOrder.id.slice(-6)}`,
                                tenantId
                            }
                        });
                    })
                );
            }

            // If FACTURE: add to supplier balance (we owe them)
            if (data.status === "FACTURE") {
                await (tx as any).supplier.update({
                    where: { id: data.supplierId },
                    data: { balance: { increment: data.total } }
                })
            }

            // If COMPLETED: deduct NET amount (total - withholding) from treasury
            // Per Algerian law: withholding is remitted to DGI, not paid to supplier
            if (data.status === "COMPLETED" && data.accountId && data.accountId !== "none" && data.total > 0) {
                const netPayment = data.total - Number(withholdingAmount)
                const account = await tx.treasuryAccount.findUnique({ where: { id: data.accountId, tenantId } })
                if (account) {
                    if (Number(account.balance) < netPayment) throw new Error("Solde insuffisant dans le compte sélectionné")
                    const updated = await tx.treasuryAccount.update({
                        where: { id: data.accountId },
                        data: { balance: { decrement: netPayment } }
                    })
                    await tx.treasuryTransaction.create({
                        data: {
                            accountId: data.accountId,
                            type: "DEBIT",
                            amount: netPayment,
                            balanceBefore: account.balance,
                            balanceAfter: updated.balance,
                            source: "PURCHASE",
                            referenceId: purchaseOrder.id,
                            description: withholdingAmount > 0 
                                ? `Paiement fournisseur (net: ${netPayment.toLocaleString()} DA, retenue: ${Number(withholdingAmount).toLocaleString()} DA)`
                                : `Bon de commande - Paiement`,
                            tenantId
                        }
                    })
                }
            }

            return purchaseOrder
        })

        revalidatePath("/(dashboard)/purchases")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        return { success: "Bon de commande créé", id: result.id }
    } catch (error) {
        console.error("Create Purchase Order Error:", error)
        const msg = error instanceof Error ? error.message : "Failed to create purchase order"
        return { error: msg }
    }
}

// Update items of a PENDING purchase order
export const updatePurchaseOrder = async (id: string, data: PurchaseOrderData) => {
    await checkSubscription();
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const existing = await db.purchaseOrder.findUnique({ where: { id, tenantId } })
        if (!existing) return { error: "Bon de commande introuvable" }
        if (existing.status !== "PENDING" && existing.status !== "BON_COMMANDE") {
            return { error: "Seuls les bons PENDING ou BON_COMMANDE peuvent être modifiés" }
        }

        await db.$transaction(async (tx) => {
            // Delete existing items
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } })
            // Update order
            await tx.purchaseOrder.update({
                where: { id },
                data: {
                    supplierId: data.supplierId,
                    total: data.total,
                    reference: data.reference,
                    status: data.status,
                    accountId: (data.accountId && data.accountId !== "none") ? data.accountId : undefined,
                    imageUrl1: data.imageUrl1 || undefined,
                    imageUrl2: data.imageUrl2 || undefined,
                    imageUrl3: data.imageUrl3 || undefined,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            tvaRate: item.tvaRate ?? 19
                        }))
                    }
                }
            })
        })

        revalidatePath("/(dashboard)/purchases")
        return { success: "Bon de commande modifié" }
    } catch (error) {
        console.error("Update Purchase Order Error:", error)
        return { error: "Erreur lors de la modification" }
    }
}

// Transition a purchase order status with side effects
export const updatePurchaseOrderStatus = async (id: string, newStatus: string, accountId?: string) => {
    await checkSubscription();
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        const order = await db.purchaseOrder.findUnique({
            where: { id, tenantId },
            include: { items: true }
        })
        if (!order) return { error: "Bon de commande introuvable" }

        const prevStatus = order.status
        const total = Number(order.total)

        await db.$transaction(async (tx) => {
            await tx.purchaseOrder.update({ where: { id }, data: { status: newStatus } })

            // Stock update: only if going TO a status that receives stock (and not already having done so)
            const stockStatuses = ["BON_LIVRAISON", "FACTURE", "COMPLETED"]
            const hadStock = stockStatuses.includes(prevStatus)
            const getsStock = stockStatuses.includes(newStatus)

            if (!hadStock && getsStock) {
                const stockStoreId = order.storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id;

                await Promise.all(
                    order.items.map(async (item) => {
                        const pBefore = await tx.product.findUnique({ where: { id: item.productId }, include: { storeProducts: true } });
                        if (!pBefore) return;

                        const spBefore = pBefore.storeProducts.find(sp => sp.storeId === stockStoreId);
                        const stockBefore = spBefore?.stock || 0;
                        const stockAfter = stockBefore + item.quantity;

                        const globalStockBefore = pBefore.stock || 0;
                        const globalStockAfter = globalStockBefore + item.quantity;

                        // CUMP calculation (Weighted Average Cost)
                        const oldTotalValue = globalStockBefore > 0 ? globalStockBefore * Number(pBefore.cost) : 0;
                        const newPurchaseValue = item.quantity * Number(item.costPrice);
                        const newCump = globalStockAfter > 0 
                            ? (oldTotalValue + newPurchaseValue) / globalStockAfter 
                            : Number(item.costPrice);

                        await tx.product.update({
                            where: { id: item.productId },
                            data: { 
                                cost: newCump,
                                stock: globalStockAfter
                            }
                        });

                        if (stockStoreId) {
                            await tx.storeProduct.upsert({
                                where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                                update: { stock: stockAfter },
                                create: { storeId: stockStoreId, productId: item.productId, stock: stockAfter, minStock: spBefore?.minStock || 10 }
                            });
                        }

                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                type: "PURCHASE",
                                quantity: item.quantity,
                                stockBefore,
                                stockAfter,
                                referenceId: order.id,
                                reason: `Modification statut Achat N° ${order.id.slice(-6)}: ${newStatus} (CUMP: ${newCump.toFixed(2)})`,
                                tenantId
                            }
                        });
                    })
                );
            }

            // If cancelling after stock was received: reverse stock
            if (hadStock && newStatus === "CANCELLED") {
                const stockStoreId = order.storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id;

                await Promise.all(
                    order.items.map(async (item: any) => {
                        const pBefore = await tx.product.findUnique({ where: { id: item.productId }, include: { storeProducts: true } });
                        const spBefore = pBefore?.storeProducts?.find(sp => sp.storeId === stockStoreId);
                        const stockBefore = spBefore?.stock || 0;
                        const stockAfter = stockBefore - item.quantity;

                        if (stockStoreId) {
                            await tx.storeProduct.update({
                                where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                                data: { stock: stockAfter }
                            });
                        }

                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } }
                        });

                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                type: "RETURN",
                                quantity: -item.quantity,
                                stockBefore,
                                stockAfter,
                                referenceId: order.id,
                                reason: `Annulation Achat N° ${order.id.slice(-6)}`,
                                tenantId
                            }
                        });
                    })
                );
            }

            // Supplier balance: increment when moving to FACTURE (first time)
            if (newStatus === "FACTURE" && prevStatus !== "FACTURE") {
                await (tx as any).supplier.update({
                    where: { id: order.supplierId },
                    data: { balance: { increment: total } }
                })
            }

            // Pay supplier: deduct NET amount (total - withholding) from treasury
            // Per Algerian law: retenue à la source is kept and remitted to DGI
            if (newStatus === "COMPLETED" && accountId && accountId !== "none" && total > 0) {
                const withholdingAmt = Number(order.withholdingAmount ?? 0)
                const netPayment = total - withholdingAmt
                const account = await tx.treasuryAccount.findUnique({ where: { id: accountId, tenantId } })
                if (account) {
                    if (Number(account.balance) < netPayment) throw new Error("Solde insuffisant")
                    const updated = await tx.treasuryAccount.update({
                        where: { id: accountId },
                        data: { balance: { decrement: netPayment } }
                    })
                    await tx.treasuryTransaction.create({
                        data: {
                            accountId,
                            type: "DEBIT",
                            amount: netPayment,
                            balanceBefore: account.balance,
                            balanceAfter: updated.balance,
                            source: "PURCHASE",
                            referenceId: id,
                            description: withholdingAmt > 0
                                ? `Paiement fournisseur #${id.slice(-6)} (net: ${netPayment.toLocaleString()} DA, retenue: ${withholdingAmt.toLocaleString()} DA)`
                                : `Paiement fournisseur - Bon #${id.slice(-6)}`,
                            tenantId
                        }
                    })
                    // If supplier had balance (was invoiced), reduce it
                    if (prevStatus === "FACTURE") {
                        await (tx as any).supplier.update({
                            where: { id: order.supplierId },
                            data: { balance: { decrement: total } }
                        })
                    }
                }
            }
        })

        revalidatePath("/(dashboard)/purchases")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        return { success: `Statut mis à jour: ${newStatus}` }
    } catch (error) {
        console.error("Update Purchase Order Status Error:", error)
        const msg = error instanceof Error ? error.message : "Erreur"
        return { error: msg }
    }
}

export const deletePurchaseOrder = async (id: string) => {
    await checkSubscription();
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        await db.$transaction(async (tx) => {
            const order = await tx.purchaseOrder.findUnique({
                where: { id, tenantId },
                include: { items: true }
            });

            if (!order) throw new Error("Not found");

            // If order was COMPLETED, stock was incremented, so we must restore it
            if (order.status === "COMPLETED") {
                const storeId = (await tx.store.findFirst({ where: { tenantId } }))?.id;
                
                await Promise.all(
                    order.items.map(async (item) => {
                        if (storeId) {
                            await tx.storeProduct.updateMany({
                                where: { storeId, productId: item.productId },
                                data: { stock: { decrement: item.quantity } }
                            });
                        }
                        await tx.product.updateMany({
                            where: { id: item.productId },
                            data: { stock: { decrement: item.quantity } }
                        });
                        
                        // Delete related stock movements
                        await tx.stockMovement.deleteMany({
                            where: { referenceId: id, productId: item.productId }
                        });
                    })
                );
            }

            // Restore supplier balance if we owed them money
            if (order.status === "FACTURE") {
                await tx.supplier.update({
                    where: { id: order.supplierId },
                    data: { balance: { decrement: order.total } }
                });
            }

            await tx.purchaseOrder.delete({ where: { id, tenantId } });
        });

        revalidatePath("/(dashboard)/purchases")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        return { success: "Supprimé et stock restauré" }
    } catch { return { error: "Erreur lors de la suppression" } }
}
