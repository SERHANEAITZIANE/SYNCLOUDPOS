"use server"

import * as z from "zod"
import { db } from "@/lib/db"
import { OrderSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { generateReceiptNumber } from "./sales-orders"

export const createOrder = async (values: z.infer<typeof OrderSchema>) => {
    const session = await auth()
    const userId = session?.user?.id
    const tenantId = session?.user?.tenantId

    if (!userId || !tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = OrderSchema.safeParse(values)

    if (!validatedFields.success) {
        console.error("Order Validation Error: ", validatedFields.error.format())
        return { error: "Invalid fields!" }
    }

    const { items, subtotal, tvaAmount, stampTax, total, paymentMethod, paidAmount, customerId, accountId, status, originalOrderId } = validatedFields.data

    try {
        let receiptNumber = await generateReceiptNumber("ORDER", tenantId);

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

            // --- EDIT MODE LOGIC ---
            if (originalOrderId) {
                const oldSalesOrder = await tx.salesOrder.findUnique({
                    where: { id: originalOrderId },
                    include: { items: true }
                });

                if (oldSalesOrder && oldSalesOrder.receiptNumber) {
                    receiptNumber = oldSalesOrder.receiptNumber;

                    // 1. Revert Old Stock (Parallelized)
                    await Promise.all(
                        oldSalesOrder.items.map(item =>
                            tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { increment: item.quantity } }
                            })
                        )
                    );

                    // 2. Clear Old SalesOrderItems (we will recreate them)
                    await tx.salesOrderItem.deleteMany({
                        where: { salesOrderId: originalOrderId }
                    });

                    // 3. Find and Revert Old Order
                    let oldOrder = null;
                    const oldTx = await tx.treasuryTransaction.findFirst({
                        where: { description: { contains: receiptNumber }, source: "SALE" }
                    });

                    if (oldTx && oldTx.referenceId) {
                        oldOrder = await tx.order.findUnique({ where: { id: oldTx.referenceId } });
                    } else {
                        const timeMin = new Date(oldSalesOrder.createdAt.getTime() - 60000);
                        const timeMax = new Date(oldSalesOrder.createdAt.getTime() + 60000);
                        oldOrder = await tx.order.findFirst({
                            where: { tenantId, customerId: oldSalesOrder.customerId, createdAt: { gte: timeMin, lte: timeMax } }
                        });
                    }

                    if (oldOrder) {
                        const oldPaidAmount = Number(oldOrder.paidAmount);
                        const oldTotal = Number(oldOrder.total);
                        const oldDebt = oldTotal - oldPaidAmount;

                        // Revert customer balance
                        if (oldDebt !== 0 && oldOrder.customerId) {
                            await tx.customer.update({
                                where: { id: oldOrder.customerId },
                                data: { balance: { decrement: oldDebt } }
                            });
                        }

                        // Revert treasury
                        if (oldPaidAmount > 0 && oldOrder.accountId) {
                            await tx.treasuryAccount.update({
                                where: { id: oldOrder.accountId },
                                data: { balance: { decrement: oldPaidAmount } }
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

            // 1. Create the order
            const newOrder = await tx.order.create({
                data: {
                    tenantId,
                    userId,
                    customerId: customerId || undefined,
                    accountId: accountId || undefined,
                    total,
                    subtotal,
                    tvaAmount,
                    stampTax,
                    paymentMethod,
                    paidAmount: paidAmount ?? total, // If not provided, assume paid in full
                    status,
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            priceHt: item.priceHt ?? item.price,
                            tvaRate: item.tvaRate ?? 19
                        }))
                    }
                }
            })

            // 1.5 Create or Update the SalesOrder (Bon de livraison)
            if (originalOrderId) {
                await tx.salesOrder.update({
                    where: { id: originalOrderId },
                    data: {
                        customerId: finalCustomerId,
                        total,
                        items: {
                            create: items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.price
                            }))
                        }
                    }
                })
            } else {
                await tx.salesOrder.create({
                    data: {
                        tenantId,
                        customerId: finalCustomerId,
                        type: "ORDER", // Bon de Livraison
                        status: "VALIDATED",
                        total,
                        receiptNumber,
                        items: {
                            create: items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.price
                            }))
                        }
                    }
                })
            }

            // 2. Decrement stock for each item (Parallelized)
            await Promise.all(
                items.map(item =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                decrement: item.quantity
                            }
                        }
                    })
                )
            );

            // 3. Update Customer Balance (Debt)
            let previousBalance = 0;
            let newBalance = 0;

            if (finalCustomerId) {
                const customer = await tx.customer.findUnique({ where: { id: finalCustomerId } })
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
            }

            // 4. Record Treasury Transaction if payment is collected
            const actualPaid = paidAmount ?? total
            if (actualPaid > 0 && accountId) {
                const account = await tx.treasuryAccount.findUnique({ where: { id: accountId, tenantId } })
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
                            tenantId
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

        revalidatePath("/[locale]/(dashboard)/orders", "page")
        revalidatePath("/[locale]/(dashboard)/products", "page") // Update stock in product list
        revalidatePath("/[locale]/(dashboard)/treasury", "page") // Update treasury balances
        revalidatePath("/[locale]/(dashboard)/sales", "page") // Update sales records

        return {
            success: "Commande créée avec succès!",
            orderId: order.order.id,
            receiptNumber,
            previousBalance: order.previousBalance,
            newBalance: order.newBalance
        }
    } catch (error) {
        console.error("Error creating order:", error)
        return { error: "Something went wrong!" }
    }
}
