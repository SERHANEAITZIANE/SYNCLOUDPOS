const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://syncloud:syncloud123@localhost:5432/syncloudpos?schema=public"
    }
  }
})

async function main() {
  const receiptNumbers = ['BL-2026/0001', 'BL-2026/0002']
  
  for (const nr of receiptNumbers) {
    console.log(`\n=================== Querying ${nr} ===================`)
    const order = await prisma.salesOrder.findFirst({
      where: { receiptNumber: nr },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!order) {
      console.log(`SalesOrder ${nr} not found in database.`)
      continue
    }
    
    console.log(`ID: ${order.id}`)
    console.log(`Tenant ID: ${order.tenantId}`)
    console.log(`Status: ${order.status}`)
    console.log(`Total: ${order.total}`)
    console.log(`Amount Paid: ${order.amountPaid}`)
    console.log(`Customer: ${order.customer.name} (ID: ${order.customerId}, current balance: ${order.customer.balance})`)
    console.log(`Items count: ${order.items.length}`)
    for (const item of order.items) {
      console.log(`  - Product: ${item.product.name} (ID: ${item.productId}), Qty: ${item.quantity}, Price: ${item.unitPrice}`)
    }
    
    // Check for treasury transactions referencing this order ID
    const txs = await prisma.treasuryTransaction.findMany({
      where: { referenceId: order.id }
    })
    console.log(`Referencing TreasuryTransactions: ${txs.length}`)
    for (const tx of txs) {
      console.log(`  - Tx ID: ${tx.id}, Type: ${tx.type}, Source: ${tx.source}, Amount: ${tx.amount}, Description: ${tx.description}`)
    }
    
    // Check for stock movements referencing this order ID
    const movements = await prisma.stockMovement.findMany({
      where: { referenceId: order.id }
    })
    console.log(`Referencing StockMovements: ${movements.length}`)
    for (const m of movements) {
      console.log(`  - Movement ID: ${m.id}, Type: ${m.type}, Qty: ${m.quantity}, Product ID: ${m.productId}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
