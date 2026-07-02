const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'modabberabdallah@gmail.com';
  console.log("Looking up user:", email);
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("User not found!");
    return;
  }
  console.log("User found:", user.id);
  
  // Search for store by name GT PHONE
  let targetTenantId = null;
  let targetStoreId = null;

  const store = await prisma.store.findFirst({
    where: { name: { contains: 'GT PHONE', mode: 'insensitive' } },
    include: { tenant: true }
  });
  
  if (store) {
    console.log("Found Store:", store.name, "under Tenant:", store.tenant.name);
    targetTenantId = store.tenantId;
    targetStoreId = store.id;
  } else {
    // search tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: { contains: 'GT PHONE', mode: 'insensitive' } },
      include: { stores: true }
    });
    if (tenant) {
      console.log("Found Tenant:", tenant.name, "with", tenant.stores.length, "stores");
      targetTenantId = tenant.id;
      if (tenant.stores.length > 0) {
        targetStoreId = tenant.stores[0].id;
      }
    }
  }

  if (!targetTenantId) {
    console.log("Could not find any store or tenant containing 'GT PHONE'");
    return;
  }

  console.log("Linking user to tenant:", targetTenantId, "and store:", targetStoreId);

  // Upsert TenantUser (ensure user has access to the tenant)
  await prisma.tenantUser.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: targetTenantId } },
    update: { role: 'ADMIN' },
    create: { userId: user.id, tenantId: targetTenantId, role: 'ADMIN' }
  });

  // Update user's active tenant and default store
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      tenantId: targetTenantId, 
      defaultStoreId: targetStoreId 
    }
  });

  console.log("Successfully affected user to GT PHONE.");
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
