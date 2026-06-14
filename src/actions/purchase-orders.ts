"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkSubscription } from "@/lib/subscription"
import cacheMonitor from "@/lib/cache-monitor"
import { PurchaseOrderStatus } from "@prisma/client"

interface PurchaseOrderItemData {
    productId: string
    quantity: number
    costPrice: number
    tvaRate?: number
    serialNumber?: string
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
    paymentAmount?: number
    paymentMethod?: string
    paymentAccountId?: string
    paymentNotes?: string
    createdAt?: Date
}

export const getPurchaseOrders = async (page: number = 1, pageSize: number = 20, search?: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized", purchaseOrders: [], totalCount: 0 }
    const tenantId = session.user.tenantId

    try {
        const whereClause: any = { tenantId }

        if (search) {
            whereClause.OR = [
                { purchaseNumber: { contains: search, mode: 'insensitive' } },
                { supplier: { name: { contains: search, mode: 'insensitive' } } }
            ]
        }

        const safePage = Math.max(1, isNaN(page) ? 1 : page)
        const safePageSize = Math.max(1, isNaN(pageSize) ? 20 : pageSize)

        const [purchaseOrders, totalCount] = await Promise.all([
            db.purchaseOrder.findMany({
                where: whereClause,
                include: {
                    supplier: true,
                    items: { include: { product: true } },
                    account: true
                },
                orderBy: { createdAt: "desc" },
                skip: (safePage - 1) * safePageSize,
                take: safePageSize
            }),
            db.purchaseOrder.count({ where: whereClause })
        ])
        return { purchaseOrders: JSON.parse(JSON.stringify(purchaseOrders)), totalCount }
    } catch (error) {
        console.error("getPurchaseOrders error:", error)
        return { error: "Failed to fetch purchase orders", purchaseOrders: [], totalCount: 0 }
    }
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
        if (!purchaseOrder) return { error: "Not found" }

        const payments = await db.treasuryTransaction.findMany({
            where: { referenceId: id, source: "PURCHASE", tenantId },
            include: { account: true },
            orderBy: { createdAt: "desc" }
        })

        return { 
            purchaseOrder: JSON.parse(JSON.stringify(purchaseOrder)),
            payments: JSON.parse(JSON.stringify(payments))
        }
    } catch { return { error: "Failed to fetch purchase order" } }
}

