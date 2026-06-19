import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const db = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const fixMode = args.includes('--fix');
    
    console.log(`\n=== SYNCLOUDPOS Stock Reconciliation Audit ===`);
    if (fixMode) {
        console.log(`⚠️  FIX MODE ENABLED: Incorrect stocks will be overwritten!`);
    } else {
        console.log(`ℹ️  DRY RUN: No database modifications will be made. Use --fix to apply corrections.`);
    }

    const tenantId = args.find(a => !a.startsWith('--'));
    
    if (!tenantId) {
        console.error("❌ Please provide a tenantId as an argument.");
        console.error("Usage: npx tsx scripts/reconcile-stock.ts <tenantId> [--fix]");
        process.exit(1);
    }

    console.log(`Analyzing tenant: ${tenantId}\n`);

    const store = await db.store.findFirst({ where: { tenantId } });
    if (!store) {
        console.error("❌ No store found for this tenant.");
        process.exit(1);
    }

    console.log(`Using main store: ${store.name} (${store.id})\n`);

    const products = await db.product.findMany({
        where: { tenantId },
        include: { storeProducts: { where: { storeId: store.id } } }
    });

    console.log(`Found ${products.length} products. Fetching movements...`);

    let discrepancies = 0;
    let storeDiscrepancies = 0;
    const report: string[] = ["Product ID,Product Name,Current Global Stock,Expected Global Stock,Diff,Current Store Stock,Expected Store Stock,Store Diff"];

    for (const product of products) {
        // Fetch all movements ordered by creation
        const movements = await db.stockMovement.findMany({
            where: { productId: product.id, tenantId },
            orderBy: { createdAt: 'asc' }
        });

        // The exact stock should be the sum of the very first stock assignment (MANUAL_ADJUSTMENT) 
        // + all subsequent movements (if they represent relative deltas).
        // However, Prisma stockMovements in this system track the absolute before/after per movement.
        // The most robust way to calculate expected stock is simply to sum the `quantity` of ALL movements.
        
        let expectedStock = 0;
        
        for (const mov of movements) {
            expectedStock += mov.quantity;
        }

        const currentGlobalStock = product.stock;
        const currentStoreStock = product.storeProducts.length > 0 ? product.storeProducts[0].stock : 0;
        
        const globalDiff = expectedStock - currentGlobalStock;
        const storeDiff = expectedStock - currentStoreStock;

        if (globalDiff !== 0 || storeDiff !== 0) {
            if (globalDiff !== 0) discrepancies++;
            if (storeDiff !== 0) storeDiscrepancies++;

            console.log(`\n❌ Discrepancy found: ${product.name} (ID: ${product.id})`);
            if (globalDiff !== 0) console.log(`   Global Stock: Current = ${currentGlobalStock}, Expected = ${expectedStock} (Diff: ${globalDiff})`);
            if (storeDiff !== 0) console.log(`   Store Stock:  Current = ${currentStoreStock}, Expected = ${expectedStock} (Diff: ${storeDiff})`);

            report.push(`"${product.id}","${product.name.replace(/"/g, '""')}",${currentGlobalStock},${expectedStock},${globalDiff},${currentStoreStock},${expectedStock},${storeDiff}`);

            if (fixMode) {
                // Apply the fix
                await db.$transaction(async (tx) => {
                    if (globalDiff !== 0) {
                        await tx.product.update({
                            where: { id: product.id },
                            data: { stock: expectedStock }
                        });
                    }

                    if (storeDiff !== 0) {
                        await tx.storeProduct.upsert({
                            where: { storeId_productId: { storeId: store.id, productId: product.id } },
                            update: { stock: expectedStock },
                            create: { storeId: store.id, productId: product.id, stock: expectedStock }
                        });
                    }

                    // Log the correction movement
                    await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            type: "MANUAL_ADJUSTMENT",
                            quantity: globalDiff !== 0 ? globalDiff : storeDiff,
                            stockBefore: currentGlobalStock,
                            stockAfter: expectedStock,
                            reason: "Correction automatique (Script de réconciliation)",
                            tenantId,
                            storeId: store.id,
                            userId: "SYSTEM"
                        }
                    });
                });
                console.log(`   ✅ Fixed in database.`);
            }
        }
    }

    console.log(`\n=== Audit Complete ===`);
    console.log(`Total Products Scanned: ${products.length}`);
    console.log(`Global Stock Discrepancies: ${discrepancies}`);
    console.log(`Store Stock Discrepancies: ${storeDiscrepancies}`);

    if (discrepancies > 0 || storeDiscrepancies > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = `./stock-audit-report-${tenantId}-${timestamp}.csv`;
        fs.writeFileSync(reportPath, report.join('\n'));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        if (!fixMode) {
            console.log(`\n💡 To automatically fix these discrepancies, run the script again with the --fix flag.`);
        }
    } else {
        console.log(`\n🎉 All stocks are perfectly synchronized!`);
    }

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
