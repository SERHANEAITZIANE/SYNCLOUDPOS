const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'QUALEV NINE', mode: 'insensitive' } }
  });

  if (!product) return;

  const returns = await prisma.productReturn.findMany({
    where: { productId: product.id }
  });
  console.log("RETURNS:");
  for (const r of returns) {
    console.log(`- QTY: ${r.quantity} | TYPE: ${r.type} | ID: ${r.id} | DATE: ${r.createdAt.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
