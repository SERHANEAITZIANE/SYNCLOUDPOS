import { PrismaClient } from "@prisma/client"
import { createOrder } from "./src/actions/orders"
import { deleteSalesOrder } from "./src/actions/sales-orders"
import { processClientReturn } from "./src/actions/returns"
import { createSpoilage } from "./src/actions/spoilage"

const prisma = new PrismaClient()

async function runAudit() {
    console.log("Starting ERP E2E Stock & Financial Audit...")

    // 1. Setup Test Environment Context
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) throw new Error("No tenant found")

    const store = await prisma.store.findFirst({ where: { tenantId: tenant.id } })
    if (!store) throw new Error("No store found")

    const user = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: "ADMIN" } })
    if (!user) throw new Error("No user found")

    const account = await prisma.treasuryAccount.findFirst({ where: { tenantId: tenant.id } })
    if (!account) throw new Error("No treasury account found")

    const product = await prisma.product.findFirst({ where: { tenantId: tenant.id } })
    if (!product) throw new Error("No product found")

    let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, name: "AUDIT_TEST_CUSTOMER" } })
    if (!customer) {
        customer = await prisma.customer.create({
            data: { tenantId: tenant.id, name: "AUDIT_TEST_CUSTOMER", balance: 0, clientType: "RETAIL" }
        })
    } else {
        await prisma.customer.update({ where: { id: customer.id }, data: { balance: 0 } })
    }

    // Set Environment variables for action bypasses
    process.env.AUDIT_TENANT_ID = tenant.id
    process.env.AUDIT_USER_ID = user.id
    process.env.AUDIT_STORE_ID = store.id

    // Force a clean state for this test product
    await prisma.product.update({ where: { id: product.id }, data: { stock: 100 } })
    const storeProduct = await prisma.storeProduct.findUnique({ where: { storeId_productId: { storeId: store.id, productId: product.id } } })
    if (storeProduct) {
        await prisma.storeProduct.update({ where: { storeId_productId: { storeId: store.id, productId: product.id } }, data: { stock: 100 } })
    } else {
        await prisma.storeProduct.create({ data: { storeId: store.id, productId: product.id, stock: 100 } })
    }

    // Log initial state
    let currentProduct = await prisma.product.findUnique({ where: { id: product.id } })
    let currentAccount = await prisma.treasuryAccount.findUnique({ where: { id: account.id } })
    let currentCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })

    const initialStock = currentProduct?.stock || 0
    const initialTreasury = Number(currentAccount?.balance || 0)
    
    console.log(`\n--- Initial State ---`)
    console.log(`Product Stock: ${initialStock}`)
    console.log(`Treasury Balance: ${initialTreasury}`)
    console.log(`Customer Balance: ${currentCustomer?.balance}`)

    // Scenario 1: Create POS Order
    console.log(`\n--- Scenario 1: Create Order (Qty: 2, Price: 1000, Paid: 1000) ---`)
    const orderData = {
        storeId: store.id,
        items: [{
            productId: product.id,
            productName: product.name,
            quantity: 2,
            price: Number(product.price),
            tvaRate: 0,
            originalPrice: Number(product.price),
            cost: 0,
            stock: initialStock,
            minStock: 0
        }],
        subtotal: Number(product.price) * 2,
        tvaAmount: 0,
        stampTax: 0,
        total: Number(product.price) * 2,
        paymentMethod: "CASH" as any,
        paidAmount: Number(product.price) * 2,
        customerId: customer.id,
        accountId: account.id,
        status: "COMPLETED" as any,
        discountAmount: 0,
        loyaltyPointsUsed: 0
    }

    const orderResult = await createOrder(orderData)
    if (orderResult.error) throw new Error(orderResult.error)

    const orderId = orderResult.orderId
    const salesOrder = await prisma.salesOrder.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" } })
    const unitPrice = Number(product.price)

    currentProduct = await prisma.product.findUnique({ where: { id: product.id } })
    currentAccount = await prisma.treasuryAccount.findUnique({ where: { id: account.id } })
    currentCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })

    const stockAfterOrder = currentProduct?.stock || 0
    const treasuryAfterOrder = Number(currentAccount?.balance || 0)
    const customerBalanceAfterOrder = Number(currentCustomer?.balance || 0)

    console.log(`Product Stock after order: ${stockAfterOrder} (Expected: ${initialStock - 2})`)
    console.log(`Treasury Balance after order: ${treasuryAfterOrder} (Expected: ${initialTreasury + (2 * unitPrice)})`)
    console.log(`Customer Debt after order: ${customerBalanceAfterOrder} (Expected: 0)`)

    if (stockAfterOrder !== (initialStock - 2)) throw new Error("Stock assertion failed in Scenario 1");
    if (Math.abs(treasuryAfterOrder - (initialTreasury + (2 * unitPrice))) > 0.01) throw new Error("Treasury assertion failed in Scenario 1");
    if (Math.abs(customerBalanceAfterOrder) > 0.01) throw new Error("Customer balance assertion failed in Scenario 1");


    // Scenario 2: Edit Order (Change quantity from 2 to 1)
    console.log(`\n--- Scenario 2: Edit Order (Reduce Qty to 1, Paid remains ${2 * unitPrice}) ---`)
    const editData = {
        ...orderData,
        items: [{
            ...orderData.items[0],
            quantity: 1,
        }],
        subtotal: unitPrice,
        total: unitPrice,
        originalOrderId: salesOrder!.id
    }
    const editResult = await createOrder(editData)
    if (editResult.error) throw new Error(editResult.error)

    const editedSalesOrder = await prisma.salesOrder.findFirst({ where: { id: salesOrder!.id } })

    currentProduct = await prisma.product.findUnique({ where: { id: product.id } })
    currentAccount = await prisma.treasuryAccount.findUnique({ where: { id: account.id } })
    currentCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })

    const stockAfterEdit = currentProduct?.stock || 0
    const treasuryAfterEdit = Number(currentAccount?.balance || 0)
    const customerBalanceAfterEdit = Number(currentCustomer?.balance || 0)

    console.log(`Product Stock after edit: ${stockAfterEdit} (Expected: ${initialStock - 1})`)
    console.log(`Treasury Balance after edit: ${treasuryAfterEdit} (Expected: ${initialTreasury + (2 * unitPrice)})`)
    console.log(`Customer Debt after edit: ${customerBalanceAfterEdit} (Expected: ${-unitPrice})`)

    if (stockAfterEdit !== (initialStock - 1)) throw new Error("Stock assertion failed in Scenario 2");
    if (Math.abs(treasuryAfterEdit - (initialTreasury + (2 * unitPrice))) > 0.01) throw new Error("Treasury assertion failed in Scenario 2");
    if (Math.abs(customerBalanceAfterEdit - (-unitPrice)) > 0.01) throw new Error("Customer balance assertion failed in Scenario 2");


    // Scenario 4: Return Order
    console.log(`\n--- Scenario 4: Return Product (Qty: 1, type: CASH) ---`)
    const returnResult = await processClientReturn({
        customerId: customer.id,
        productId: product.id,
        quantity: 1,
        storeId: store.id,
        returnType: "CASH",
        accountId: account.id,
        reason: "Defective item test"
    })
    if (returnResult.error) throw new Error(returnResult.error)

    currentProduct = await prisma.product.findUnique({ where: { id: product.id } })
    currentAccount = await prisma.treasuryAccount.findUnique({ where: { id: account.id } })
    currentCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })

    const stockAfterReturn = currentProduct?.stock || 0
    const treasuryAfterReturn = Number(currentAccount?.balance || 0)
    const customerBalanceAfterReturn = Number(currentCustomer?.balance || 0)

    console.log(`Product Stock after return: ${stockAfterReturn} (Expected: ${initialStock})`)
    console.log(`Treasury Balance after return: ${treasuryAfterReturn} (Expected: ${initialTreasury + unitPrice})`)
    console.log(`Customer Debt after return: ${customerBalanceAfterReturn} (Expected: ${-unitPrice})`)

    if (stockAfterReturn !== initialStock) throw new Error("Stock assertion failed in Scenario 4");
    if (Math.abs(treasuryAfterReturn - (initialTreasury + unitPrice)) > 0.01) throw new Error("Treasury assertion failed in Scenario 4");
    if (Math.abs(customerBalanceAfterReturn - (-unitPrice)) > 0.01) throw new Error("Customer balance assertion failed in Scenario 4");


    // Scenario 5: Spoilage
    console.log(`\n--- Scenario 5: Spoilage Product (Qty: 1) ---`)
    const spoilageResult = await createSpoilage({
        date: new Date(),
        reason: "Test Damage",
        quantity: 1,
        productId: product.id
    })
    if (spoilageResult.error) throw new Error(spoilageResult.error)

    currentProduct = await prisma.product.findUnique({ where: { id: product.id } })
    const stockAfterSpoilage = currentProduct?.stock || 0
    
    console.log(`Product Stock after spoilage: ${stockAfterSpoilage} (Expected: ${initialStock - 1})`)
    if (stockAfterSpoilage !== (initialStock - 1)) throw new Error("Stock assertion failed in Scenario 5");


    // Scenario 3: Delete Sales Order
    console.log(`\n--- Scenario 3: Delete the Edited Sales Order ---`)
    const deleteResult = await deleteSalesOrder(editedSalesOrder!.id)
    if (deleteResult.error) throw new Error(deleteResult.error)

    currentProduct = await prisma.product.findUnique({ where: { id: product.id } })
    currentAccount = await prisma.treasuryAccount.findUnique({ where: { id: account.id } })
    currentCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })

    const stockAfterDelete = currentProduct?.stock || 0
    const treasuryAfterDelete = Number(currentAccount?.balance || 0)
    const customerBalanceAfterDelete = Number(currentCustomer?.balance || 0)

    console.log(`Product Stock after delete: ${stockAfterDelete} (Expected: ${initialStock})`)
    console.log(`Treasury Balance after delete: ${treasuryAfterDelete} (Expected: ${initialTreasury - unitPrice})`)
    console.log(`Customer Debt after delete: ${customerBalanceAfterDelete} (Expected: 0)`)

    if (stockAfterDelete !== initialStock) throw new Error("Stock assertion failed in Scenario 3");
    if (Math.abs(treasuryAfterDelete - (initialTreasury - unitPrice)) > 0.01) throw new Error("Treasury assertion failed in Scenario 3");
    if (Math.abs(customerBalanceAfterDelete) > 0.01) throw new Error("Customer balance assertion failed in Scenario 3");

    console.log("\nAudit Complete! Validating final mathematical consistency.")
    
    // Cleanup temporary audit records
    console.log("Cleaning up temporary audit records...");
    await prisma.productReturn.deleteMany({ where: { customerId: customer.id } })
    await prisma.stockMovement.deleteMany({ where: { tenantId: tenant.id, reason: { contains: "Retour Client" } } })
    await prisma.spoilage.deleteMany({ where: { tenantId: tenant.id, reason: { contains: "Test Damage" } } })
    
    const customerOrders = await prisma.salesOrder.findMany({ where: { customerId: customer.id } })
    const customerOrderIds = customerOrders.map(o => o.id)
    
    const posOrders = await prisma.order.findMany({ where: { customerId: customer.id } })
    const posOrderIds = posOrders.map(o => o.id)
    
    await prisma.orderItem.deleteMany({ where: { orderId: { in: posOrderIds } } })
    await prisma.order.deleteMany({ where: { id: { in: posOrderIds } } })
    await prisma.treasuryTransaction.deleteMany({ where: { referenceId: { in: [...customerOrderIds, ...posOrderIds] } } })
    
    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: { in: customerOrderIds } } })
    await prisma.salesOrder.deleteMany({ where: { customerId: customer.id } })

    await prisma.customer.delete({ where: { id: customer.id } })
    console.log("Cleanup complete!")
}

runAudit().catch(console.error).finally(() => prisma.$disconnect())
