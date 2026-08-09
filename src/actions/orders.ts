"use server"

import * as z from "zod"
import { db } from "@/lib/db"
import { OrderSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { generateReceiptNumber } from "./sales-orders"
import { checkSubscription } from "@/lib/subscription"
import { logAudit } from "./audit-log"
import cacheMonitor from "@/lib/cache-monitor"
import { hasPermission } from "@/lib/rbac"
import { applyPromotionsToCart } from "@/lib/promotions-engine"

// z.input, not z.infer: callers pass pre-validation input, where fields carrying a
// .default() (subtotal, tvaAmount, stampTax, paymentMethod, status, …) are optional.
// `values` is only ever handed to safeParse below, which applies those defaults.
export const createOrder = async (values: z.input<typeof OrderSchema>) => {
    const session = await auth()
    const userId = session?.user?.id
    const tenantId = session?.user?.tenantId
    const defaultStoreId = session?.user?.defaultStoreId

    if (!userId || !tenantId) {
        return { error: "Unauthorized" }
    }
    if (!(await hasPermission("pos:create"))) {
        return { error: "Access denied" }
    }

    const validatedFields = OrderSchema.safeParse(values)

    if (!validatedFields.success) {
        console.error("Order Validation Error: ", validatedFields.error.format())
        return { error: "Invalid fields!" }
    }

    const { items: submittedItems, paymentMethod, paidAmount: submittedPaidAmount, customerId, accountId: submittedAccountId, status, originalOrderId, loyaltyPointsUsed, userId: selectedUserId, idempotencyKey } = validatedFields.data

    try {
        // Check subscription INSIDE try/catch so errors are returned properly
        await checkSubscription();

        if (idempotencyKey) {
            const existingOrder = await db.order.findFirst({
                where: { idempotencyKey, tenantId }
            });
            if (existingOrder) {
                const existingSalesOrder = await db.salesOrder.findFirst({
                    where: { idempotencyKey, tenantId }
                });
                let previousBalance = 0;
                let newBalance = 0;
                if (existingOrder.customerId) {
                    const customer = await db.customer.findFirst({
                        where: { id: existingOrder.customerId, tenantId }
                    });
                    newBalance = Number(customer?.balance || 0);
                    const debt = Number(existingOrder.total) - Number(existingOrder.paidAmount);
                    previousBalance = newBalance - debt;
                }
                return {
                    success: "Commande créée avec succès!",
                    orderId: existingOrder.id,
                    receiptNumber: existingSalesOrder?.receiptNumber || `POS-${existingOrder.id.slice(-6).toUpperCase()}`,
                    previousBalance,
                    newBalance
                }
            }
        }

        if (status === "CANCELLED") {
            return { error: "A new sale cannot be created as cancelled." }
        }

        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            select: {
                tvaEnabled: true,
                posTimbreEnabled: true,
                stampTaxEnabled: true,
                posCashRounding: true,
                posVendorRequired: true,
                loyaltyDaPerPoint: true,
            }
        })
        if (!tenant) return { error: "Tenant not found." }

        const productIds = [...new Set(submittedItems.map(item => item.productId))]
        const now = new Date()
        const [customer, products, activePromotions, selectedUser] = await Promise.all([
            customerId
                ? db.customer.findFirst({
                    where: { id: customerId, tenantId },
                    select: { id: true, clientType: true, loyaltyPoints: true }
                })
                : Promise.resolve(null),
            db.product.findMany({
                where: { id: { in: productIds }, tenantId, isArchived: false },
                select: {
                    id: true,
                    price: true,
                    dealerPrice: true,
                    wholesalePrice: true,
                    cost: true,
                    tvaRate: true,
                    categoryId: true,
                }
            }),
            db.promotion.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    OR: [
                        { startsAt: null, endsAt: null },
                        { startsAt: { lte: now }, endsAt: { gte: now } },
                        { startsAt: { lte: now }, endsAt: null },
                        { startsAt: null, endsAt: { gte: now } }
                    ]
                }
            }),
            selectedUserId
                ? db.user.findFirst({
                    where: {
                        id: selectedUserId,
                        OR: [
                            { tenantId },
                            { tenantUsers: { some: { tenantId } } }
                        ]
                    },
                    select: { id: true }
                })
                : Promise.resolve(null)
        ])

        if (customerId && !customer) return { error: "Customer not found or not authorized." }
        if (products.length !== productIds.length) {
            return { error: "One or more products are missing or not authorized." }
        }
        if (selectedUserId && !selectedUser) {
            return { error: "Seller not found or not authorized." }
        }
        if (tenant.posVendorRequired && !selectedUserId) {
            return { error: "A seller must be selected." }
        }
        if (loyaltyPointsUsed > 0 && (!customer || loyaltyPointsUsed > customer.loyaltyPoints)) {
            return { error: "Insufficient loyalty points." }
        }

        const canOverridePrice = await hasPermission("pos:update")
        const productMap = new Map(products.map(product => [product.id, product]))
        const clientType = customer?.clientType || "RETAIL"
        const promotionInput = submittedItems.map((item, index) => {
            const product = productMap.get(item.productId)!
            let tierPrice = Number(product.price)
            if (clientType === "RESELLER" && product.dealerPrice != null) {
                tierPrice = Number(product.dealerPrice)
            } else if (clientType === "WHOLESALE" && product.wholesalePrice != null) {
                tierPrice = Number(product.wholesalePrice)
            }

            return {
                id: item.productId + ":" + index,
                productId: item.productId,
                name: item.productId,
                quantity: item.quantity,
                price: canOverridePrice ? item.price : tierPrice,
                categoryId: product.categoryId || undefined,
                tvaRate: Number(product.tvaRate),
                serialNumber: item.serialNumber,
            }
        })
        const promotionResult = applyPromotionsToCart(
            promotionInput,
            activePromotions.map(promotion => ({
                id: promotion.id,
                type: promotion.type,
                targetScope: promotion.targetScope,
                scopeId: promotion.scopeId,
                discountType: promotion.discountType,
                discountValue: Number(promotion.discountValue),
                triggerQty: promotion.triggerQty,
            }))
        )

        const items = promotionResult.items.map((promotedItem, index) => {
            const submittedItem = submittedItems[index]
            const product = productMap.get(promotedItem.productId)!
            const itemDiscount = promotedItem.discountAmount || 0
            const price = promotedItem.quantity > 0
                ? promotedItem.price - (itemDiscount / promotedItem.quantity)
                : promotedItem.price
            const tvaRate = tenant.tvaEnabled ? Number(product.tvaRate) : 0
            const priceHt = tvaRate > 0 ? price / (1 + tvaRate / 100) : price
            return {
                ...submittedItem,
                price,
                priceHt,
                tvaRate,
                costAtSale: product.cost == null ? undefined : Number(product.cost),
            }
        })

        const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const pointsDiscount = loyaltyPointsUsed > 0
            ? loyaltyPointsUsed / Math.max(1, tenant.loyaltyDaPerPoint)
            : 0
        const discountedItemsTotal = Math.max(0, itemsTotal - pointsDiscount)
        const subtotalBeforePoints = tenant.tvaEnabled
            ? items.reduce((sum, item) => sum + (item.priceHt || item.price) * item.quantity, 0)
            : itemsTotal
        const discountRatio = itemsTotal > 0 ? discountedItemsTotal / itemsTotal : 1
        const subtotal = subtotalBeforePoints * discountRatio
        const tvaAmount = tenant.tvaEnabled ? Math.max(0, discountedItemsTotal - subtotal) : 0

        const getStampTaxAmount = (amount: number) => {
            if (amount <= 300) return 0
            if (amount <= 30000) return Math.max(5, Math.ceil(amount / 100))
            if (amount <= 100000) return Math.max(5, Math.ceil(amount / 100) * 1.5)
            return Math.min(10000, Math.ceil(amount / 100) * 2)
        }
        const stampTax = tenant.stampTaxEnabled && tenant.posTimbreEnabled && paymentMethod === "CASH"
            ? getStampTaxAmount(discountedItemsTotal)
            : 0
        const unroundedTotal = discountedItemsTotal + stampTax
        const total = paymentMethod === "CASH" && tenant.posCashRounding
            ? Math.round(unroundedTotal / 5) * 5
            : unroundedTotal
        const paidAmount = submittedPaidAmount ?? (paymentMethod === "TERM" ? 0 : total)

        let accountId = submittedAccountId
        if (paidAmount > 0) {
            const account = accountId
                ? await db.treasuryAccount.findFirst({ where: { id: accountId, tenantId }, select: { id: true } })
                : await db.treasuryAccount.findFirst({
                    where: { tenantId, type: { in: ["CAISSE", "CASH", "BANK"] } },
                    select: { id: true },
                    orderBy: { createdAt: "asc" }
                })
            if (!account) {
                return { error: "No valid treasury account is configured." }
            }
            accountId = account.id
        }

        const selectedStore = defaultStoreId
            ? await db.store.findFirst({ where: { id: defaultStoreId, tenantId }, select: { id: true } })
            : null
        const fallbackStore = selectedStore || await db.store.findFirst({
            where: { tenantId },
            select: { id: true },
            orderBy: { createdAt: "asc" }
        })
        const storeIdToUse = fallbackStore?.id
        let receiptNumber = await generateReceiptNumber("ORDER", tenantId);

        if (!storeIdToUse) {
            return { error: "Aucun magasin trouvé. Veuillez configurer un magasin d'abord." }
        }

        // Transaction to ensure order creation and stock update happen together
        const order = await db.$transaction(async (tx) => {
            let finalCustomerId = customerId;

            // Define fallback 'DIVERS' customer
            if (!finalCustomerId) {
                let diversCustomer = await tx.customer.findFirst({
                    where: { tenantId, name: { equals: "DIVERS" } }
                });
                if (!diversCustomer) {
                    diversCustomer = await tx.customer.create({
                        data: { tenantId, name: "DIVERS" }
                    });
                }
                finalCustomerId = diversCustomer.id;
            }

            let oldSalesOrder: any = null;

            // --- EDIT MODE LOGIC ---
            if (originalOrderId) {
                oldSalesOrder = await tx.salesOrder.findFirst({
                    where: { id: originalOrderId, tenantId },
                    include: { items: true }
                });

                if (oldSalesOrder && oldSalesOrder.receiptNumber) {
                    receiptNumber = oldSalesOrder.receiptNumber;

                    // 1. Revert Old Stock (Parallelized)
                    await Promise.all(
                        oldSalesOrder.items.map(async (item: any) => {
                            const stockStoreId = oldSalesOrder.storeId || (await tx.store.findFirst({ where: { tenantId } }))?.id;
                            const pBefore = await tx.product.findFirst({ where: { id: item.productId, tenantId }, include: { storeProducts: true } });
                            const spBefore = pBefore?.storeProducts?.find(sp => sp.storeId === stockStoreId);
                            const stockBefore = spBefore?.stock !== undefined && spBefore?.stock !== null ? spBefore.stock : 0;
                            const stockAfter = stockBefore + item.quantity;

                            if (stockStoreId) {
                                await tx.storeProduct.upsert({
                                    where: { storeId_productId: { storeId: stockStoreId, productId: item.productId } },
                                    update: { stock: { increment: item.quantity } },
                                    create: { storeId: stockStoreId, productId: item.productId, stock: item.quantity, minStock: spBefore?.minStock || 10 }
                                });
                            }

                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { increment: item.quantity } }
                            });

                            await tx.stockMovement.create({
                                data: {
                                    productId: item.productId,
                                    type: "RETURN",
                                    quantity: item.quantity,
                                    stockBefore,
                                    stockAfter,
                                    referenceId: oldSalesOrder.id,
                                    reason: `Edition/Annulation Vente N° ${receiptNumber}`,
                                    userId,
                                    tenantId,
                                    createdAt: oldSalesOrder.createdAt
                                }
                            });
                        })
                    );

                    // 2. Clear Old SalesOrderItems (we will recreate them)
                    await tx.salesOrderItem.deleteMany({
                        where: { salesOrderId: originalOrderId }
                    });

                    // Revert old customer balance and loyalty points using oldSalesOrder directly
                    const oldPaidAmount = Number(oldSalesOrder.amountPaid || 0);
                    const oldTotal = Number(oldSalesOrder.total || 0);
                    const oldDebt = oldTotal - oldPaidAmount;

                    if (oldSalesOrder.customerId) {
                        if (oldDebt !== 0) {
                            await tx.customer.update({
                                where: { id: oldSalesOrder.customerId },
                                data: { balance: { decrement: oldDebt } }
                            });
                        }

                        // Revert loyalty points
                        const oldTenant = await tx.tenant.findUnique({ where: { id: tenantId } });
                        if (oldTenant) {
                            const oldPointsEarned = Math.floor(oldTotal * oldTenant.loyaltyPointsPerDa);
                            await tx.customer.update({
                                where: { id: oldSalesOrder.customerId },
                                data: {
                                    loyaltyPoints: {
                                        decrement: oldPointsEarned
                                    }
                                }
                            });
                        }
                    }

                    // 3. Find and Revert Old Order
                    let oldOrder = null;
                    const oldTx = await tx.treasuryTransaction.findFirst({
                        where: { tenantId, description: { contains: receiptNumber }, source: "SALE" }
                    });

                    if (oldTx && oldTx.referenceId) {
                        oldOrder = await tx.order.findFirst({ where: { id: oldTx.referenceId, tenantId } });
                    } else {
                        const timeMin = new Date(oldSalesOrder.createdAt.getTime() - 60000);
                        const timeMax = new Date(oldSalesOrder.createdAt.getTime() + 60000);
                        oldOrder = await tx.order.findFirst({
                            where: {
                                tenantId,
                                total: oldSalesOrder.total,
                                OR: [
                                    { customerId: oldSalesOrder.customerId },
                                    { customerId: null }
                                ],
                                createdAt: { gte: timeMin, lte: timeMax }
                            }
                        });

                        // Fallback: if not found by exact date window (e.g. due to date mismatch or build differences),
                        // search for the most recent POS order for this customer with the same total
                        if (!oldOrder) {
                            oldOrder = await tx.order.findFirst({
                                where: {
                                    tenantId,
                                    total: oldSalesOrder.total,
                                    customerId: oldSalesOrder.customerId || undefined
                                },
                                orderBy: {
                                    createdAt: "desc"
                                }
                            });
                        }
                    }

                    if (oldOrder) {
                        const oldOrderPaidAmount = Number(oldOrder.paidAmount);

                        // Revert treasury
                        if (oldOrderPaidAmount > 0 && oldOrder.accountId) {
                            await tx.treasuryAccount.update({
                                where: { id: oldOrder.accountId },
                                data: { balance: { decrement: oldOrderPaidAmount } }
                            });
                            await tx.treasuryTransaction.deleteMany({
                                where: { referenceId: oldOrder.id, source: "SALE" }
                            });
                        }

                        // Delete old order
                        await tx.orderItem.deleteMany({ where: { orderId: oldOrder.id } });
                        await tx.order.delete({ where: { id: oldOrder.id } });
                    }
                }
            }
            // --- END EDIT MODE LOGIC ---

            const newOrder = await tx.order.create({
                data: {
                    tenantId,
                    storeId: storeIdToUse,
                    userId: selectedUserId || userId,
                    customerId: finalCustomerId,
                    accountId: accountId || undefined,
                    total,
                    subtotal,
                    tvaAmount,
                    stampTax,
                    paymentMethod,
                    paidAmount: paidAmount ?? total, // If not provided, assume paid in full
                    status,
                    idempotencyKey: idempotencyKey || null,
                    createdAt: oldSalesOrder ? oldSalesOrder.createdAt : undefined, // Keep original timestamp
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            priceHt: item.priceHt ?? item.price,
                            costAtSale: item.costAtSale ?? null,
                            tvaRate: item.tvaRate ?? 19,
                            serialNumber: item.serialNumber || null
                        }))
                    }
                }
            })

            // 1.5 Create or Update the SalesOrder (Bon de livraison)
            let salesOrderId = "";
            if (originalOrderId) {
                const updatedSalesOrder = await tx.salesOrder.update({
                    where: { id: originalOrderId },
                    data: {
                        customerId: finalCustomerId,
                        userId: selectedUserId || userId,
                        amountPaid: paidAmount ?? total,
                        total,
                        items: {
                            create: items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.price,
                                priceHt: item.priceHt ?? item.price,
                                tvaRate: item.tvaRate ?? 19,
                                costAtSale: item.costAtSale ?? null,
                                serialNumber: item.serialNumber || null
                            }))
                        }
                    }
                })
                salesOrderId = updatedSalesOrder.id;
            } else {
                const createdSalesOrder = await tx.salesOrder.create({
                    data: {
                        tenantId,
                        storeId: storeIdToUse,
                        customerId: finalCustomerId,
                        userId: selectedUserId || userId,
                        amountPaid: paidAmount ?? total,
                        type: "ORDER", // Bon de Livraison
                        status: "VALIDATED",
                        total,
                        receiptNumber,
                        idempotencyKey: idempotencyKey || null,
                        items: {
                            create: items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.price,
                                priceHt: item.priceHt ?? item.price,
                                tvaRate: item.tvaRate ?? 19,
                                costAtSale: item.costAtSale ?? null,
                                serialNumber: item.serialNumber || null
                            }))
                        }
                    }
                })
                salesOrderId = createdSalesOrder.id;
            }

            // 2. Decrement stock for each item — BATCHED & RACE-SAFE
            // Step 1: Fetch all product stock in a single query (instead of N individual queries)
            const productIds = items.map((i: any) => i.productId);
            const productsWithStock = await tx.product.findMany({
                where: { id: { in: productIds }, tenantId },
                include: { storeProducts: { where: { storeId: storeIdToUse } } }
            });
            const stockMap = new Map(productsWithStock.map(p => {
                const sp = p.storeProducts[0];
                return [
                    p.id, 
                    { 
                        stock: sp?.stock !== undefined && sp?.stock !== null ? sp.stock : 0, 
                        minStock: sp?.minStock !== undefined && sp?.minStock !== null ? sp.minStock : (p.minStock || 10), 
                        hasStoreProduct: p.storeProducts.length > 0,
                        isService: p.isService || false
                    }
                ];
            }));

            const physicalItems = items.filter((item: any) => !stockMap.get(item.productId)?.isService);

            // Step 2: Ensure StoreProduct records exist for physical items
            const missingStoreProducts = physicalItems.filter((item: any) => !stockMap.get(item.productId)?.hasStoreProduct);
            if (missingStoreProducts.length > 0) {
                for (const item of missingStoreProducts) {
                    const existing = stockMap.get(item.productId);
                    const initialStock = existing?.stock || 0;
                    const initialMinStock = existing?.minStock || 10;
                    await tx.storeProduct.upsert({
                        where: { storeId_productId: { storeId: storeIdToUse, productId: item.productId } },
                        update: {},
                        create: { storeId: storeIdToUse, productId: item.productId, stock: initialStock, minStock: initialMinStock }
                    });
                }
            }

            // Step 3: Atomic stock decrements for physical items
            await Promise.all(
                physicalItems.map(async (item: any) => {
                    await tx.storeProduct.update({
                        where: { storeId_productId: { storeId: storeIdToUse, productId: item.productId } },
                        data: { stock: { decrement: item.quantity } }
                    });
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    });
                })
            );

            // Step 4: Batch create stock movements for physical items
            if (physicalItems.length > 0) {
                const runningStockMap = new Map<string, number>();
                physicalItems.forEach((item: any) => {
                    if (!runningStockMap.has(item.productId)) {
                        const existing = stockMap.get(item.productId);
                        runningStockMap.set(item.productId, existing?.stock || 0);
                    }
                });

                await tx.stockMovement.createMany({
                    data: physicalItems.map((item: any) => {
                        const stockBefore = runningStockMap.get(item.productId) || 0;
                        const stockAfter = stockBefore - item.quantity;
                        runningStockMap.set(item.productId, stockAfter);
                        return {
                            productId: item.productId,
                            type: "SALE",
                            quantity: -item.quantity,
                            stockBefore,
                            stockAfter,
                            referenceId: salesOrderId,
                            reason: `Vente N° ${receiptNumber}`,
                            userId,
                            tenantId,
                            createdAt: oldSalesOrder ? oldSalesOrder.createdAt : undefined
                        };
                    })
                });
            }
            // Note: We deliberately allow negative stock for POS to prevent blocking checkouts
            // when physical inventory differs from system inventory.

            // 3. Update Customer Balance (Debt)
            let previousBalance = 0;
            let newBalance = 0;

            if (finalCustomerId) {
                const customer = await tx.customer.findFirst({ where: { id: finalCustomerId, tenantId } })
                previousBalance = Number(customer?.balance || 0)

                const actualPaid = paidAmount ?? total
                const debt = total - actualPaid // If paid 50 on total 100, debt is 50. If paid 100 on total 50, debt is -50.

                newBalance = previousBalance + debt

                if (debt !== 0) {
                    await tx.customer.update({
                        where: { id: finalCustomerId },
                        data: {
                            balance: {
                                increment: debt
                            }
                        }
                    })
                }

                // Loyalty Points: calculate using tenant settings
                const activeTenant = await tx.tenant.findUnique({ where: { id: tenantId } });
                const pointsEarned = Math.floor(total * (activeTenant?.loyaltyPointsPerDa || 1));
                const pointsDelta = pointsEarned - (loyaltyPointsUsed || 0);

                if (pointsDelta !== 0) {
                    await tx.customer.update({
                        where: { id: finalCustomerId },
                        data: {
                            loyaltyPoints: {
                                increment: pointsDelta
                            }
                        }
                    })
                }
            }

            // 4. Record Treasury Transaction if payment is collected
            const actualPaid = paidAmount ?? total
            if (actualPaid > 0 && accountId) {
                const account = await tx.treasuryAccount.findFirst({ where: { id: accountId, tenantId } })
                if (account) {
                    const updatedAccount = await tx.treasuryAccount.update({
                        where: { id: accountId },
                        data: { balance: { increment: actualPaid } }
                    })
                    await tx.treasuryTransaction.create({
                        data: {
                            accountId,
                            type: "CREDIT",
                            amount: actualPaid,
                            balanceBefore: Number(account.balance),
                            balanceAfter: Number(updatedAccount.balance),
                            source: "SALE",
                            referenceId: newOrder.id,
                            description: `Paiement Vente N° ${receiptNumber}`,
                            tenantId,
                            date: oldSalesOrder ? oldSalesOrder.createdAt : undefined,
                            createdAt: oldSalesOrder ? oldSalesOrder.createdAt : undefined
                        }
                    })
                }
            }

            return {
                order: newOrder,
                previousBalance,
                newBalance
            }
        })

        if (!process.env.AUDIT_TENANT_ID) {
            revalidatePath("/[locale]/(dashboard)/orders", "page")
            revalidatePath("/[locale]/(dashboard)/products", "page")
            revalidatePath("/[locale]/(dashboard)/treasury", "page")
            revalidatePath("/[locale]/(dashboard)/sales", "page")
            revalidatePath("/[locale]/(pos)/pos", "page")
        }

        await cacheMonitor.invalidateCache(`products:${tenantId}`)
        await cacheMonitor.invalidateCache(`pos-products:${tenantId}`)

        // Fire-and-forget audit log
        logAudit({
            action: "CREATE",
            entity: "ORDER",
            entityId: order.order.id,
            description: `Vente ${receiptNumber} — ${total} DA (${items.length} articles, ${paymentMethod})`,
            after: { receiptNumber, total, paymentMethod, items: items.length }
        }).catch(() => null)

        return {
            success: "Commande créée avec succès!",
            orderId: order.order.id,
            receiptNumber,
            previousBalance: order.previousBalance,
            newBalance: order.newBalance
        }
    } catch (error: any) {
        console.error("Error creating order:", error)

        // Subscription-specific errors
        if (error?.message?.includes("abonnement") || error?.message?.includes("bloqué") || error?.message?.includes("expiré")) {
            return { error: error.message }
        }
        // Prisma-specific errors for better diagnostics
        if (error?.code === "P2002") {
            return { error: "Conflit: Un numéro de reçu en doublon a été détecté. Veuillez réessayer." }
        }
        if (error?.code === "P2025") {
            return { error: "Produit ou client introuvable. Il a peut-être été supprimé." }
        }
        if (error?.message?.includes("Stock insuffisant")) {
            return { error: error.message }
        }
        if (error?.message?.includes("timeout") || error?.message?.includes("connect")) {
            return { error: "Erreur de connexion à la base de données. Veuillez réessayer." }
        }

        return { error: "Erreur lors de la création de la commande. Veuillez réessayer." }
    }
}

