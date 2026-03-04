// Fix script: Create a default store for every tenant that doesn't have one
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        include: { stores: true, users: true }
    });

    let fixed = 0;
    for (const tenant of tenants) {
        if (tenant.stores.length === 0) {
            console.log(`Creating store for tenant: ${tenant.name}`);
            const store = await prisma.store.create({
                data: {
                    name: 'Boutique Principale',
                    tenantId: tenant.id,
                }
            });
            // Assign store to all ADMIN users of this tenant that don't have one
            await prisma.user.updateMany({
                where: { tenantId: tenant.id, defaultStoreId: null },
                data: { defaultStoreId: store.id }
            });
            fixed++;
        } else {
            // Assign existing store to users that have no defaultStoreId
            const firstStore = tenant.stores[0];
            const usersWithoutStore = tenant.users.filter(u => !u.defaultStoreId);
            if (usersWithoutStore.length > 0) {
                await prisma.user.updateMany({
                    where: { tenantId: tenant.id, defaultStoreId: null },
                    data: { defaultStoreId: firstStore.id }
                });
                console.log(`Assigned store to ${usersWithoutStore.length} user(s) in tenant: ${tenant.name}`);
            }
        }
    }
    console.log(`Done. Created ${fixed} store(s) for tenants that had none.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
