const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'QUALEV NINE', mode: 'insensitive' } }
  });

  if (!product) return;

  const invoiceItems = await prisma.invoiceItem.findMany({
    where: { productId: product.id },
    include: { invoice: true }
  });
  console.log("INVOICE ITEMS (Purchases):");
  for (const ii of invoiceItems) {
    console.log(`- QTY: ${ii.quantity} | STATUS: ${ii.invoice.status} | INVOICE ID: ${ii.invoice.id} | DATE: ${ii.invoice.createdAt.toISOString()}`);
  }

  const orderItems = await prisma.orderItem.findMany({
    where: { productId: product.id },
    include: { order: true }
  });
  console.log("\nORDER ITEMS (POS Sales):");
  for (const oi of orderItems) {
    console.log(`- QTY: ${oi.quantity} | STATUS: ${oi.order.status} | ORDER ID: ${oi.order.id} | DATE: ${oi.order.createdAt.toISOString()}`);
  }

  const salesOrderItems = await prisma.salesOrderItem.findMany({
    where: { productId: product.id },
    include: { salesOrder: true }
  });
  console.log("\nSALES ORDER ITEMS (B2B Sales):");
  for (const soi of salesOrderItems) {
    console.log(`- QTY: ${soi.quantity} | STATUS: ${soi.salesOrder.status} | SALES ORDER ID: ${soi.salesOrder.id} | DATE: ${soi.salesOrder.createdAt.toISOString()}`);
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