export const getProductCustomerSellHistory = async (productId: string, customerId: string) => {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const tenantId = session.user.tenantId

    try {
        // 1. Fetch POS orders for this customer and product
        const posOrders = await db.order.findMany({
            where: {
                tenantId,
                customerId,
                items: {
                    some: { productId }
                }
            },
            include: {
                items: {
                    where: { productId }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // 2. Fetch B2B sales orders for this customer and product
        const salesOrders = await db.salesOrder.findMany({
            where: {
                tenantId,
                customerId,
                status: { not: "CANCELLED" },
                items: {
                    some: { productId }
                }
            },
            include: {
                items: {
                    where: { productId }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // 3. Map POS orders to history items
        const posHistory = posOrders.flatMap(order => 
            order.items.map(item => ({
                id: order.id,
                date: order.createdAt,
                type: "POS",
                quantity: item.quantity,
                price: Number(item.price),
                receiptNumber: `POS-${order.id.slice(-6).toUpperCase()}`
            }))
        )

        // 4. Map B2B Sales Orders to history items
        const b2bHistory = salesOrders.flatMap(order => 
            order.items.map(item => ({
                id: order.id,
                date: order.createdAt,
                type: "BL",
                quantity: item.quantity,
                price: Number(item.unitPrice),
                receiptNumber: order.receiptNumber || `BL-${order.id.slice(-6).toUpperCase()}`
            }))
        )

        // 5. Combine and sort from last (most recent) to first (oldest)
        const combined = [...posHistory, ...b2bHistory].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )

        return { success: true, history: combined }
    } catch (error) {
        console.error("Error fetching product customer sell history:", error)
        return { error: "Failed to fetch sell history" }
    }
}
