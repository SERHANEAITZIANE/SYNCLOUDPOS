const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'QUALEV NINE', mode: 'insensitive' } }
  });

  if (!product) {
    console.log("Product not found");
    return;
  }

  console.log("PRODUCT:", product.id, product.name, "GLOBAL STOCK:", product.stock);

  const storeProducts = await prisma.storeProduct.findMany({
    where: { productId: product.id }
  });
  console.log("STORE PRODUCTS:", storeProducts.map(sp => ({ storeId: sp.storeId, stock: sp.stock })));

  // Movements
  const movements = await prisma.stockMovement.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: 'asc' }
  });

  console.log("\n--- STOCK MOVEMENTS ---");
  let calculatedStock = 0;
  for (const m of movements) {
    console.log(`[${m.createdAt.toISOString()}] TYPE: ${m.type} | QTY: ${m.quantity} | REASON: ${m.reason} | BEFORE: ${m.stockBefore} | AFTER: ${m.stockAfter}`);
    calculatedStock += m.quantity;
  }

  console.log("\nCALCULATED TOTAL FROM MOVEMENTS:", calculatedStock);

  // Invoices (Purchases)
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: { productId: product.id },
    include: { invoice: true }
  });
  let totalPurchased = 0;
  for (const ii of invoiceItems) {
    if (ii.invoice.status !== 'CANCELLED') {
      totalPurchased += ii.quantity;
    }
  }

  // Sales (POS)
  const orderItems = await prisma.orderItem.findMany({
    where: { productId: product.id },
    include: { order: true }
  });
  let totalPOSSales = 0;
  for (const oi of orderItems) {
    if (oi.order.status !== 'CANCELLED') {
      totalPOSSales += oi.quantity;
    }
  }

  // Sales Orders (B2B)
  const salesOrderItems = await prisma.salesOrderItem.findMany({
    where: { productId: product.id },
    include: { salesOrder: true }
  });
  let totalB2BSales = 0;
  for (const soi of salesOrderItems) {
    if (soi.salesOrder.status !== 'CANCELLED') {
      totalB2BSales += soi.quantity;
    }
  }

  // Returns
  const returns = await prisma.productReturn.findMany({
    where: { productId: product.id }
  });
  let totalCustomerReturns = 0;
  let totalSupplierReturns = 0;
  for (const r of returns) {
    if (r.type === 'CUSTOMER_RETURN' || r.type === 'CUSTOMER') totalCustomerReturns += r.quantity;
    if (r.type === 'SUPPLIER_RETURN' || r.type === 'SUPPLIER') totalSupplierReturns += r.quantity;
  }


  console.log("\n--- AGGREGATES ---");
  console.log("Purchases (Invoices):", totalPurchased);
  console.log("POS Sales:", totalPOSSales);
  console.log("B2B Sales:", totalB2BSales);
  console.log("Customer Returns:", totalCustomerReturns);
  console.log("Supplier Returns:", totalSupplierReturns);

  const formulaStock = totalPurchased - (totalPOSSales + totalB2BSales) + totalCustomerReturns - totalSupplierReturns;
  console.log("\nFORMULA STOCK (Purchases - Sales + ReturnsC - ReturnsS):", formulaStock);

}

main().catch(console.error).finally(() => prisma.$disconnect());