export async function generatePurchaseNumber(tx: any, tenantId: string, date?: Date) {
    const prefix = "BR"
    const actualDate = date ? new Date(date) : new Date()
    const year = actualDate.getFullYear()
    
    const dd = String(actualDate.getDate()).padStart(2, "0")
    const mm = String(actualDate.getMonth() + 1).padStart(2, "0")
    const yy = String(year).slice(-2)
    const dateStr = `${dd}${mm}${yy}`

    const counter = await tx.sequenceCounter.upsert({
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

    const sequenceStr = String(counter.lastValue).padStart(5, "0")
    return `${prefix}-${dateStr}-${sequenceStr}`
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

            const purchaseNumber = await generatePurchaseNumber(tx, tenantId, data.createdAt)

            const purchaseOrder = await tx.purchaseOrder.create({
                data: {
                    tenantId,
                    supplierId: data.supplierId,
                    storeId: data.storeId || undefined,
                    accountId: (data.accountId && data.accountId !== "none") ? data.accountId : undefined,
                    total: data.total,
                    withholdingAmount,
                    reference: data.reference,
                    purchaseNumber,
                    status: data.status as PurchaseOrderStatus,
                    imageUrl1: data.imageUrl1 || undefined,
                    imageUrl2: data.imageUrl2 || undefined,
                    imageUrl3: data.imageUrl3 || undefined,
                    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            tvaRate: item.tvaRate ?? 19,
                            serialNumber: item.serialNumber ?? null
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
                        
                        const globalStockBefore = pBefore?.stock || 0;
                        const globalStockAfter = globalStockBefore + item.quantity;

                        // CUMP calculation (Weighted Average Cost / PMP)
                        const oldTotalValue = globalStockBefore > 0 ? globalStockBefore * Number(pBefore?.cost || 0) : 0;
                        const newPurchaseValue = item.quantity * Number(item.costPrice);
                        const newCump = globalStockAfter > 0 
                            ? (oldTotalValue + newPurchaseValue) / globalStockAfter 
                            : Number(item.costPrice);

                        const stockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : globalStockBefore;
                        const stockAfter = stockBefore + item.quantity;

                        await tx.product.update({
                            where: { id: item.productId },
                            data: { 
                                cost: newCump,
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
                                reason: `Achat Fournisseur N° ${purchaseOrder.purchaseNumber || purchaseOrder.id.slice(-6)}: CUMP=${newCump.toFixed(2)}`,
                                tenantId,
                                createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                            }
                        });
                    })
                );
            }

            // If FACTURE or BON_LIVRAISON: add to supplier balance (we owe them)
            if (data.status === "FACTURE" || data.status === "BON_LIVRAISON") {
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
                                ? `Paiement fournisseur #${purchaseOrder.purchaseNumber || purchaseOrder.id.slice(-6)} (net: ${netPayment.toLocaleString()} DA, retenue: ${Number(withholdingAmount).toLocaleString()} DA)`
                                : `Bon de commande #${purchaseOrder.purchaseNumber || purchaseOrder.id.slice(-6)} - Paiement`,
                            tenantId,
                            date: data.createdAt ? new Date(data.createdAt) : undefined,
                            createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                        }
                    })
                }
            }

            // If there's an initial payment amount provided (only for non-COMPLETED since COMPLETED is already fully paid above)
            if (data.status !== "COMPLETED" && data.paymentAmount && data.paymentAmount > 0 && data.paymentAccountId && data.paymentAccountId !== "none") {
                const payAccount = await tx.treasuryAccount.findUnique({
                    where: { id: data.paymentAccountId, tenantId }
                });
                if (!payAccount) throw new Error("Compte de trésorerie introuvable");
                if (Number(payAccount.balance) < data.paymentAmount) {
                    throw new Error("Solde insuffisant dans la caisse/banque sélectionnée");
                }

                // 1. Debit treasury account
                const updatedAccount = await tx.treasuryAccount.update({
                    where: { id: data.paymentAccountId },
                    data: { balance: { decrement: data.paymentAmount } }
                });

                // 2. Create Treasury Transaction
                const payMethod = data.paymentMethod || "CASH";
                await tx.treasuryTransaction.create({
                    data: {
                        tenantId,
                        accountId: data.paymentAccountId,
                        type: "DEBIT",
                        amount: data.paymentAmount,
                        balanceBefore: payAccount.balance,
                        balanceAfter: updatedAccount.balance,
                        source: "PURCHASE",
                        referenceId: purchaseOrder.id,
                        description: `Règlement Initial [${payMethod}] Bon #${purchaseOrder.purchaseNumber || purchaseOrder.id.slice(-8).toUpperCase()}${data.paymentNotes ? ` - ${data.paymentNotes}` : ""}`,
                        date: data.createdAt ? new Date(data.createdAt) : undefined,
                        createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                    }
                });

                // 3. Decrement Supplier Balance (for FACTURE and BON_LIVRAISON, since the full amount was added to supplier balance)
                if (data.status === "FACTURE" || data.status === "BON_LIVRAISON") {
                    await tx.supplier.update({
                        where: { id: data.supplierId },
                        data: { balance: { decrement: data.paymentAmount } }
                    });
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

        const stockStatuses = ["BON_LIVRAISON", "FACTURE", "COMPLETED"]
        const isStockStatus = stockStatuses.includes(existing.status)

        await db.$transaction(async (tx) => {
            const stockStoreId = existing.storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id;

            if (isStockStatus) {
                // Fetch old items to revert their stocks
                const oldItems = await tx.purchaseOrderItem.findMany({
                    where: { purchaseOrderId: id }
                })

                for (const oldItem of oldItems) {
                    const p = await tx.product.findUnique({ where: { id: oldItem.productId }, include: { storeProducts: true } })
                    if (p) {
                        const globalStockAfter = Math.max(0, (p.stock || 0) - oldItem.quantity)
                        await tx.product.update({
                            where: { id: oldItem.productId },
                            data: { stock: globalStockAfter }
                        })
                        if (stockStoreId) {
                            const spBefore = p.storeProducts.find(sp => sp.storeId === stockStoreId)
                            const storeStockAfter = Math.max(0, (spBefore?.stock || 0) - oldItem.quantity)
                            await tx.storeProduct.upsert({
                                where: { storeId_productId: { storeId: stockStoreId, productId: oldItem.productId } },
                                update: { stock: storeStockAfter },
                                create: { storeId: stockStoreId, productId: oldItem.productId, stock: storeStockAfter }
                            })
                        }
                    }
                }
            }

            // Delete existing old items
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } })

            let purchaseNumber = existing.purchaseNumber
            if (!purchaseNumber) {
                purchaseNumber = await generatePurchaseNumber(tx, tenantId, data.createdAt || existing.createdAt)
            }

            // Update order details
            await tx.purchaseOrder.update({
                where: { id },
                data: {
                    supplierId: data.supplierId,
                    total: data.total,
                    reference: data.reference,
                    purchaseNumber,
                    status: data.status as PurchaseOrderStatus,
                    accountId: (data.accountId && data.accountId !== "none") ? data.accountId : undefined,
                    imageUrl1: data.imageUrl1 || undefined,
                    imageUrl2: data.imageUrl2 || undefined,
                    imageUrl3: data.imageUrl3 || undefined,
                    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            tvaRate: item.tvaRate ?? 19,
                            serialNumber: item.serialNumber ?? null
                        }))
                    }
                }
            })

            if (data.createdAt) {
                const newDate = new Date(data.createdAt)
                await tx.stockMovement.updateMany({
                    where: { referenceId: id, tenantId },
                    data: { createdAt: newDate }
                })
                await tx.treasuryTransaction.updateMany({
                    where: { referenceId: id, source: "PURCHASE", tenantId },
                    data: {
                        date: newDate,
                        createdAt: newDate
                    }
                })
            }

            if (isStockStatus) {
                // Apply new stock additions and recalculate CUMP/PMP
                for (const item of data.items) {
                    const pBefore = await tx.product.findUnique({ where: { id: item.productId }, include: { storeProducts: true } })
                    if (!pBefore) continue

                    const globalStockBefore = pBefore.stock || 0
                    const globalStockAfter = globalStockBefore + item.quantity

                    // CUMP calculation (Weighted Average Cost)
                    const oldTotalValue = globalStockBefore > 0 ? globalStockBefore * Number(pBefore.cost) : 0
                    const newPurchaseValue = item.quantity * Number(item.costPrice)
                    const newCump = globalStockAfter > 0 
                        ? (oldTotalValue + newPurchaseValue) / globalStockAfter 
                        : Number(item.costPrice)

                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            cost: newCump,
                            stock: globalStockAfter
                        }
                    })

                    if (stockStoreId) {
                        const spBefore = pBefore.storeProducts.find(sp => sp.storeId === stockStoreId)
                        const stockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : globalStockBefore
                        const stockAfter = stockBefore + item.quantity

                        await tx.storeProduct.upsert({
                            where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                            update: { stock: stockAfter },
                            create: { storeId: stockStoreId, productId: item.productId, stock: stockAfter, minStock: spBefore?.minStock || 10 }
                        })

                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                type: "PURCHASE",
                                quantity: item.quantity,
                                stockBefore,
                                stockAfter,
                                referenceId: id,
                                reason: `Modification Achat (Corrigé) N° ${id.slice(-6)}: CUMP=${newCump.toFixed(2)}`,
                                tenantId,
                                createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                            }
                        })
                    }
                }
            }

            // Deduct nets from treasury if order goes COMPLETED now
            if (data.status === "COMPLETED" && existing.status !== "COMPLETED" && data.accountId && data.accountId !== "none" && data.total > 0) {
                const prevPayments = await tx.treasuryTransaction.findMany({
                    where: { referenceId: id, source: "PURCHASE", tenantId }
                })
                const alreadyPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0)
                
                const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId }, select: { withholdingRate: true } })
                const withholdingRate = supplier?.withholdingRate ?? 0
                const withholdingAmount = withholdingRate > 0 ? data.total * (withholdingRate / 100) : 0
                
                const netTotal = data.total - Number(withholdingAmount)
                const netPayment = netTotal - alreadyPaid

                if (netPayment > 0) {
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
                                referenceId: id,
                                description: withholdingAmount > 0 
                                    ? `Paiement solde final (net: ${netPayment.toLocaleString()} DA, retenue: ${Number(withholdingAmount).toLocaleString()} DA)`
                                    : `Mise à jour Bon - Solde Payé`,
                                tenantId
                            }
                        })
                    }
                }
            }

            // ─── Payment Update Logic ───
            const existingPayment = await tx.treasuryTransaction.findFirst({
                where: { referenceId: id, source: "PURCHASE", tenantId }
            });
            const oldPaymentAmount = existingPayment ? Number(existingPayment.amount) : 0;
            const oldPaymentAccountId = existingPayment ? existingPayment.accountId : null;

            const newPaymentAmount = data.paymentAmount || 0;
            const newPaymentAccountId = data.paymentAccountId;
            const newPaymentMethod = data.paymentMethod || "CASH";
            const newPaymentNotes = data.paymentNotes || "";

            if (existingPayment) {
                if (newPaymentAmount === 0 || !newPaymentAccountId || newPaymentAccountId === "none") {
                    // Delete the payment transaction and refund old account
                    await tx.treasuryTransaction.delete({ where: { id: existingPayment.id } });
                    await tx.treasuryAccount.update({
                        where: { id: oldPaymentAccountId! },
                        data: { balance: { increment: oldPaymentAmount } }
                    });
                } else {
                    // Update the payment
                    if (oldPaymentAccountId === newPaymentAccountId) {
                        const account = await tx.treasuryAccount.findUnique({ where: { id: newPaymentAccountId, tenantId } });
                        if (!account) throw new Error("Compte de trésorerie introuvable");
                        
                        if (Number(account.balance) + oldPaymentAmount < newPaymentAmount) {
                            throw new Error("Solde insuffisant dans la caisse/banque sélectionnée");
                        }

                        const updatedAcc = await tx.treasuryAccount.update({
                            where: { id: newPaymentAccountId },
                            data: { balance: { decrement: newPaymentAmount - oldPaymentAmount } }
                        });

                        await tx.treasuryTransaction.update({
                            where: { id: existingPayment.id },
                            data: {
                                amount: newPaymentAmount,
                                balanceBefore: Number(updatedAcc.balance) + newPaymentAmount,
                                balanceAfter: updatedAcc.balance,
                                description: `Règlement Initial [${newPaymentMethod}] Bon #${existing.id.slice(-8).toUpperCase()}${newPaymentNotes ? ` - ${newPaymentNotes}` : ""}`
                            }
                        });
                    } else {
                        // Different accounts: refund old, debit new
                        await tx.treasuryAccount.update({
                            where: { id: oldPaymentAccountId! },
                            data: { balance: { increment: oldPaymentAmount } }
                        });

                        const newAccount = await tx.treasuryAccount.findUnique({ where: { id: newPaymentAccountId, tenantId } });
                        if (!newAccount) throw new Error("Compte de trésorerie introuvable");

                        if (Number(newAccount.balance) < newPaymentAmount) {
                            throw new Error("Solde insuffisant dans la caisse/banque sélectionnée");
                        }

                        const updatedAcc = await tx.treasuryAccount.update({
                            where: { id: newPaymentAccountId },
                            data: { balance: { decrement: newPaymentAmount } }
                        });

                        await tx.treasuryTransaction.update({
                            where: { id: existingPayment.id },
                            data: {
                                accountId: newPaymentAccountId,
                                amount: newPaymentAmount,
                                balanceBefore: Number(updatedAcc.balance) + newPaymentAmount,
                                balanceAfter: updatedAcc.balance,
                                description: `Règlement Initial [${newPaymentMethod}] Bon #${existing.id.slice(-8).toUpperCase()}${newPaymentNotes ? ` - ${newPaymentNotes}` : ""}`
                            }
                        });
                    }
                }
            } else {
                if (newPaymentAmount > 0 && newPaymentAccountId && newPaymentAccountId !== "none") {
                    const payAccount = await tx.treasuryAccount.findUnique({ where: { id: newPaymentAccountId, tenantId } });
                    if (!payAccount) throw new Error("Compte de trésorerie introuvable");

                    if (Number(payAccount.balance) < newPaymentAmount) {
                        throw new Error("Solde insuffisant dans la caisse/banque sélectionnée");
                    }

                    const updatedAcc = await tx.treasuryAccount.update({
                        where: { id: newPaymentAccountId },
                        data: { balance: { decrement: newPaymentAmount } }
                    });

                    await tx.treasuryTransaction.create({
                        data: {
                            tenantId,
                            accountId: newPaymentAccountId,
                            type: "DEBIT",
                            amount: newPaymentAmount,
                            balanceBefore: payAccount.balance,
                            balanceAfter: updatedAcc.balance,
                            source: "PURCHASE",
                            referenceId: id,
                            description: `Règlement Initial [${newPaymentMethod}] Bon #${existing.id.slice(-8).toUpperCase()}${newPaymentNotes ? ` - ${newPaymentNotes}` : ""}`
                        }
                    });
                }
            }

            // ─── Supplier Balance Adjustments ───
            const oldNet = (existing.status === "FACTURE" || existing.status === "BON_LIVRAISON") ? (Number(existing.total) - oldPaymentAmount) : 0;
            const newNet = (data.status === "FACTURE" || data.status === "BON_LIVRAISON") ? (data.total - newPaymentAmount) : 0;

            if (existing.supplierId === data.supplierId) {
                if (newNet !== oldNet) {
                    await tx.supplier.update({
                        where: { id: data.supplierId },
                        data: { balance: { increment: newNet - oldNet } }
                    });
                }
            } else {
                if (oldNet !== 0) {
                    await tx.supplier.update({
                        where: { id: existing.supplierId },
                        data: { balance: { decrement: oldNet } }
                    });
                }
                if (newNet !== 0) {
                    await tx.supplier.update({
                        where: { id: data.supplierId },
                        data: { balance: { increment: newNet } }
                    });
                }
            }
        })

        revalidatePath("/(dashboard)/purchases")
        return { success: "Bon de commande modifié avec succès" }
    } catch (error) {
        console.error("Update Purchase Order Error:", error)
        const msg = error instanceof Error ? error.message : "Erreur lors de la modification"
        return { error: msg }
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
            let purchaseNumber = order.purchaseNumber
            if (!purchaseNumber) {
                purchaseNumber = await generatePurchaseNumber(tx, tenantId, order.createdAt)
            }

            await tx.purchaseOrder.update({
                where: { id },
                data: {
                    status: newStatus as PurchaseOrderStatus,
                    purchaseNumber
                }
            })

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
                        const globalStockBefore = pBefore.stock || 0;
                        const globalStockAfter = globalStockBefore + item.quantity;

                        const stockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : globalStockBefore;
                        const stockAfter = stockBefore + item.quantity;

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
                                reason: `Achat Fournisseur N° ${purchaseNumber || order.id.slice(-6)}: ${newStatus} (CUMP: ${newCump.toFixed(2)})`,
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
                                reason: `Annulation Achat N° ${purchaseNumber || order.id.slice(-6)}`,
                                tenantId
                            }
                        });
                    })
                );
            }

            // Supplier balance: increment when moving to FACTURE or BON_LIVRAISON (first time)
            const isNewImpactful = newStatus === "FACTURE" || newStatus === "BON_LIVRAISON";
            const isPrevImpactful = prevStatus === "FACTURE" || prevStatus === "BON_LIVRAISON";

            if (isNewImpactful && !isPrevImpactful) {
                const prevPayments = await tx.treasuryTransaction.findMany({
                    where: { referenceId: id, source: "PURCHASE", tenantId }
                })
                const alreadyPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0)
                const balanceIncrement = total - alreadyPaid

                await (tx as any).supplier.update({
                    where: { id: order.supplierId },
                    data: { balance: { increment: balanceIncrement } }
                })
            } else if (!isNewImpactful && isPrevImpactful && newStatus !== "COMPLETED") {
                const prevPayments = await tx.treasuryTransaction.findMany({
                    where: { referenceId: id, source: "PURCHASE", tenantId }
                })
                const alreadyPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0)
                const balanceDecrement = total

                await (tx as any).supplier.update({
                    where: { id: order.supplierId },
                    data: { balance: { decrement: balanceDecrement } }
                })
            }

            // Pay supplier: deduct NET amount (total - withholding) from treasury
            // Per Algerian law: retenue à la source is kept and remitted to DGI
            if (newStatus === "COMPLETED" && accountId && accountId !== "none" && total > 0) {
                const prevPayments = await tx.treasuryTransaction.findMany({
                    where: { referenceId: id, source: "PURCHASE", tenantId }
                })
                const alreadyPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0)

                const withholdingAmt = Number(order.withholdingAmount ?? 0)
                const netTotal = total - withholdingAmt
                const netPayment = netTotal - alreadyPaid

                if (netPayment > 0) {
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
                                    ? `Paiement solde final #${purchaseNumber || id.slice(-6)} (net: ${netPayment.toLocaleString()} DA, retenue: ${withholdingAmt.toLocaleString()} DA)`
                                    : `Paiement solde final - Bon #${purchaseNumber || id.slice(-6)}`,
                                tenantId
                            }
                        })
                        // If supplier had balance (was invoiced or BL received), reduce it
                        if (prevStatus === "FACTURE" || prevStatus === "BON_LIVRAISON") {
                            await (tx as any).supplier.update({
                                where: { id: order.supplierId },
                                data: { balance: { decrement: total - alreadyPaid } }
                            })
                        }
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

            if (!order) throw new Error("Bon d'achat introuvable");

            // 1. Revert any stock changes (if status was BON_LIVRAISON, FACTURE, or COMPLETED)
            const stockStatuses = ["BON_LIVRAISON", "FACTURE", "COMPLETED"];
            if (stockStatuses.includes(order.status)) {
                const storeId = order.storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id;
                
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

            // 2. Refund and delete all related treasury transactions (cash/bank payments)
            const transactions = await tx.treasuryTransaction.findMany({
                where: { referenceId: id, source: "PURCHASE", tenantId }
            });

            const alreadyPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

            for (const t of transactions) {
                // Refund the treasury account balance
                await tx.treasuryAccount.update({
                    where: { id: t.accountId },
                    data: { balance: { increment: t.amount } }
                });
            }

            // Delete the treasury transactions
            await tx.treasuryTransaction.deleteMany({
                where: { referenceId: id, source: "PURCHASE", tenantId }
            });

            // 3. Restore supplier balance if the order had incremented it (FACTURE or BON_LIVRAISON status)
            if (["FACTURE", "BON_LIVRAISON"].includes(order.status)) {
                const outstandingDebt = Number(order.total) - alreadyPaid;
                if (outstandingDebt !== 0) {
                    await tx.supplier.update({
                        where: { id: order.supplierId },
                        data: { balance: { decrement: outstandingDebt } }
                    });
                }
            }

            // 4. Finally delete the order itself (cascade deletes items)
            await tx.purchaseOrder.delete({ where: { id, tenantId } });
        });

        revalidatePath("/(dashboard)/purchases")
        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)
        return { success: "Supprimé et stock/trésorerie restaurés avec succès" }
    } catch (error) {
        console.error("Delete Purchase Order Error:", error)
        const msg = error instanceof Error ? error.message : "Erreur lors de la suppression"
        return { error: msg }
    }
}

