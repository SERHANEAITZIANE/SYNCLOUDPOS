const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const write = process.argv.includes('--write');
  console.log(`=== RUNNING STOCK RECONCILIATION (${write ? 'WRITE MODE' : 'DRY RUN'}) ===`);

  // Find all products with their store products
  const products = await prisma.product.findMany({
    include: {
      storeProducts: true
    }
  });

  let mismatchCount = 0;
  let correctedCount = 0;

  for (const p of products) {
    const storeProductsSum = p.storeProducts.reduce((sum, sp) => sum + sp.stock, 0);
    const globalStock = p.stock;

    if (storeProductsSum !== globalStock) {
      mismatchCount++;
      console.log(`Mismatch on Product ID: ${p.id} ("${p.name}") | Tenant: ${p.tenantId}`);
      console.log(`  -> Global Stock: ${globalStock} | Store Products Sum: ${storeProductsSum}`);

      if (write) {
        try {
          await prisma.$transaction(async (tx) => {
            // Update global product stock
            await tx.product.update({
              where: { id: p.id },
              data: { stock: storeProductsSum }
            });

            // Create stock movement
            await tx.stockMovement.create({
              data: {
                productId: p.id,
                type: 'MANUAL_ADJUSTMENT',
                quantity: storeProductsSum - globalStock,
                stockBefore: globalStock,
                stockAfter: storeProductsSum,
                reason: 'Reconciliation de stock automatique (PM2 Cron)',
                tenantId: p.tenantId
              }
            });
          });
          console.log(`  -> SUCCESS: Corrected global stock to ${storeProductsSum}`);
          correctedCount++;
        } catch (err) {
          console.error(`  -> ERROR: Failed to update product stock:`, err.message || err);
        }
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Products Scanned: ${products.length}`);
  console.log(`Total Mismatches Found: ${mismatchCount}`);
  if (write) {
    console.log(`Total Corrected: ${correctedCount}`);
  } else {
    console.log(`Run with --write to apply corrections.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
