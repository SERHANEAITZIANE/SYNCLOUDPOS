import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function runTests() {
    console.log("🚀 Starting ERP Calculations Test...")

    try {
        // 1. Get any tenant (first available) to use for isolation tests
        const tenant = await db.tenant.findFirst()
        if (!tenant) throw new Error("No tenant found. Please run this in a seeded environment.")

        const tenantId = tenant.id
        console.log(`✅ Using Tenant: ${tenant.name}`)

        // 2. Fetch a default store
        const store = await db.store.findFirst({ where: { tenantId } })
        if (!store) throw new Error("No store found for tenant.")
        
        // 3. Get user for order creation
        const user = await db.user.findFirst({ where: { tenantId } })
        if (!user) throw new Error("No user found for tenant.")

        // 3. Create a test product
        console.log("📦 Creating Test Product...")
        const category = await db.category.findFirst({ where: { tenantId } }) || 
                         await db.category.create({ data: { name: "Test Category", tenantId } })

        const product = await db.product.create({
            data: {
                name: "Test Calculation Product",
                price: 1000,          // Selling price
                cost: 500,            // Cost price
                tvaRate: 19,          // 19% TVA
                categoryId: category.id,
                tenantId,
                stock: 0
            }
        })

        // 4. Add initial stock via a stock movement
        console.log("📥 Adding Initial Stock...")
        await db.$transaction(async (tx) => {
            await tx.stockMovement.create({
                data: {
                    type: "MANUAL_ADJUSTMENT",
                    quantity: 100,
                    stockBefore: 0,
                    stockAfter: 100,
                    productId: product.id,
                    storeId: store.id,
                    tenantId,
                    userId: user.id
                }
            })
            
            await tx.product.update({
                where: { id: product.id },
                data: { stock: { increment: 100 } }
            })
        })

        // 5. Create a Sales Order
        console.log("🛒 Creating Sales Order...")
        const customer = await db.customer.findFirst({ where: { tenantId } }) || 
                         await db.customer.create({ data: { name: "Test Customer", clientType: "RETAIL", tenantId } })

        const quantitySold = 5
        const priceHt = 1000 
        const tvaRate = 19
        
        // Calculate Expected Values
        const expectedTotalHT = priceHt * quantitySold
        const expectedTVA = expectedTotalHT * (tvaRate / 100)
        const expectedTotalTTC = expectedTotalHT + expectedTVA + 0 // 0 stamp tax for test

        const order = await db.order.create({
            data: {
                status: "COMPLETED",
                subtotal: expectedTotalHT,
                tvaAmount: expectedTVA,
                total: expectedTotalTTC,
                paidAmount: expectedTotalTTC,
                paymentMethod: "CASH",
                customerId: customer.id,
                storeId: store.id,
                tenantId,
                userId: user.id,
                items: {
                    create: [
                        {
                            productId: product.id,
                            quantity: quantitySold,
                            price: priceHt * (1 + tvaRate/100), // TTC price for the item row
                            priceHt: priceHt,
                            tvaRate: tvaRate,
                        }
                    ]
                }
            },
            include: { items: true }
        })

        console.log(`✅ Order Created: Total HT=${expectedTotalHT}, TVA=${expectedTVA}, TTC=${expectedTotalTTC}`)

        // 6. Verify Calculations
        if (Number(order.total) !== expectedTotalTTC) {
            console.error(`❌ Calculation Mismatch! Expected ${expectedTotalTTC}, got ${order.total}`)
        } else {
            console.log("✅ Sales Calculations logic is flawless.")
        }

        // Clean up
        console.log("🧹 Cleaning up test data...")
        await db.orderItem.deleteMany({ where: { orderId: order.id } })
        await db.order.delete({ where: { id: order.id } })
        await db.stockMovement.deleteMany({ where: { productId: product.id } })
        await db.product.delete({ where: { id: product.id } })

        console.log("🎉 All Tests Passed Successfully!")
    } catch (e) {
        console.error("❌ Test Failed:", e)
    } finally {
        await db.$disconnect()
    }
}

runTests()
