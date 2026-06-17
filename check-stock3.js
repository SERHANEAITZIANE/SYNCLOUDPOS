const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'QUALEV NINE', mode: 'insensitive' } }
  });

  if (!product) return;

  const invoiceItems = await prisma.purchaseOrderItem.findMany({
    where: { productId: product.id },
    include: { purchaseOrder: true }
  });
  console.log("PURCHASE ORDER ITEMS (Purchases):");
  for (const ii of invoiceItems) {
    console.log(`- QTY: ${ii.quantity} | STATUS: ${ii.purchaseOrder.status} | ID: ${ii.purchaseOrder.id} | DATE: ${ii.purchaseOrder.createdAt.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