export const createSupplierPayment = async (data: {
    purchaseOrderId: string
    accountId: string
    amount: number
    paymentMethod: string
    notes?: string
}) => {
    await checkSubscription();
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    if (data.amount <= 0) return { error: "Le montant doit être supérieur à 0" }

    try {
        const result = await db.$transaction(async (tx) => {
            const order = await tx.purchaseOrder.findUnique({
                where: { id: data.purchaseOrderId, tenantId }
            })
            if (!order) throw new Error("Bon d'achat introuvable")

            const account = await tx.treasuryAccount.findUnique({
                where: { id: data.accountId, tenantId }
            })
            if (!account) throw new Error("Compte de trésorerie introuvable")

            if (Number(account.balance) < data.amount) {
                throw new Error("Solde insuffisant dans la caisse/banque sélectionnée")
            }

            // 1. Debit treasury account
            const updatedAccount = await tx.treasuryAccount.update({
                where: { id: data.accountId },
                data: { balance: { decrement: data.amount } }
            })

            // 2. Create Treasury Transaction
            const transaction = await tx.treasuryTransaction.create({
                data: {
                    tenantId,
                    accountId: data.accountId,
                    type: "DEBIT",
                    amount: data.amount,
                    balanceBefore: account.balance,
                    balanceAfter: updatedAccount.balance,
                    source: "PURCHASE",
                    referenceId: data.purchaseOrderId,
                    description: `Paiement Partiel [${data.paymentMethod}] Bon #${order.id.slice(-8).toUpperCase()}${data.notes ? ` - ${data.notes}` : ""}`
                }
            })

            // 3. Decrement Supplier Balance
            await tx.supplier.update({
                where: { id: order.supplierId },
                data: { balance: { decrement: data.amount } }
            })

            return transaction
        })

        revalidatePath("/(dashboard)/purchases")
        return { success: "Règlement enregistré avec succès", transaction: JSON.parse(JSON.stringify(result)) }
    } catch (error) {
        console.error("Create Supplier Payment Error:", error)
        const msg = error instanceof Error ? error.message : "Erreur lors de l'enregistrement du règlement"
        return { error: msg }
    }
}

