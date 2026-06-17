const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    console.log("Starting StoreProduct migration...");

    // Get all tenants
    const tenants = await db.user.findMany({
        where: { tenantId: { not: "" } },
        select: { tenantId: true },
        distinct: ['tenantId']
    });

    let createdCount = 0;

    for (const { tenantId } of tenants) {
        if (!tenantId) continue;
        
        const store = await db.store.findFirst({ where: { tenantId } });
        if (!store) {
            console.log(`Tenant ${tenantId} has no store. Skipping...`);
            continue;
        }

        const storeId = store.id;

        const products = await db.product.findMany({
            where: { tenantId },
            include: { storeProducts: true }
        });

        for (const product of products) {
            const hasStoreProduct = product.storeProducts.some(sp => sp.storeId === storeId);
            
            if (!hasStoreProduct) {
                console.log(`Creating StoreProduct for product ${product.id} (tenant ${tenantId})`);
                await db.storeProduct.create({
                    data: {
                        storeId,
                        productId: product.id,
                        stock: product.stock || 0,
                        minStock: product.minStock || 10
                    }
                });
                createdCount++;
            }
        }
    }

    console.log(`Migration complete. Created ${createdCount} missing StoreProduct records.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
