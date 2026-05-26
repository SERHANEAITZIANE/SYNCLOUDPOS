"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getTransfers() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const transfers = await db.transfer.findMany({
            where: { tenantId },
            include: {
                fromStore: { select: { name: true } },
                toStore: { select: { name: true } },
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { data: transfers }
    } catch (error: any) {
        return { error: error.message || "Failed to fetch transfers" }
    }
}

export async function createTransfer(data: {
    fromStoreId: string,
    toStoreId: string,
    notes?: string,
    items: { productId: string, quantity: number }[]
}) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        // Generate a reference
        const count = await db.transfer.count({ where: { tenantId } })
        const reference = `TRF-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`

        const transfer = await db.transfer.create({
            data: {
                reference,
                tenantId,
                fromStoreId: data.fromStoreId,
                toStoreId: data.toStoreId,
                notes: data.notes,
                createdById: session.user.id,
                status: "PENDING",
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            }
        });
        
        return { success: "Transfer created successfully", data: transfer }
    } catch (error: any) {
        return { error: error.message || "Failed to create transfer" }
    }
}

export async function updateTransferStatus(id: string, status: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId
    if (!tenantId) return { error: "Tenant ID missing" }

    try {
        const transfer = await db.transfer.findUnique({ 
            where: { id, tenantId },
            include: { items: true }
        });
        if (!transfer) return { error: "Transfer not found" }

        if (status === "COMPLETED" && transfer.status !== "COMPLETED") {
            // Process stock movements
            await db.$transaction(async (tx) => {
                for (const item of transfer.items) {
                    // Reduce from fromStore
                    const fromStoreProduct = await tx.storeProduct.findUnique({
                        where: { storeId_productId: { storeId: transfer.fromStoreId, productId: item.productId } }
                    });
                    if (!fromStoreProduct || fromStoreProduct.stock < item.quantity) {
                        throw new Error(`Stock insuffisant pour le produit ID: ${item.productId} dans le dépôt source.`);
                    }

                    await tx.storeProduct.update({
                        where: { id: fromStoreProduct.id },
                        data: { stock: { decrement: item.quantity } }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: "TRANSFER_OUT",
                            quantity: item.quantity,
                            stockBefore: fromStoreProduct.stock,
                            stockAfter: fromStoreProduct.stock - item.quantity,
                            referenceId: transfer.id,
                            reason: `Transfert vers ${transfer.toStoreId}`,
                            userId: session.user.id,
                            tenantId,
                            storeId: transfer.fromStoreId
                        }
                    });

                    // Add to toStore
                    const toStoreProduct = await tx.storeProduct.findUnique({
                        where: { storeId_productId: { storeId: transfer.toStoreId, productId: item.productId } }
                    });

                    let toStockBefore = 0;
                    if (toStoreProduct) {
                        toStockBefore = toStoreProduct.stock;
                        await tx.storeProduct.update({
                            where: { id: toStoreProduct.id },
                            data: { stock: { increment: item.quantity } }
                        });
                    } else {
                        await tx.storeProduct.create({
                            data: {
                                storeId: transfer.toStoreId,
                                productId: item.productId,
                                stock: item.quantity
                            }
                        });
                    }

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: "TRANSFER_IN",
                            quantity: item.quantity,
                            stockBefore: toStockBefore,
                            stockAfter: toStockBefore + item.quantity,
                            referenceId: transfer.id,
                            reason: `Transfert depuis ${transfer.fromStoreId}`,
                            userId: session.user.id,
                            tenantId,
                            storeId: transfer.toStoreId
                        }
                    });
                }

                await tx.transfer.update({
                    where: { id },
                    data: { status, completedAt: new Date() }
                });
            });
        } else if (status === "SENT") {
            await db.transfer.update({
                where: { id, tenantId },
                data: { status, sentAt: new Date() }
            });
        } else {
            await db.transfer.update({
                where: { id, tenantId },
                data: { status }
            });
        }
        
        return { success: "Status updated successfully" }
    } catch (error: any) {
        return { error: error.message || "Failed to update transfer status" }
    }
}
